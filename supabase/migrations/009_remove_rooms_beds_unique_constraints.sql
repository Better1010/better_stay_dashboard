-- Remove unique constraints so duplicate room numbers (per building) and duplicate bed numbers (per room) are allowed.
-- Run in Supabase SQL Editor.

alter table public.rooms drop constraint if exists rooms_hostel_id_room_number_key;
alter table public.beds drop constraint if exists beds_room_id_bed_number_key;
