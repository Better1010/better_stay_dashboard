-- Registered users table and assignment linkage.
-- Run in Supabase SQL Editor.

create table if not exists public.registered_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile_number text null,
  nid_picture_front_url text not null,
  nid_picture_back_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registered_users enable row level security;
drop policy if exists registered_users_authenticated on public.registered_users;
create policy registered_users_authenticated on public.registered_users for all using (auth.role() = 'authenticated');

alter table public.bed_assignments add column if not exists registered_user_id uuid null references public.registered_users(id) on delete set null;
create index if not exists bed_assignments_registered_user_id_idx on public.bed_assignments(registered_user_id);
