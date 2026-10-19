-- Migration 0006: Add interface_language to student profiles
-- Safely add interface_language column to public.profiles table if not present.
alter table public.profiles
  add column if not exists interface_language text default 'es';

comment on column public.profiles.interface_language is 'Preferred user interface language (es, en, fr, zh). Completely independent from learning target language.';

