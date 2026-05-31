-- =====================================================================
-- 029_portal_discharge_case_rpc.sql  — DRAFT (NOT APPLIED — approval-gated)
-- Phase G: atomic discharge. Replaces the frontend's 3 sequential writes
-- (close encounter -> release room -> close case) with one transaction.
-- SECURITY DEFINER; self-authorizes via portal_can_access_case(). The
-- frontend dischargeCase() will call this RPC instead of 3 writes (UI
-- unchanged). Until applied, the existing safe-ordered frontend path stays.
--
-- ROLLBACK:
--   drop function if exists public.portal_discharge_case(uuid,uuid,timestamptz);
--   -- frontend reverts to the current sequential dischargeCase() — no behaviour loss.
-- =====================================================================

create or replace function public.portal_discharge_case(
  p_case_id uuid, p_encounter_id uuid default null, p_checkout_at timestamptz default now()
) returns public.portal_cases
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_case public.portal_cases;
begin
  if not public.portal_can_access_case(p_case_id) then
    raise exception 'PORTAL_DENIED: no access to case';
  end if;
  -- 1) close the specified active encounter, or all active ones if none specified
  update public.portal_encounters
     set check_out_at = p_checkout_at, status = 'completed', updated_at = now()
   where case_id = p_case_id and status = 'active'
     and (p_encounter_id is null or id = p_encounter_id);
  -- 2) release the active room assignment
  update public.portal_room_assignments
     set released_at = p_checkout_at, released_by = auth.uid(), status = 'released'
   where case_id = p_case_id and status = 'occupied';
  -- 3) close the case (clears center_room_id; saves discharge date+time)
  update public.portal_cases
     set center_room_id = null, operational_status = 'closed', closed_at = p_checkout_at, updated_at = now()
   where id = p_case_id
   returning * into v_case;
  perform public.portal_audit('case', p_case_id, 'discharged', v_case.current_location_id, null,
                              jsonb_build_object('closed_at', p_checkout_at));
  return v_case;
end $$;
revoke all on function public.portal_discharge_case(uuid,uuid,timestamptz) from public, anon;
grant execute on function public.portal_discharge_case(uuid,uuid,timestamptz) to authenticated;

-- VERIFY:
--   select proname from pg_proc where proname='portal_discharge_case';
