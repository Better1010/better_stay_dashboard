-- Assign bed by assignee name (no resident dropdown). Run if bed_assignments already exists.
alter table public.bed_assignments add column if not exists assignee_name text null;
alter table public.bed_assignments alter column resident_id drop not null;
