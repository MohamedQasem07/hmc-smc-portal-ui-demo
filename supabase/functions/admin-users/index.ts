// =============================================================================
// Edge Function: admin-users
// -----------------------------------------------------------------------------
// Service-role server-side operations for portal user administration + the
// owner first-login bootstrap. The service-role key NEVER leaves this function
// (auto-injected by the Supabase runtime as SUPABASE_SERVICE_ROLE_KEY).
//
// Actions (POST JSON { action, ... }):
//   request_owner_bootstrap  -> { email, bootstrap_code }      [no auth; self-closing]
//   generate_set_password_link / reset_password -> { email|user_id, redirectTo } [admin]
//   create_user   -> { email, display_name, role, active, scope_location_codes[], linked_staff_id? } [admin]
//   set_active    -> { user_id, active }   [admin]
//   set_role      -> { user_id, role }     [admin]
//   link_staff    -> { user_id, linked_staff_id|null } [admin]
//
// Link-generating actions return { action_link, email_otp } so the client can
// either open the link OR verify the OTP directly (verifyOtp) — the OTP path
// needs no redirect-allowlist config. No plaintext passwords are ever handled.
//
// Deployed with verify_jwt=false BECAUSE this function implements its own auth:
// privileged actions require an admin JWT (checked against portal_user_profiles);
// the bootstrap action is gated by a strong server-side code + owner-email + a
// self-closing "account has no password yet" check.
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OWNER_EMAIL = "mohamedqasem436@gmail.com";
// One-time bootstrap gate for the owner's FIRST password set (no admin exists
// yet). Server-side only (never shipped to the browser). Self-closes once the
// owner has a password; rotate/remove after bootstrap completes.
const BOOTSTRAP_CODE = "aegis-boot-9F3c7A21-d84B-4e60-b5E9-20260531xZ";

const DEFAULT_REDIRECT =
  "https://mohamedqasem07.github.io/hmc-smc-portal-ui-demo/#/set-password";
