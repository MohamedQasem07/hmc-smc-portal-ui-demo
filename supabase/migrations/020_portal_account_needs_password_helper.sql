-- 020_portal_account_needs_password_helper
-- Helper used ONLY by the admin-users Edge Function (service_role) to gate the
-- one-time owner bootstrap: returns true iff the account exists and has no
-- password set yet. SECURITY DEFINER to read auth.users; not granted to
-- anon/authenticated (service_role only).
-- Rollback: drop function public.portal_account_needs_password(text);
create or replace function public.portal_account_needs_password(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users u
    where lower(u.email) = lower(p_email)
      and (u.encrypted_password is null or u.encrypted_password = '')
  );
$$;

revoke all on function public.portal_account_needs_password(text) from public;
revoke all on function public.portal_account_needs_password(text) from anon;
revoke all on function public.portal_account_needs_password(text) from authenticated;
grant execute on function public.portal_account_needs_password(text) to service_role;
