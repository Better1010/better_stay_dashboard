## Supabase Setup

1. Create a `.env.local` in `dashboard` using values from `.env.example`.
2. **New project:** Run `schema.sql` in Supabase SQL Editor (creates all tables; no profile table—auth is email/password only).
3. Create users in **Supabase Dashboard → Authentication → Users → Add user** (email + password). Every logged-in user is treated as **super admin** and redirected to `/super-admin`.
4. Install dependencies in `dashboard`: `npm install`.

### Room flow (Building → Unit → Room → Bed → Assign)
- **Buildings** = `hostels`. **Units** = floor + unit number (e.g. A100). **Rooms** = per unit. **Beds** = per room with `base_price`. **Assign** = `bed_assignments` stores client-specific price per resident (e.g. User1 $100, User2 $150 for same bed).

### Notes
- The frontend talks to Supabase via `dashboard/lib/api.ts`.
- For production, tighten RLS and add policies as needed.
