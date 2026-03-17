-- Client history: store unassigned client details. Assignee fields: mobile, NID pictures.
-- Run in Supabase SQL Editor.

-- bed_assignments: add mobile and NID picture URLs (price remains for backward compatibility, can be 0)
alter table public.bed_assignments add column if not exists mobile_number text null;
alter table public.bed_assignments add column if not exists nid_picture_front_url text null;
alter table public.bed_assignments add column if not exists nid_picture_back_url text null;

-- client_history: snapshot when a bed is unassigned
create table if not exists public.client_history (
  id uuid primary key default gen_random_uuid(),
  assignee_name text not null,
  mobile_number text null,
  nid_picture_front_url text null,
  nid_picture_back_url text null,
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  unit_id uuid null references public.units(id) on delete set null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  bed_id uuid not null references public.beds(id) on delete cascade,
  assigned_at timestamptz not null,
  unassigned_at timestamptz not null default now(),
  months_stayed int not null default 0,
  total_payment numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists client_history_unassigned_at_idx on public.client_history(unassigned_at desc);
