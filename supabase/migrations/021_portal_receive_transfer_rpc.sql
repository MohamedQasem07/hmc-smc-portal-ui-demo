-- Phase 4: atomic transfer receive. SECURITY DEFINER so it can flip the case's
-- current_location to the destination (which the WITH CHECK on portal_cases UPDATE
-- otherwise requires the caller to already have scope on). Scope is enforced
-- explicitly: caller must have a location scope on the transfer destination.
create or replace function public.portal_receive_transfer(p_case_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare v_tr record;
begin
  select t.* into v_tr
  from public.portal_transfers t
  where t.case_id = p_case_id
    and t.transfer_status in ('requested','sent','received')
  order by t.created_at desc
  limit 1;

  if v_tr.id is null then
    raise exception 'PORTAL_RULE: no active transfer for this case';
  end if;
  if not public.portal_has_location(v_tr.to_location_id) then
    raise exception 'PORTAL_DENIED: no scope on transfer destination';
  end if;

  -- Idempotent: a second receive is a no-op.
  if v_tr.transfer_status = 'received' then
    return v_tr.id;
  end if;

  update public.portal_transfers
     set transfer_status = 'received', received_at = now(), received_by = auth.uid()
   where id = v_tr.id;

  update public.portal_cases
     set operational_status = 'received',
         current_location_id = v_tr.to_location_id,
         updated_at = now()
   where id = p_case_id;

  perform public.portal_audit('transfer', v_tr.id, 'received', v_tr.to_location_id,
    null, jsonb_build_object('from', v_tr.from_location_id, 'to', v_tr.to_location_id));
  return v_tr.id;
end;
$function$;

revoke execute on function public.portal_receive_transfer(uuid) from public, anon;
grant execute on function public.portal_receive_transfer(uuid) to authenticated;
