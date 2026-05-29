create table if not exists public.loan_strategy_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  title text not null,
  borrower_name text,
  property_address text,
  loan_number text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loan_strategy_sheets
add column if not exists user_id uuid default auth.uid();

create or replace function public.set_loan_strategy_sheets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_loan_strategy_sheets_updated_at on public.loan_strategy_sheets;

create trigger set_loan_strategy_sheets_updated_at
before update on public.loan_strategy_sheets
for each row
execute function public.set_loan_strategy_sheets_updated_at();

alter table public.loan_strategy_sheets enable row level security;

drop policy if exists "Allow standalone loan strategy sheet reads" on public.loan_strategy_sheets;
drop policy if exists "Allow standalone loan strategy sheet inserts" on public.loan_strategy_sheets;
drop policy if exists "Allow standalone loan strategy sheet updates" on public.loan_strategy_sheets;

create policy "Allow standalone loan strategy sheet reads"
on public.loan_strategy_sheets
for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow standalone loan strategy sheet inserts"
on public.loan_strategy_sheets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow standalone loan strategy sheet updates"
on public.loan_strategy_sheets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
