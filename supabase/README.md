## Supabase Setup

1. Create a `.env.local` in `dashboard` using values from `.env.example`.
2. **New project:** Run `schema.sql` in Supabase SQL Editor (creates all tables including `units`, `bed_assignments`, and profile trigger). **Existing project:** Run `migrations/001_units_and_bed_assignments.sql` to add units, `rooms.unit_id`, `beds.base_price`, and `bed_assignments`. If you use assignee name in bed assignments (no resident dropdown), also run `migrations/003_bed_assignments_assignee_name.sql` to add the `assignee_name` column.
3. If you already have auth users with no profile (e.g. signed up before the trigger existed), run `backfill-profile.sql` once—edit the UUID, name, email, phone, then run it.
4. New signups get a profile automatically. Set `status` to `active` in Table Editor for residents who may log in.
5. Install dependencies in `dashboard`: `npm install`.

### If "profile" table is empty after sign up
- The trigger in `schema.sql` creates a profile when a user is created in Auth. Re-run the trigger part of `schema.sql` if you added it later.
- For an existing auth user with no profile: run `backfill-profile.sql` with that user’s `id` (from Auth → Users), name, email, phone; use `status: 'active'` so they can log in.

### Room flow (Building → Unit → Room → Bed → Assign)
- **Buildings** = `hostels`. **Units** = floor + unit number (e.g. A100). **Rooms** = per unit. **Beds** = per room with `base_price`. **Assign** = `bed_assignments` stores client-specific price per resident (e.g. User1 $100, User2 $150 for same bed).

### Notes
- The frontend talks to Supabase via `dashboard/lib/api.ts`.
- For production, tighten RLS and add policies per role and `hostel_id`.
