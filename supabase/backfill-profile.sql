-- One-time backfill: create a profile for an auth user that has no profile row.
-- Run this in Supabase SQL Editor.
-- Replace the values below with your user's data from: Auth → Users (copy UUID, email).

insert into public.profiles (
  auth_user_id,
  name,
  email,
  phone,
  role,
  status
) values (
  'ac714eec-1900-4dc4-b2fc-2826b57d9e37'::uuid,
  'Ema',
  'efter325@gmail.com',
  '01768965430',
  'resident',
  'active'
)
on conflict (auth_user_id) do update set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  status = excluded.status,
  updated_at = now();
