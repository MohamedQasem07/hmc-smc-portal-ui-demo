-- =====================================================================
-- 006_portal_finance_treasury_tables.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Cash / Visa / Excess / Treasury / Expenses / Handovers.
--   The treasury movements ledger is the source of truth; balances are
--   derived via secure views/aggregations (008), never stored as editable
--   running totals.
--
-- AFFECTED OBJECTS
--   tables (new):
--     portal_case_charges
--     portal_collections
--     portal_treasury_accounts        (+ seed accounts per location)
--     portal_treasury_movements       (immutable ledger; reversal pattern)
--     portal_expenses
--     portal_handovers
--     portal_cash_handover_lines
--     portal_visa_handover_transactions
--   RLS: ENABLED on all at creation (deny-all until 009).
--
-- KEY RULES (enforced fully in 008 functions; constraints here are guards)
--   * Visa/Card collections settle in EGP only (actual_currency = 'EGP').
--   * Cash collections route to physical_cash; Visa to visa_bank.
--   * Expenses: physical_cash only, same-currency, cannot exceed balance.
--   * No hard delete of movements — use adjustment_reversal.
--
-- ROLLBACK (reverse order)
--   drop table if exists public.portal_visa_handover_transactions cascade;
--   drop table if exists public.portal_cash_handover_lines cascade;
--   drop table if exists public.portal_handovers cascade;
--   drop table if exists public.portal_expenses cascade;
--   drop table if exists public.portal_treasury_movements cascade;
--   drop table if exists public.portal_treasury_accounts cascade;
--   drop table if exists public.portal_collections cascade;
--   drop table if exists public.portal_case_charges cascade;
--
-- VERIFICATION
--   select location_id, channel, count(*) from public.portal_treasury_accounts group by 1,2;
-- =====================================================================

