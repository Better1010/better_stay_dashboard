-- Investments list for super admin.
-- Run in Supabase SQL Editor.

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  date date not null,
  amount numeric(12,2) not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investments_date_idx on public.investments(date desc);

alter table public.investments enable row level security;
drop policy if exists investments_authenticated on public.investments;
create policy investments_authenticated on public.investments for all using (auth.role() = 'authenticated');
