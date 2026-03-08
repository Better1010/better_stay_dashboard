-- Run this only if you already have rooms/beds tables and need to add new columns and tables.
-- New projects: just run schema.sql.

-- Add units table if not exists (idempotent)
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  unit_number text not null,
  floor int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostel_id, unit_number)
);

-- Add unit_id to rooms
alter table public.rooms add column if not exists unit_id uuid null references public.units(id) on delete set null;

-- Add base_price to beds
alter table public.beds add column if not exists base_price numeric(12,2) not null default 0;

-- Bed assignments table
create table if not exists public.bed_assignments (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.beds(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  price numeric(12,2) not null,
  assigned_by uuid null references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bed_assignments_bed_id_idx on public.bed_assignments(bed_id);
create index if not exists bed_assignments_resident_id_idx on public.bed_assignments(resident_id);

-- RLS and triggers (if not already present)
alter table public.units enable row level security;
alter table public.bed_assignments enable row level security;
drop policy if exists units_authenticated on public.units;
create policy units_authenticated on public.units for all using (auth.role() = 'authenticated');
drop policy if exists bed_assignments_authenticated on public.bed_assignments;
create policy bed_assignments_authenticated on public.bed_assignments for all using (auth.role() = 'authenticated');

-- Optional: allow authenticated users to read/write rooms and hostels (beds: keep RLS disabled, no policy)
drop policy if exists rooms_authenticated on public.rooms;
create policy rooms_authenticated on public.rooms for all using (auth.role() = 'authenticated');
drop policy if exists hostels_authenticated on public.hostels;
create policy hostels_authenticated on public.hostels for all using (auth.role() = 'authenticated');
