-- BetterStay Supabase schema
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('super_admin', 'hostel_admin', 'resident', 'staff');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type user_status as enum ('pending', 'active', 'blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'staff_type') then
    create type staff_type as enum ('maintenance', 'security', 'cleaner');
  end if;
  if not exists (select 1 from pg_type where typname = 'complaint_category') then
    create type complaint_category as enum ('general', 'maintenance', 'security', 'cleaning', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'complaint_status') then
    create type complaint_status as enum ('pending', 'in_progress', 'resolved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash', 'bank_transfer', 'mobile_banking', 'card');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type task_priority as enum ('low', 'medium', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_type') then
    create type task_type as enum ('maintenance', 'cleaning', 'security', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null unique,
  role user_role not null,
  status user_status not null default 'pending',
  hostel_id uuid null,
  identification_document text null,
  room_id uuid null,
  bed_id uuid null,
  staff_type staff_type null,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Buildings (labeled as "Hostels" in code for backward compatibility)
create table if not exists public.hostels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  phone text not null,
  email text not null,
  admin_id uuid null references public.profiles(id) on delete set null,
  total_rooms int not null default 0,
  total_beds int not null default 0,
  occupied_beds int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Units: belong to a building (hostel). unit_number e.g. A100, B100; floor e.g. 1 (100 = 1st floor)
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  unit_number text not null,
  floor int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostel_id, unit_number)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  unit_id uuid null references public.units(id) on delete cascade,
  room_number text not null,
  floor int not null,
  total_beds int not null default 1,
  occupied_beds int not null default 0,
  rent numeric(12,2) not null default 0,
  amenities text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostel_id, room_number)
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  bed_number text not null,
  base_price numeric(12,2) not null default 0,
  resident_id uuid null references public.profiles(id) on delete set null,
  is_occupied boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, bed_number)
);

-- Client-specific price per bed assignment; assignee by name (no resident dropdown)
create table if not exists public.bed_assignments (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references public.beds(id) on delete cascade,
  resident_id uuid null references public.profiles(id) on delete set null,
  assignee_name text null,
  price numeric(12,2) not null,
  assigned_by uuid null references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bed_assignments_bed_id_idx on public.bed_assignments(bed_id);
create index if not exists bed_assignments_resident_id_idx on public.bed_assignments(resident_id);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles(id) on delete cascade,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  title text not null,
  description text not null,
  category complaint_category not null default 'general',
  status complaint_status not null default 'pending',
  response text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles(id) on delete cascade,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  amount numeric(12,2) not null,
  method payment_method not null,
  transaction_id text null,
  status payment_status not null default 'pending',
  month text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  priority task_priority not null default 'medium',
  type task_type not null default 'maintenance',
  status task_status not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  hostel_id uuid null references public.hostels(id) on delete set null,
  is_important boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_hostel_fk foreign key (hostel_id) references public.hostels(id) on delete set null;

alter table public.profiles
  add constraint profiles_room_fk foreign key (room_id) references public.rooms(id) on delete set null;

alter table public.profiles
  add constraint profiles_bed_fk foreign key (bed_id) references public.beds(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists hostels_set_updated_at on public.hostels;
create trigger hostels_set_updated_at before update on public.hostels for each row execute function public.set_updated_at();

drop trigger if exists units_set_updated_at on public.units;
create trigger units_set_updated_at before update on public.units for each row execute function public.set_updated_at();

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at before update on public.rooms for each row execute function public.set_updated_at();

drop trigger if exists beds_set_updated_at on public.beds;
create trigger beds_set_updated_at before update on public.beds for each row execute function public.set_updated_at();

drop trigger if exists bed_assignments_set_updated_at on public.bed_assignments;
create trigger bed_assignments_set_updated_at before update on public.bed_assignments for each row execute function public.set_updated_at();

drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at before update on public.complaints for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- RLS baseline (tighten for production)
alter table public.profiles enable row level security;
alter table public.hostels enable row level security;
alter table public.units enable row level security;
alter table public.rooms enable row level security;
-- Beds: RLS left disabled so no policies needed (enable in Supabase if you want to add policies later)
alter table public.bed_assignments enable row level security;
alter table public.complaints enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
alter table public.notices enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = auth_user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = auth_user_id);

-- Allow authenticated app users to read/write (API enforces role and scope)
drop policy if exists hostels_authenticated on public.hostels;
create policy hostels_authenticated on public.hostels for all using (auth.role() = 'authenticated');
drop policy if exists rooms_authenticated on public.rooms;
create policy rooms_authenticated on public.rooms for all using (auth.role() = 'authenticated');
-- Beds: no policy (keep RLS disabled on beds table in Supabase if you want no policies)
drop policy if exists units_authenticated on public.units;
create policy units_authenticated on public.units for all using (auth.role() = 'authenticated');
drop policy if exists bed_assignments_authenticated on public.bed_assignments;
create policy bed_assignments_authenticated on public.bed_assignments for all using (auth.role() = 'authenticated');

-- Auto-create profile when a new auth user is created (e.g. after signup or email confirmation).
-- Uses raw_user_meta_data from signUp options: { data: { name, phone } }.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    auth_user_id,
    name,
    email,
    phone,
    role,
    status
  ) values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'phone'), ''), ''),
    'resident',
    'pending'
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
