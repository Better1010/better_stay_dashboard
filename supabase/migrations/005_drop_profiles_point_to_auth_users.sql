-- Run this in Supabase SQL Editor to drop profiles and point all FKs to auth.users(id).
-- Step 1: Drop trigger that creates profile on new auth user
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

-- Step 2: Drop every FK that references profiles
alter table public.hostels drop constraint if exists hostels_admin_id_fkey;
alter table public.beds drop constraint if exists beds_resident_id_fkey;
alter table public.bed_assignments drop constraint if exists bed_assignments_resident_id_fkey;
alter table public.bed_assignments drop constraint if exists bed_assignments_assigned_by_fkey;
alter table public.complaints drop constraint if exists complaints_resident_id_fkey;
alter table public.payments drop constraint if exists payments_resident_id_fkey;
alter table public.tasks drop constraint if exists tasks_assigned_to_fkey;
alter table public.tasks drop constraint if exists tasks_created_by_fkey;
alter table public.notices drop constraint if exists notices_created_by_fkey;

-- Step 3: Allow null on columns that were NOT NULL (so we can clear profile IDs)
alter table public.complaints alter column resident_id drop not null;
alter table public.payments alter column resident_id drop not null;
alter table public.tasks alter column assigned_to drop not null;
alter table public.tasks alter column created_by drop not null;
alter table public.notices alter column created_by drop not null;

-- Step 4: Clear columns that hold profile IDs (they would violate FK to auth.users)
update public.hostels set admin_id = null;
update public.beds set resident_id = null;
update public.bed_assignments set resident_id = null;
update public.bed_assignments set assigned_by = null;
update public.complaints set resident_id = null;
update public.payments set resident_id = null;
update public.tasks set assigned_to = null;
update public.tasks set created_by = null;
update public.notices set created_by = null;

-- Step 5: Re-add FKs pointing to auth.users(id)
alter table public.hostels
  add constraint hostels_admin_id_fkey
  foreign key (admin_id) references auth.users(id) on delete set null;

alter table public.beds
  add constraint beds_resident_id_fkey
  foreign key (resident_id) references auth.users(id) on delete set null;

alter table public.bed_assignments
  add constraint bed_assignments_resident_id_fkey
  foreign key (resident_id) references auth.users(id) on delete set null;

alter table public.bed_assignments
  add constraint bed_assignments_assigned_by_fkey
  foreign key (assigned_by) references auth.users(id) on delete set null;

alter table public.complaints
  add constraint complaints_resident_id_fkey
  foreign key (resident_id) references auth.users(id) on delete cascade;

alter table public.payments
  add constraint payments_resident_id_fkey
  foreign key (resident_id) references auth.users(id) on delete cascade;

alter table public.tasks
  add constraint tasks_assigned_to_fkey
  foreign key (assigned_to) references auth.users(id) on delete cascade;

alter table public.tasks
  add constraint tasks_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.notices
  add constraint notices_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

-- Step 6: Drop policies and triggers on profiles, then drop the table
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop trigger if exists profiles_set_updated_at on public.profiles;

drop table public.profiles;
