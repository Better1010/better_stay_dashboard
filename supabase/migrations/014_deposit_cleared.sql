-- Deposit clearance flag (returned / settled).
alter table public.deposits add column if not exists cleared boolean not null default false;

create index if not exists deposits_cleared_idx on public.deposits(cleared);
