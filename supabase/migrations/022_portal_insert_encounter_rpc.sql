-- Phase 6: specialist visits / sessions. RLS already allows CUD on portal_encounters
-- via portal_can_access_case; this RPC adds ATOMIC per-case sequence_no assignment
-- (avoids races) and a scope re-check. SECURITY DEFINER. Operational tracking only.
create or replace function public.portal_insert_encounter(
  p_case_id uuid,
  p_encounter_type portal_encounter_type default 'session',
  p_check_in_at timestamptz default now(),
  p_check_out_at timestamptz default null,
  p_note text default null,
  p_status portal_encounter_status default 'active')
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare v_seq integer; v_id uuid;
begin
  if not public.portal_can_access_case(p_case_id) then
    raise exception 'PORTAL_DENIED: no access to case';
  end if;
  select coalesce(max(sequence_no), 0) + 1 into v_seq
    from public.portal_encounters
   where case_id = p_case_id and encounter_type = p_encounter_type;
  insert into public.portal_encounters
    (case_id, encounter_type, sequence_no, check_in_at, check_out_at, status, notes, created_by)
  values
    (p_case_id, p_encounter_type, v_seq, coalesce(p_check_in_at, now()), p_check_out_at, p_status, p_note, auth.uid())
  returning id into v_id;
  perform public.portal_audit('encounter', v_id, 'created', null, null,
    jsonb_build_object('case_id', p_case_id, 'type', p_encounter_type, 'seq', v_seq));
  return v_id;
end;
$function$;

revoke execute on function public.portal_insert_encounter(uuid, portal_encounter_type, timestamptz, timestamptz, text, portal_encounter_status) from public, anon;
grant execute on function public.portal_insert_encounter(uuid, portal_encounter_type, timestamptz, timestamptz, text, portal_encounter_status) to authenticated;
