-- =====================================================================
-- 018_portal_assign_our_ref_collision_safe.sql  (P3B — applied 2026-05-30)
-- Replaces 017: atomic per facility/date counter with a collision-skip loop
-- (skips any our_ref already taken, e.g. legacy client-generated refs).
-- Uses an EXISTS check (not a unique_violation catch) so the counter
-- increment is never rolled back by a subtransaction.
-- =====================================================================
create or replace function public.portal_assign_our_ref(p_case_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_fac text; v_kind text; v_family text; v_ref text; v_key text; v_seq bigint;
  v_day int; v_mon int; v_yr int; v_existing text; v_n int := 0;
begin
  if not public.portal_can_access_case(p_case_id) then
    raise exception 'PORTAL_DENIED: no access to case';
  end if;
  select our_ref into v_existing from public.portal_cases where id = p_case_id;
  if v_existing is not null then return v_existing; end if;

  select bf.code, l.location_type::text into v_fac, v_kind
    from public.portal_cases c
    left join public.portal_billing_facilities bf on bf.id = c.billing_facility_id
    join public.portal_locations l on l.id = c.registered_location_id
    where c.id = p_case_id;
  v_family := case when v_fac = 'HMC' then 'HMC' when v_fac = 'SMC' then 'SMC'
                   when v_kind = 'main_branch' then 'HMC' else 'SMC' end;
  v_yr := extract(year from now()); v_day := extract(day from now()); v_mon := extract(month from now());

  loop
    v_n := v_n + 1;
    if v_family = 'HMC' then
      v_key := 'HMC:' || v_yr; v_seq := public.portal_reserve_case_ref(v_key);
      v_ref := 'HMC' || v_yr || lpad((30000 + v_seq)::text, 5, '0');
    else
      v_key := 'SMC:' || v_day || v_mon || v_yr; v_seq := public.portal_reserve_case_ref(v_key);
      v_ref := 'SHMC-' || v_day || v_mon || v_yr || '.' || lpad(v_seq::text, 3, '0');
    end if;
    exit when not exists (select 1 from public.portal_cases where our_ref = v_ref);
    if v_n >= 100 then raise exception 'PORTAL: our_ref allocation exceeded retries'; end if;
  end loop;

  update public.portal_cases set our_ref = v_ref where id = p_case_id and our_ref is null;
  return v_ref;
end$$;
revoke all on function public.portal_assign_our_ref(uuid) from public, anon;
grant execute on function public.portal_assign_our_ref(uuid) to authenticated;