-- ---------------------------------------------------------------------
-- portal_case_charges — operational amount expected (cash case / excess).
-- NOT the final insurance invoice. For insurance cases this holds excess only.
-- ---------------------------------------------------------------------
create table if not exists public.portal_case_charges (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.portal_cases(id) on delete cascade,
  charge_type portal_charge_type not null,
  amount      numeric(14,2) not null check (amount >= 0),
  currency    portal_currency not null,
  status      portal_charge_status not null default 'open',
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.portal_case_charges enable row level security;
drop trigger if exists trg_portal_charges_updated on public.portal_case_charges;
create trigger trg_portal_charges_updated
  before update on public.portal_case_charges
  for each row execute function public.portal_set_updated_at();
create index if not exists ix_portal_charges_case on public.portal_case_charges (case_id);

-- ---------------------------------------------------------------------
-- portal_collections — every actual collection line
-- ---------------------------------------------------------------------
create table if not exists public.portal_collections (
  id                     uuid primary key default gen_random_uuid(),
  case_id                uuid not null references public.portal_cases(id) on delete cascade,
  charge_id              uuid references public.portal_case_charges(id),
  collection_purpose     portal_collection_purpose not null,
  payment_method         portal_payment_method not null,
  invoice_currency       portal_currency not null,
  foreign_amount_covered numeric(14,2) not null check (foreign_amount_covered >= 0),
  actual_currency        portal_currency not null,
  fx_rate                numeric(14,6),
  actual_collected_amount numeric(14,2) not null check (actual_collected_amount >= 0),
  treasury_channel       portal_treasury_channel not null,
  collection_location_id uuid not null references public.portal_locations(id),
  collected_by           uuid not null references auth.users(id),
  collected_at           timestamptz not null default now(),
  status                 portal_collection_status not null default 'recorded',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Visa/Card must settle in EGP via visa_bank channel.
  constraint chk_portal_collection_visa_egp
    check (payment_method <> 'visa_card'
           or (actual_currency = 'EGP' and treasury_channel = 'visa_bank')),
  -- Cash must route to physical_cash.
  constraint chk_portal_collection_cash_channel
    check (payment_method <> 'cash' or treasury_channel = 'physical_cash')
);
alter table public.portal_collections enable row level security;
drop trigger if exists trg_portal_collections_updated on public.portal_collections;
create trigger trg_portal_collections_updated
  before update on public.portal_collections
  for each row execute function public.portal_set_updated_at();
create index if not exists ix_portal_collections_loc_date on public.portal_collections (collection_location_id, collected_at);
create index if not exists ix_portal_collections_channel on public.portal_collections (treasury_channel, status);
create index if not exists ix_portal_collections_case on public.portal_collections (case_id);

-- ---------------------------------------------------------------------
-- portal_treasury_accounts — logical balance accounts (location×currency×channel)
-- ---------------------------------------------------------------------
create table if not exists public.portal_treasury_accounts (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.portal_locations(id) on delete cascade,
  currency    portal_currency not null,
  channel     portal_treasury_channel not null,
  active      boolean not null default true,
  unique (location_id, currency, channel)
);
alter table public.portal_treasury_accounts enable row level security;

-- Seed: physical_cash in all 4 currencies + visa_bank EGP-only, per location.
insert into public.portal_treasury_accounts (location_id, currency, channel)
select l.id, c.cur::portal_currency, 'physical_cash'::portal_treasury_channel
from public.portal_locations l
cross join (values ('EGP'), ('EUR'), ('USD'), ('GBP')) as c(cur)
on conflict (location_id, currency, channel) do nothing;

insert into public.portal_treasury_accounts (location_id, currency, channel)
select l.id, 'EGP'::portal_currency, 'visa_bank'::portal_treasury_channel
from public.portal_locations l
on conflict (location_id, currency, channel) do nothing;

-- ---------------------------------------------------------------------
-- portal_treasury_movements — immutable ledger (truth)
-- ---------------------------------------------------------------------
create table if not exists public.portal_treasury_movements (
  id                  uuid primary key default gen_random_uuid(),
  treasury_account_id uuid not null references public.portal_treasury_accounts(id),
  movement_type       portal_movement_type not null,
  direction           portal_movement_direction not null,
  amount              numeric(14,2) not null check (amount >= 0),
  currency            portal_currency not null,
  case_id             uuid references public.portal_cases(id),
  collection_id       uuid references public.portal_collections(id),
  expense_id          uuid,
  handover_id         uuid,
  description         text,
  created_by          uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  reversed_movement_id uuid references public.portal_treasury_movements(id)
);
alter table public.portal_treasury_movements enable row level security;
create index if not exists ix_portal_movements_account on public.portal_treasury_movements (treasury_account_id, created_at);
create index if not exists ix_portal_movements_case on public.portal_treasury_movements (case_id);

-- ---------------------------------------------------------------------
-- portal_expenses — external clinic expense entry (physical cash only)
-- ---------------------------------------------------------------------
create table if not exists public.portal_expenses (
  id               uuid primary key default gen_random_uuid(),
  location_id      uuid not null references public.portal_locations(id),
  expense_date     timestamptz not null default now(),
  currency         portal_currency not null,
  amount           numeric(14,2) not null check (amount > 0),
  category         text not null,
  description      text,
  paid_from_channel portal_treasury_channel not null default 'physical_cash',
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now(),
  status           portal_expense_status not null default 'recorded',
  -- Visa/Bank can never fund an expense.
  constraint chk_portal_expense_cash_only check (paid_from_channel = 'physical_cash')
);
alter table public.portal_expenses enable row level security;
create index if not exists ix_portal_expenses_loc_date on public.portal_expenses (location_id, expense_date);

-- expense_id FK on movements (added now that table exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_portal_movement_expense'
  ) then
    alter table public.portal_treasury_movements
      add constraint fk_portal_movement_expense
      foreign key (expense_id) references public.portal_expenses(id);
  end if;
end$$;

-- ---------------------------------------------------------------------
-- portal_handovers — one handover batch/period per location
-- ---------------------------------------------------------------------
create table if not exists public.portal_handovers (
  id                  uuid primary key default gen_random_uuid(),
  location_id         uuid not null references public.portal_locations(id),
  handover_type       portal_handover_type not null,
  period_from         date not null,
  period_to           date not null,
  status              portal_handover_status not null default 'draft',
  handed_over_by      uuid references auth.users(id),
  received_by_name    text,
  received_by_user_id uuid references auth.users(id),
  submitted_at        timestamptz,
  confirmed_at        timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.portal_handovers enable row level security;
drop trigger if exists trg_portal_handovers_updated on public.portal_handovers;
create trigger trg_portal_handovers_updated
  before update on public.portal_handovers
  for each row execute function public.portal_set_updated_at();
create index if not exists ix_portal_handovers_loc_period on public.portal_handovers (location_id, period_from, period_to, status);

-- handover_id FK on movements
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_portal_movement_handover') then
    alter table public.portal_treasury_movements
      add constraint fk_portal_movement_handover
      foreign key (handover_id) references public.portal_handovers(id);
  end if;
end$$;

-- ---------------------------------------------------------------------
-- portal_cash_handover_lines — physical cash by currency
-- ---------------------------------------------------------------------
create table if not exists public.portal_cash_handover_lines (
  id                     uuid primary key default gen_random_uuid(),
  handover_id            uuid not null references public.portal_handovers(id) on delete cascade,
  currency               portal_currency not null,
  book_amount            numeric(14,2) not null,
  actual_delivered_amount numeric(14,2),
  difference             numeric(14,2),
  result                 portal_handover_result,
  unique (handover_id, currency)
);
alter table public.portal_cash_handover_lines enable row level security;

-- ---------------------------------------------------------------------
-- portal_visa_handover_transactions — Visa/Bank confirmation per transaction
-- (never merged into physical cash handover lines)
-- ---------------------------------------------------------------------
create table if not exists public.portal_visa_handover_transactions (
  id                  uuid primary key default gen_random_uuid(),
  handover_id         uuid not null references public.portal_handovers(id) on delete cascade,
  collection_id       uuid not null references public.portal_collections(id),
  actual_egp_amount   numeric(14,2) not null,
  confirmation_status portal_confirmation_status not null default 'pending',
  confirmed_by        uuid references auth.users(id),
  confirmed_at        timestamptz,
  unique (handover_id, collection_id)
);
alter table public.portal_visa_handover_transactions enable row level security;
