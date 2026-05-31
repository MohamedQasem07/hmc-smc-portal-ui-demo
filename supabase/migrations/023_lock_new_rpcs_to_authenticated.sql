-- Match the established hardening pattern: the new SECURITY DEFINER RPCs should be
-- callable only by signed-in (authenticated) users, not anon. (They already deny
-- anon internally via portal_can_access_case/portal_has_location, but revoke the
-- default PUBLIC grant for defense-in-depth + to clear the advisor lint.)
-- Idempotent — safe to re-run alongside 021/022.
revoke execute on function public.portal_receive_transfer(uuid) from public, anon;
revoke execute on function public.portal_insert_encounter(uuid, portal_encounter_type, timestamptz, timestamptz, text, portal_encounter_status) from public, anon;
grant execute on function public.portal_receive_transfer(uuid) to authenticated;
grant execute on function public.portal_insert_encounter(uuid, portal_encounter_type, timestamptz, timestamptz, text, portal_encounter_status) to authenticated;
