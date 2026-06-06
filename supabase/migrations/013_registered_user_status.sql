-- Registered user active/inactive status.
-- Run in Supabase SQL Editor.

alter table public.registered_users
  add column if not exists status text not null default 'active';

alter table public.registered_users
  drop constraint if exists registered_users_status_check;

alter table public.registered_users
  add constraint registered_users_status_check check (status in ('active', 'inactive'));
