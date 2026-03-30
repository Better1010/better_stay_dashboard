-- Income payments per bed and month/year.
-- Run in Supabase SQL Editor.

create table if not exists public.income_payments (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.beds(id) on delete cascade,
  assignment_id uuid null references public.bed_assignments(id) on delete set null,
  month int not null check (month >= 1 and month <= 12),
  year int not null check (year >= 2000),
  amount numeric(12,2) not null default 0,
  paid_at timestamptz not null default now(),
  paid_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bed_id, month, year)
);

create index if not exists income_payments_year_month_idx on public.income_payments(year, month);
create index if not exists income_payments_bed_id_idx on public.income_payments(bed_id);

alter table public.income_payments enable row level security;
drop policy if exists income_payments_authenticated on public.income_payments;
create policy income_payments_authenticated on public.income_payments for all using (auth.role() = 'authenticated');
