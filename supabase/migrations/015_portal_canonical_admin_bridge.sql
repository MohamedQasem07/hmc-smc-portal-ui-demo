-- =====================================================================
-- 015_portal_canonical_admin_bridge.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   P3C.2 Gate 2: bridge the EXISTING real authenticated admin identity
--   into the canonical public.portal_* backend, so the hmc-portal app can
--   recognize an admin through public.portal_user_profiles +
--   public.portal_is_admin() (and the canonical RLS policies that call it).
--
--   The admin identity is resolved IN-DATABASE from the non-canonical
--   portal.profiles bootstrap (role='admin' AND is_active=true). No UID,
--   email, password, or name literal appears in this file or in any
--   command output — the value never leaves the database.
--
-- SAFETY
--   Additive + idempotent. Inserts at most ONE row into
--   public.portal_user_profiles (ON CONFLICT (user_id) DO UPDATE only
--   re-asserts role='admin'/active=true for that same id). It:
--     * reads portal.profiles READ-ONLY (does NOT modify the portal schema);
--     * does NOT touch any legacy import table;
--     * does NOT touch the migration-010 synthetic seed
--       (the synthetic admin a0000000-… is NOT in portal.profiles, so the
--        resolver below never selects it);
--     * does NOT create any signup auto-provision trigger;
--     * adds NO location scope (admins bypass location checks via
--       portal_is_admin(), so portal_user_location_scopes is untouched);
--     * inserts NO PHI and NO legacy/operational rows.
--   An authenticated user without a public.portal_user_profiles row remains
--   denied by existing RLS (unchanged here).
--
-- AFFECTED OBJECTS
--   WRITE  : public.portal_user_profiles            (UPSERT, 1 row)
--   READ   : portal.profiles                        (admin identity resolution)
--   READ   : public.portal_role (enum), auth.users  (FK target, not written)
--
-- PRECONDITION (verified read-only before apply, 2026-05-29)
--   portal.profiles contains exactly 1 active admin, and that id is not yet
--   present in public.portal_user_profiles (unbridged_active_admins = 1).
--
-- EXPECTED RESULT
--   public.portal_user_profiles admin rows: 1 (synthetic) -> 2 (synthetic + 1 real);
--   total rows: 5 -> 6. No other table changes.
--
-- ROLLBACK
--   This migration bridged exactly the active admin(s) present in
--   portal.profiles at apply time (verified: 1). The synthetic @portal.test
--   admin (a0000000-…) is NOT in portal.profiles, so it is never matched.
--
--   PREFERRED — scope rollback to the specific id(s) bridged by THIS migration,
--   captured at apply time (single admin today):
--     delete from public.portal_user_profiles where user_id = '<bridged_admin_uid>';
--
--   BROAD FORM — valid ONLY while this is the sole bridged real admin. Once any
--   additional real admin is provisioned (via portal.profiles or any other
--   path), DO NOT use this form: it would also remove those unrelated future
--   canonical admin bridges. Prefer the per-uid form above instead.
--     delete from public.portal_user_profiles
--     where user_id in (
--       select id from portal.profiles where role::text = 'admin' and is_active = true
--     );
--
--   FUTURE-PROOFING (separate later migration, not done here): add a provenance
--   marker (e.g. portal_user_profiles.provisioned_via text) so each bridge can be
--   rolled back precisely without relying on portal.profiles membership.
-- =====================================================================

insert into public.portal_user_profiles (user_id, display_name, role, active)
select pr.id,
       coalesce(nullif(btrim(pr.full_name), ''), 'Portal Administrator'),
       'admin'::public.portal_role,
       true
from portal.profiles pr
where pr.role::text = 'admin'
  and pr.is_active = true
on conflict (user_id) do update
  set role       = 'admin'::public.portal_role,
      active     = true,
      updated_at = now();
