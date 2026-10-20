-- Migration 0010: Inbox and Messaging System
-- Idempotent, safe migration adding inbox_messages table, indexes, and robust RLS policies.

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'Teacher',
  sender_role text not null default 'teacher' check (sender_role in ('teacher', 'student', 'system')),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Defensive backfills in case table pre-existed
alter table public.inbox_messages add column if not exists sender_id uuid references auth.users(id) on delete set null;
alter table public.inbox_messages add column if not exists sender_name text not null default 'Teacher';
alter table public.inbox_messages add column if not exists sender_role text not null default 'teacher';
alter table public.inbox_messages add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;
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

-- Enable RLS
alter table public.inbox_messages enable row level security;

-- 1. Students read their own messages (received or sent), teachers read all
drop policy if exists "students read own messages" on public.inbox_messages;
create policy "students read own messages" on public.inbox_messages
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    or sender_id = (select auth.uid())
    or exists (select 1 from public.teachers where id = (select auth.uid()))
  );

-- 2. Students update read status of received messages
drop policy if exists "students update own message status" on public.inbox_messages;
create policy "students update own message status" on public.inbox_messages
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- 3. Students can send messages where they are the sender
drop policy if exists "students can send messages" on public.inbox_messages;
create policy "students can send messages" on public.inbox_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
  );

-- 4. Teachers manage all messages
drop policy if exists "teachers manage messages" on public.inbox_messages;
create policy "teachers manage messages" on public.inbox_messages
  for all to authenticated
  using (exists (select 1 from public.teachers where id = (select auth.uid())))
  with check (exists (select 1 from public.teachers where id = (select auth.uid())));

-- Permissions
grant select, insert, update on public.inbox_messages to authenticated;
