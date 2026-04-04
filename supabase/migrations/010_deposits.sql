-- Deposits made by registered clients.
-- Run in Supabase SQL Editor.

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  registered_user_id uuid not null references public.registered_users(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deposits_registered_user_id_idx on public.deposits(registered_user_id);
create index if not exists deposits_created_at_idx on public.deposits(created_at desc);

alter table public.deposits enable row level security;
drop policy if exists deposits_authenticated on public.deposits;
create policy deposits_authenticated on public.deposits for all using (auth.role() = 'authenticated');
