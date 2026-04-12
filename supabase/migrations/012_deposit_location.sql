-- Optional location on deposits (building → unit → room → bed context at entry time).

alter table public.deposits add column if not exists hostel_id uuid null references public.hostels(id) on delete set null;
alter table public.deposits add column if not exists unit_id uuid null references public.units(id) on delete set null;
alter table public.deposits add column if not exists room_id uuid null references public.rooms(id) on delete set null;
alter table public.deposits add column if not exists bed_id uuid null references public.beds(id) on delete set null;

create index if not exists deposits_hostel_id_idx on public.deposits(hostel_id);
create index if not exists deposits_bed_id_idx on public.deposits(bed_id);
