-- Migration 0010: Inbox and Messaging System (Hardened Security Edition)
-- Fully idempotent, defense-in-depth messaging system with strict RLS,
-- column-level update protection, trigger-based immutability, recipient validation,
-- role anti-spoofing, and dedicated secure RPC.

-- ============================================================================
-- 1. TABLE DEFINITION & DEFENSIVE COLUMN BACKFILLS
-- ============================================================================

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'Teacher',
  sender_role text not null default 'teacher' check (sender_role in ('teacher', 'student', 'system')),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text not null default 'student' check (recipient_role in ('teacher', 'student', 'system')),
  subject text not null check (length(trim(subject)) > 0 and length(subject) <= 200),
  body text not null check (length(trim(body)) > 0),
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Defensive backfills in case table pre-existed with older shape
alter table public.inbox_messages add column if not exists sender_id uuid references auth.users(id) on delete set null;
alter table public.inbox_messages add column if not exists sender_name text not null default 'Teacher';
alter table public.inbox_messages add column if not exists sender_role text not null default 'teacher';
alter table public.inbox_messages add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;
alter table public.inbox_messages add column if not exists recipient_role text not null default 'student';
alter table public.inbox_messages add column if not exists subject text;
alter table public.inbox_messages add column if not exists body text;
alter table public.inbox_messages add column if not exists is_read boolean not null default false;
alter table public.inbox_messages add column if not exists read_at timestamptz;
alter table public.inbox_messages add column if not exists created_at timestamptz not null default now();
alter table public.inbox_messages add column if not exists updated_at timestamptz not null default now();

-- Performance indexes
create index if not exists inbox_recipient_unread_idx on public.inbox_messages(recipient_id, is_read);
create index if not exists inbox_recipient_created_idx on public.inbox_messages(recipient_id, created_at desc);
create index if not exists inbox_sender_idx on public.inbox_messages(sender_id);
create index if not exists inbox_conversation_idx on public.inbox_messages(recipient_id, sender_id);

-- Enable RLS
alter table public.inbox_messages enable row level security;
alter table public.inbox_messages force row level security;

-- ============================================================================
-- 2. RLS POLICIES (Strict Privilege Separation)
-- ============================================================================

-- Policy 1: Students read ONLY their own messages (as recipient or sender)
drop policy if exists "students read own messages" on public.inbox_messages;
create policy "students read own messages" on public.inbox_messages
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    or sender_id = (select auth.uid())
  );

-- Policy 2: Students insert ONLY messages where:
--   - sender_id strictly matches auth.uid()
--   - sender_role is strictly 'student' (cannot forge 'teacher' or 'system')
--   - user is not a teacher (teachers use teacher policy)
--   - recipient is authorized: either an active teacher or the student's own conversation thread
drop policy if exists "students can send messages" on public.inbox_messages;
create policy "students can send messages" on public.inbox_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'student'
    and not exists (select 1 from public.teachers where id = (select auth.uid()))
    and (
      recipient_id = (select auth.uid())
      or exists (select 1 from public.teachers where id = recipient_id)
    )
  );

-- Policy 3: Students update ONLY the read status of messages THEY received
drop policy if exists "students update own message status" on public.inbox_messages;
create policy "students update own message status" on public.inbox_messages
  for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and not exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    recipient_id = (select auth.uid())
    and not exists (select 1 from public.teachers where id = (select auth.uid()))
  );

-- Policy 4: Teachers manage all messages (select, insert, update, delete)
drop policy if exists "teachers manage messages" on public.inbox_messages;
create policy "teachers manage messages" on public.inbox_messages
  for all to authenticated
  using (
    exists (select 1 from public.teachers where id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.teachers where id = (select auth.uid()))
  );

-- ============================================================================
-- 3. TRIGGERS: Anti-Spoofing & Content Immutability Enforcement
-- ============================================================================

-- Trigger 1: Validate INSERT constraints and prevent role impersonation
create or replace function public.trg_validate_inbox_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If sender is not a verified teacher:
  if not exists (select 1 from public.teachers where id = (select auth.uid())) then
    -- Enforce sender_id matches authenticated user
    if new.sender_id is distinct from auth.uid() then
      raise exception 'Security violation: sender_id must match authenticated user.';
    end if;

    -- Enforce sender_role can only be 'student'
    if new.sender_role is distinct from 'student' then
      raise exception 'Security violation: Students cannot impersonate teacher or system roles.';
    end if;

    -- Enforce authorized recipient (own conversation thread or active teacher)
    if new.recipient_id is distinct from auth.uid()
       and not exists (select 1 from public.teachers where id = new.recipient_id) then
      raise exception 'Security violation: Unauthorized recipient for student message.';
    end if;
  end if;

  new.created_at = coalesce(new.created_at, now());
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_validate_inbox_message_insert on public.inbox_messages;
create trigger trg_validate_inbox_message_insert
  before insert on public.inbox_messages
  for each row
  execute function public.trg_validate_inbox_message_insert();

-- Trigger 2: Enforce content immutability on UPDATE
-- Students can ONLY update is_read and read_at.
-- Any attempt to alter sender, recipient, subject, body, or role is strictly rejected.
create or replace function public.trg_enforce_inbox_message_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- For non-teacher users, strictly prevent tampering with message content or participants
  if not exists (select 1 from public.teachers where id = (select auth.uid())) then
    if new.id is distinct from old.id
       or new.sender_id is distinct from old.sender_id
       or new.sender_name is distinct from old.sender_name
       or new.sender_role is distinct from old.sender_role
       or new.recipient_id is distinct from old.recipient_id
       or new.recipient_role is distinct from old.recipient_role
       or new.subject is distinct from old.subject
       or new.body is distinct from old.body
       or new.created_at is distinct from old.created_at then
      raise exception 'Security violation: Students cannot modify message content, subject, participants, or metadata.';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_inbox_message_immutability on public.inbox_messages;
create trigger trg_enforce_inbox_message_immutability
  before update on public.inbox_messages
  for each row
  execute function public.trg_enforce_inbox_message_immutability();

-- ============================================================================
-- 4. SECURE RPC: Mark Message as Read
-- ============================================================================
create or replace function public.mark_inbox_message_as_read(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  update public.inbox_messages
  set is_read = true,
      read_at = coalesce(read_at, now()),
      updated_at = now()
  where id = p_message_id
    and (
      recipient_id = v_user_id
      or exists (select 1 from public.teachers where id = v_user_id)
    );

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- ============================================================================
-- 5. GRANULAR SQL PERMISSIONS (Least Privilege)
-- ============================================================================

-- Revoke all permissions from anon
revoke all on public.inbox_messages from anon;
revoke all on function public.mark_inbox_message_as_read(uuid) from anon;

-- Grant authenticated permissions
grant select on public.inbox_messages to authenticated;
grant insert (sender_id, sender_name, sender_role, recipient_id, recipient_role, subject, body, is_read, read_at) on public.inbox_messages to authenticated;

-- Column-level update privilege: ONLY read status and timestamp can be updated by authenticated users
revoke update on public.inbox_messages from authenticated;
grant update (is_read, read_at, updated_at) on public.inbox_messages to authenticated;

-- Delete privilege (further controlled by RLS so only teachers can delete)
grant delete on public.inbox_messages to authenticated;

-- Grant RPC execution
revoke all on function public.mark_inbox_message_as_read(uuid) from public;
grant execute on function public.mark_inbox_message_as_read(uuid) to authenticated;

-- Force PostgREST schema cache reload immediately
notify pgrst, 'reload schema';
