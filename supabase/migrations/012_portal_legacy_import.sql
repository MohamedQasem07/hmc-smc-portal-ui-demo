-- =====================================================================
-- 012_portal_legacy_import.sql  (P3B.3)
-- ---------------------------------------------------------------------
-- PURPOSE
--   Schema for the controlled import of historical insurance cases from
--   the approved Master Sheet, plus the insurance follow-up status timeline.
--   ALL legacy data is Admin-only.
--
-- ADDS
--   enums: portal_insurance_status, portal_legacy_batch_status,
--          portal_legacy_validation_status
--   columns on portal_cases: source_type, legacy_import_batch_id,
--          legacy_source_row_number, admin_only_legacy_case
--   tables: portal_legacy_import_batches, portal_legacy_case_staging,
--          portal_insurance_case_status_history, portal_legacy_import_exceptions
--   location seed: 'legacy_unspecified' (inactive; no user scopes it)
--   RLS: admin-only on all legacy tables; portal_cases SELECT/UPDATE
--        recreated to hide admin_only_legacy_case rows from non-admins.
--
-- SAFETY: additive DDL, no PHI. Row data imported separately by a local
--   credentialed script (PHI never routed through MCP/assistant).
-- =====================================================================

-- enums --------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname='portal_insurance_status') then
    create type portal_insurance_status as enum (
      'pending','insurance_confirmed','gop_requested','gop_received',
      'invoice_prepared','invoice_issued','submitted','waiting_final_gop',
      'partially_paid','paid','rejected','closed','needs_review');
  end if;
  if not exists (select 1 from pg_type where typname='portal_legacy_batch_status') then
    create type portal_legacy_batch_status as enum (
      'inspection_only','mapped','importing','completed',
      'completed_with_exceptions','failed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname='portal_legacy_validation_status') then
    create type portal_legacy_validation_status as enum (
      'valid_ready_to_import','missing_our_ref','duplicate_our_ref',
      'missing_required_fields','already_imported','needs_admin_review','imported');
  end if;
end$$;

-- portal_cases legacy columns ---------------------------------------
alter table public.portal_cases
  add column if not exists source_type text not null default 'portal_registration',
  add column if not exists legacy_import_batch_id uuid,
  add column if not exists legacy_source_row_number integer,
  add column if not exists admin_only_legacy_case boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_portal_cases_source_type') then
    alter table public.portal_cases add constraint chk_portal_cases_source_type
      check (source_type in ('portal_registration','legacy_master_sheet_import'));
  end if;
end$$;
create index if not exists ix_portal_cases_source on public.portal_cases (source_type, admin_only_legacy_case);

-- dedicated location for legacy rows with no reliable origin ---------
insert into public.portal_locations (code, name, location_type, active, allows_expenses, has_room_board)
values ('legacy_unspecified','Legacy Import / Not Specified','external_clinic', false, false, false)
on conflict (code) do nothing;

-- import batches -----------------------------------------------------
create table if not exists public.portal_legacy_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_file_hash text,
  source_sheet_name text not null,
  import_started_at timestamptz not null default now(),
  import_completed_at timestamptz,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  imported_rows integer not null default 0,
  exception_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  status portal_legacy_batch_status not null default 'inspection_only',
  created_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.portal_legacy_import_batches enable row level security;

-- staging ------------------------------------------------------------
create table if not exists public.portal_legacy_case_staging (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.portal_legacy_import_batches(id) on delete cascade,
  source_row_number integer not null,
  source_our_ref text,
  masked_patient_identifier text,
  mapped_payload jsonb not null,
  validation_status portal_legacy_validation_status not null,
  validation_errors jsonb,
  matched_existing_case_id uuid references public.portal_cases(id),
  imported_case_id uuid references public.portal_cases(id),
  created_at timestamptz not null default now()
);
alter table public.portal_legacy_case_staging enable row level security;
create index if not exists ix_portal_legacy_staging_batch on public.portal_legacy_case_staging (import_batch_id, validation_status);

-- exceptions ---------------------------------------------------------
create table if not exists public.portal_legacy_import_exceptions (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.portal_legacy_import_batches(id) on delete cascade,
  source_row_number integer not null,
  source_our_ref text,
  reason text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.portal_legacy_import_exceptions enable row level security;
create index if not exists ix_portal_legacy_exc_batch on public.portal_legacy_import_exceptions (import_batch_id);

-- insurance follow-up status history (append-only) -------------------
create table if not exists public.portal_insurance_case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.portal_cases(id) on delete cascade,
  status portal_insurance_status not null,
  original_legacy_status_text text,
  normalized_status portal_insurance_status,
  status_date timestamptz not null default now(),
  reason text,
  notes text,
  changed_by uuid references auth.users(id),
  source_type text not null check (source_type in ('imported_initial_status','admin_manual_update','future_claude_sync')),
  created_at timestamptz not null default now()
);
alter table public.portal_insurance_case_status_history enable row level security;
create index if not exists ix_portal_status_history_case on public.portal_insurance_case_status_history (case_id, status_date);

-- grants: authenticated DML (RLS gates); anon none --------------------
do $$ declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public'
           and tablename in ('portal_legacy_import_batches','portal_legacy_case_staging',
                             'portal_legacy_import_exceptions','portal_insurance_case_status_history')
  loop
    execute format('revoke all on public.%I from anon;', r.tablename);
    execute format('grant select, insert, update, delete on public.%I to authenticated;', r.tablename);
  end loop;
end$$;

-- RLS: legacy batch/staging/exceptions are ADMIN ONLY ----------------
create policy portal_legacy_batches_admin on public.portal_legacy_import_batches
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
create policy portal_legacy_staging_admin on public.portal_legacy_case_staging
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
create policy portal_legacy_exc_admin on public.portal_legacy_import_exceptions
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- Status history: admin full; non-admin only for NON-legacy accessible
-- cases; append-only (no update/delete policy).
create policy portal_status_hist_sel on public.portal_insurance_case_status_history
  for select to authenticated using (
    public.portal_is_admin()
    or (public.portal_can_access_case(case_id)
        and not exists (select 1 from public.portal_cases c where c.id = case_id and c.admin_only_legacy_case))
  );
create policy portal_status_hist_ins on public.portal_insurance_case_status_history
  for insert to authenticated with check (
    public.portal_is_admin()
    or (public.portal_can_access_case(case_id)
        and not exists (select 1 from public.portal_cases c where c.id = case_id and c.admin_only_legacy_case))
  );

-- Recreate portal_cases SELECT/UPDATE to hide legacy from non-admins --
drop policy if exists portal_cases_sel on public.portal_cases;
create policy portal_cases_sel on public.portal_cases for select to authenticated using (
  public.portal_is_admin()
  or (admin_only_legacy_case = false and (
        public.portal_has_location(registered_location_id)
        or public.portal_has_location(current_location_id)
        or exists (select 1 from public.portal_transfers t where t.case_id = portal_cases.id and public.portal_has_location(t.to_location_id))
     ))
);
drop policy if exists portal_cases_upd on public.portal_cases;
create policy portal_cases_upd on public.portal_cases for update to authenticated
  using (
    public.portal_is_admin()
    or (admin_only_legacy_case = false and (
          public.portal_has_location(registered_location_id)
          or public.portal_has_location(current_location_id)
          or exists (select 1 from public.portal_transfers t where t.case_id = portal_cases.id and public.portal_has_location(t.to_location_id))
       ))
  )
  with check (
    public.portal_is_admin()
    or (admin_only_legacy_case = false and (
          public.portal_has_location(registered_location_id)
          or public.portal_has_location(current_location_id)
       ))
  );
