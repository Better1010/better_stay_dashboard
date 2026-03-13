-- Expense categories and expenses (per unit).
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  expense_name text not null,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  amount numeric(12,2) not null,
  expense_date date not null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_unit_id_idx on public.expenses(unit_id);
create index if not exists expenses_category_id_idx on public.expenses(category_id);
create index if not exists expenses_expense_date_idx on public.expenses(expense_date);