const ALLOWED_ROLES = [
  "admin", "clinic_user", "reception_user", "owner",
  "insurance_staff", "treasury", "nurse", "doctor", "viewer_auditor",
];

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}
function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function genLink(svc: ReturnType<typeof admin>, email: string, redirectTo?: string) {
  const { data, error } = await svc.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: redirectTo || DEFAULT_REDIRECT },
  });
  if (error) throw error;
  return {
    action_link: data?.properties?.action_link ?? null,
    email_otp: data?.properties?.email_otp ?? null,
  };
}
async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { error: "Missing authorization", status: 401 as const };
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { error: "Invalid session", status: 401 as const };
  const svc = admin();
  const { data: profile } = await svc
    .from("portal_user_profiles")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile || profile.active === false || !["admin", "owner"].includes(profile.role)) {
    return { error: "Admin privileges required", status: 403 as const };
  }
  return { user, svc };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
  const action = body?.action;

  try {
    // ---- Owner bootstrap: no admin exists yet; gated + self-closing ----
    if (action === "request_owner_bootstrap") {
      if (body.bootstrap_code !== BOOTSTRAP_CODE) {
        return json({ error: "Invalid bootstrap code" }, 403, origin);
      }
      const email = String(body.email || "").trim().toLowerCase();
      if (email !== OWNER_EMAIL.toLowerCase()) {
        return json({ error: "Bootstrap is restricted to the owner account" }, 403, origin);
      }
      const svc = admin();
      const { data: needs, error: nErr } = await svc.rpc(
        "portal_account_needs_password", { p_email: OWNER_EMAIL },
      );
      if (nErr) return json({ error: "Bootstrap check failed" }, 500, origin);
      if (!needs) {
        return json({ error: "Owner password already set; bootstrap is closed." }, 403, origin);
      }
      const link = await genLink(svc, OWNER_EMAIL, body.redirectTo);
      return json({ ok: true, ...link }, 200, origin);
    }

    // ---- All other actions require a verified admin caller ----
    const gate = await requireAdmin(req);
    if ("error" in gate) return json({ error: gate.error }, gate.status, origin);
    const svc = gate.svc;

    if (action === "generate_set_password_link" || action === "reset_password") {
      // Always resolve the canonical login/auth email from auth.users — never
      // trust a client-supplied display name. Prefer the authoritative lookup by
      // user_id; fall back to a passed email only if no user_id was given.
      let email: string | undefined;
      if (body.user_id) {
        const { data } = await svc.auth.admin.getUserById(body.user_id);
        email = data?.user?.email ?? undefined;
      }
      if (!email && body.email) email = String(body.email).trim();
      if (!email) return json({ error: "email or user_id required" }, 400, origin);
      const finalEmail = String(email).trim();
      // A fresh recovery link overwrites auth.users.recovery_token, invalidating
      // any previous pending set/reset code for this user. Works whether or not
      // the user already has a password (first-time setup OR forgotten-password reset).
      const link = await genLink(svc, finalEmail, body.redirectTo);
      return json({ ok: true, email: finalEmail, ...link }, 200, origin);
    }

    if (action === "create_user") {
      const email = String(body.email || "").trim().toLowerCase();
      const role = body.role;
      const displayName = body.display_name || email;
      if (!email) return json({ error: "email required" }, 400, origin);
      if (!ALLOWED_ROLES.includes(role)) return json({ error: "invalid role" }, 400, origin);

      // 1) create auth user with NO password; email pre-confirmed so a recovery
      //    link lets them set their own password on first login.
      const { data: created, error: cErr } = await svc.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { display_name: displayName },
      });
      if (cErr || !created?.user) {
        return json({ error: `create auth user: ${cErr?.message || "unknown"}` }, 400, origin);
      }
      const userId = created.user.id;

      // 2) profile
      const { error: pErr } = await svc.from("portal_user_profiles").insert({
        user_id: userId, display_name: displayName, role,
        active: body.active !== false, linked_staff_id: body.linked_staff_id || null,
      });
      if (pErr) {
        await svc.auth.admin.deleteUser(userId); // rollback orphan auth user
        return json({ error: `profile: ${pErr.message}` }, 400, origin);
      }

      // 3) location scopes (by code)
      const codes = Array.isArray(body.scope_location_codes) ? body.scope_location_codes : [];
      if (codes.length) {
        const { data: locs } = await svc.from("portal_locations").select("id, code").in("code", codes);
        const rows = (locs || []).map((l: any) => ({ user_id: userId, location_id: l.id, active: true }));
        if (rows.length) {
          const { error: sErr } = await svc.from("portal_user_location_scopes").insert(rows);
          if (sErr) return json({ error: `scopes: ${sErr.message}`, user_id: userId }, 207, origin);
        }
      }

      // 4) one-time set-password link for the new user
      const link = await genLink(svc, email, body.redirectTo);
      return json({ ok: true, user_id: userId, email, ...link }, 200, origin);
    }

    if (action === "set_active") {
      const { user_id, active } = body;
      if (!user_id) return json({ error: "user_id required" }, 400, origin);
      const { error } = await svc.from("portal_user_profiles")
        .update({ active: !!active, updated_at: new Date().toISOString() })
        .eq("user_id", user_id);
      if (error) return json({ error: error.message }, 400, origin);
      // defense in depth: ban/unban at the auth layer too
      await svc.auth.admin.updateUserById(user_id, { ban_duration: active ? "none" : "876000h" });
      return json({ ok: true }, 200, origin);
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !ALLOWED_ROLES.includes(role)) {
        return json({ error: "user_id and a valid role are required" }, 400, origin);
      }
      const { error } = await svc.from("portal_user_profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("user_id", user_id);
      if (error) return json({ error: error.message }, 400, origin);
      return json({ ok: true }, 200, origin);
    }

    if (action === "link_staff") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400, origin);
      const { error } = await svc.from("portal_user_profiles")
        .update({ linked_staff_id: body.linked_staff_id || null, updated_at: new Date().toISOString() })
        .eq("user_id", user_id);
      if (error) return json({ error: error.message }, 400, origin);
      return json({ ok: true }, 200, origin);
    }

    return json({ error: `Unknown action: ${action}` }, 400, origin);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500, origin);
  }
});
