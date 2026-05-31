import { getSupabaseClient } from './supabaseClient'
import { sbAdminUsers } from './auth'
import {
  FINANCIAL_TYPE_TO_PORTAL, ROUTE_TO_PORTAL, ENCOUNTER_PATTERN_TO_PORTAL,
  GENDER_TO_PORTAL, billingPrepToRow,
} from './portalMapping'

/* =========================================================================
 * Live portal_* data access (P3B / S6) — supabase mode only.
 * Reads are RLS-scoped automatically (the JWT decides which rows return).
 * Writes set created_by = auth.uid() to satisfy the INSERT policies.
 * Maps portal rows <-> the in-app (mock-shaped) case object the pages render.
 * ========================================================================= */

let _maps = null
export async function loadRefMaps(force = false) {
  if (_maps && !force) return _maps
  const db = await getSupabaseClient()
  const [{ data: locs }, { data: facs }] = await Promise.all([
    db.from('portal_locations').select('id, code, name, location_type'),
    db.from('portal_billing_facilities').select('id, code'),
  ])
  _maps = {
    locById: Object.fromEntries((locs || []).map((l) => [l.id, l])),
    locIdByCode: Object.fromEntries((locs || []).map((l) => [l.code, l.id])),
    facCodeById: Object.fromEntries((facs || []).map((f) => [f.id, f.code])),
    facIdByCode: Object.fromEntries((facs || []).map((f) => [f.code, f.id])),
  }
  return _maps
}

const FIN_FROM_PORTAL = { pending: 'Pending', cash: 'Cash', insurance: 'Insurance', free_complimentary: 'Free / Complimentary' }
const OPSTATUS_FROM_PORTAL = { open: 'Open', closed: 'Closed', transferred: 'Open', received: 'Open', cancelled: 'Closed' }
const KIND_FROM_TYPE = { external_clinic: 'external', main_branch: 'branch' }
const ROUTE_FROM_PORTAL = { direct: 'direct', transfer_to_al_kawther: 'to_al_kawther', transfer_to_sheraton: 'to_sheraton', transfer_other: 'transfer_other' }
const BILLING_STATUS_FROM_PORTAL = {
  awaiting_admin_completion: 'awaiting_admin_completion',
  ready_for_claude_invoice_preparation: 'ready_for_claude',
  invoice_generated_future_placeholder: 'future_integration',
  review_required: 'review_required', completed: 'completed',
}
const one = (v) => (Array.isArray(v) ? v[0] : v)

export function portalRowToCase(row, maps) {
  const loc = maps.locById[row.registered_location_id] || {}
  const intake = one(row.intake)
  const prep = one(row.prep)
  const p = row.patient || {}
  return {
    id: row.id,
    ourRef: row.our_ref || ('PORTAL-' + String(row.id).slice(0, 8)),
    registeredAtId: loc.code || null,
    registeredAtName: loc.name || '—',
    registeredAtKind: KIND_FROM_TYPE[loc.location_type] || 'external',
    visitDate: row.visit_date,
    patient: {
      firstName: p.first_name, lastName: p.last_name,
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
      gender: p.gender ? (p.gender === 'male' ? 'Male' : 'Female') : null,
      dob: p.date_of_birth, nationality: p.nationality,
      hotel: row.hotel_or_location || null, note: row.short_clinical_note || null,
    },
    route: ROUTE_FROM_PORTAL[row.route] || 'direct',
    routeLabel: ROUTE_FROM_PORTAL[row.route] === 'direct' || !row.route ? `Direct at ${loc.name || ''}` : `Transfer`,
    financialType: FIN_FROM_PORTAL[row.financial_type] || 'Pending',
    billingFacility: row.billing_facility_id ? (maps.facCodeById[row.billing_facility_id] || null) : null,
    insurance: intake ? { company: one(intake.company)?.name || null, ref: intake.insurance_reference_number || null } : null,
    operationalStatus: OPSTATUS_FROM_PORTAL[row.operational_status] || 'Open',
    encounterPattern: row.encounter_pattern,
    treatmentMode: row.treatment_mode || null,
    transfer: (() => {
      const tr = one(row.transfer)
      if (!tr) return null
      const toLoc = maps.locById[tr.to_location_id] || {}
      const frLoc = maps.locById[tr.from_location_id] || {}
      const TS = { requested: 'Sent', sent: 'Sent', received: 'Received', cancelled: 'Cancelled' }
      return {
        toBranchId: toLoc.code || null, toBranchName: toLoc.name || null,
        fromId: frLoc.code || null, fromName: frLoc.name || null,
        status: TS[tr.transfer_status] || 'Sent',
        sentAt: tr.requested_at || null,
        receivedAt: tr.received_at || null,
        reason: tr.transfer_note || null,
      }
    })(),
    centerRoomNumber: null,
    insuranceCompletion: prep ? {
      invoiceCurrency: prep.invoice_currency,
      serviceChargePct: prep.service_charge_pct,
      billingPrepStatus: BILLING_STATUS_FROM_PORTAL[prep.billing_preparation_status] || 'awaiting_admin_completion',
      onedriveFolderPath: prep.onedrive_folder_path,
      missingDataNote: prep.missing_data_note,
      transportationFee: prep.transportation_fee,
      patientExcess: prep.patient_excess_amount,
      adminNotes: prep.admin_notes,
      completedAt: prep.completed_at,
    } : null,
    // runtime fields some pages read — safe empty defaults
    sessions: [], paymentLines: [], excessLines: [], visit: null, admission: null,
    cashPayment: null, mixedCurrency: false, history: [], notes: '',
    source: 'supabase',
  }
}

const CASE_SELECT = `
  id, our_ref, visit_date, financial_type, operational_status, encounter_pattern, route,
  treatment_mode, registered_location_id, billing_facility_id, hotel_or_location, short_clinical_note,
  patient:patient_id ( first_name, last_name, date_of_birth, gender, nationality ),
  transfer:portal_transfers ( from_location_id, to_location_id, transfer_status, requested_at, received_at, transfer_note ),
  intake:portal_insurance_intakes ( insurance_reference_number, company:insurance_company_id ( name ) ),
  prep:portal_insurance_billing_preparations ( invoice_currency, service_charge_pct, billing_preparation_status,
    onedrive_folder_path, missing_data_note, transportation_fee, patient_excess_amount, admin_notes, completed_at )
`

/** RLS-scoped: returns only the cases the current user may see. */
export async function fetchCases() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_cases').select(CASE_SELECT).order('visit_date', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => portalRowToCase(r, maps))
}

async function currentUid(db) {
  const { data } = await db.auth.getUser()
  return data?.user?.id || null
}

/** Insert patient + case from the in-app newCase object. Returns new case id. */
export async function insertCase(newCase) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const uid = await currentUid(db)
  const pat = newCase.patient || {}
  const first = pat.firstName || (pat.name || '').trim().split(/\s+/)[0] || 'Unknown'
  const last = pat.lastName || (pat.name || '').trim().split(/\s+/).slice(1).join(' ') || first
  const { data: patRow, error: pErr } = await db.from('portal_patients').insert({
    first_name: first, last_name: last,
    date_of_birth: pat.dob || '1990-01-01',
    gender: GENDER_TO_PORTAL[pat.gender] || 'female',
    nationality: pat.nationality || null,
    created_by: uid,
  }).select('id').single()
  if (pErr) throw pErr

  const locId = maps.locIdByCode[newCase.registeredAtId] || null
  const facId = newCase.billingFacility ? (maps.facIdByCode[newCase.billingFacility] || null) : null
  const { data: caseRow, error: cErr } = await db.from('portal_cases').insert({
    our_ref: null, // assigned server-side via portal_assign_our_ref (atomic, collision-free)
    patient_id: patRow.id,
    registered_location_id: locId,
    current_location_id: locId,
    billing_facility_id: facId,
    route: ROUTE_TO_PORTAL[newCase.route] || 'direct',
    financial_type: FINANCIAL_TYPE_TO_PORTAL[newCase.financialType] || 'pending',
    encounter_pattern: ENCOUNTER_PATTERN_TO_PORTAL[newCase.encounterPattern] || 'outpatient_single',
    operational_status: 'open',
    visit_date: (newCase.visitDate || '').slice(0, 10) || null,
    hotel_or_location: pat.hotel || null,
    short_clinical_note: pat.note || null,
    created_by: uid,
  }).select('id').single()
  if (cErr) throw cErr
  const caseId = caseRow.id

  // Server-authoritative OUR Ref (atomic per facility/date counter; collision-free).
  try { await db.rpc('portal_assign_our_ref', { p_case_id: caseId }) }
  catch (e) { console.warn('[portal] our_ref assign failed', e?.message) }

  // Stage-1 insurance intake (clinic-visible) + patient-excess charge.
  if (newCase.financialType === 'Insurance' && facId) {
    const insName = (newCase.insurance?.company || '').trim()
    let companyId = null
    if (insName) {
      const { data: existing } = await db.from('portal_insurance_companies')
        .select('id').ilike('name', insName).maybeSingle()
      if (existing) companyId = existing.id
      else {
        const { data: created } = await db.from('portal_insurance_companies')
          .insert({ name: insName, email: newCase.insurance?.email || null, phone: newCase.insurance?.phone || null, created_by: uid })
          .select('id').single()
        companyId = created?.id || null
      }
    }
    if (companyId) {
      await db.from('portal_insurance_intakes').insert({
        case_id: caseId,
        insurance_company_id: companyId,
        insurance_reference_number: (newCase.insurance?.ref || '').trim() || '(pending)',
        insurance_company_email: newCase.insurance?.email || null,
        insurance_company_phone: newCase.insurance?.phone || null,
        billing_facility_id: facId,
        has_patient_excess: !!newCase.hasPatientExcess,
        created_by: uid,
      })
    }
    if (newCase.hasPatientExcess && Number(newCase.excessAmount) > 0) {
      await db.from('portal_case_charges').insert({
        case_id: caseId, charge_type: 'patient_excess',
        amount: Number(newCase.excessAmount), currency: newCase.excessCurrency || 'EUR', created_by: uid,
      })
    }
  }

  // Collections (cash + patient-excess lines) via the secure RPC.
  for (const l of (newCase.paymentLines || [])) {
    try { await recordCollection(db, caseId, l, 'cash_case_payment', locId) }
    catch (e) { console.warn('[portal] collection failed', e?.message) }
  }
  for (const l of (newCase.excessLines || [])) {
    try { await recordCollection(db, caseId, l, 'patient_excess', locId) }
    catch (e) { console.warn('[portal] excess collection failed', e?.message) }
  }

  // Transfer record when the case is routed to a destination branch.
  if (newCase.transfer && newCase.transfer.toBranchId) {
    const toLoc = maps.locIdByCode[newCase.transfer.toBranchId] || null
    if (toLoc && locId) {
      await db.from('portal_transfers').insert({
        case_id: caseId, from_location_id: locId, to_location_id: toLoc,
        transfer_status: 'sent', requested_by: uid,
        transfer_note: [newCase.transfer.reason, newCase.transfer.transport, newCase.transfer.referralNote].filter(Boolean).join(' · ') || null,
      })
    }
  }
  return caseId
}

/** Record one collection line via the secure RPC (handles FX + treasury movement).
 *  Cash → original currency / physical_cash; Visa/Card → EGP / visa_bank (FX required). */
export async function recordCollection(db, caseId, line, purpose, locId) {
  const isVisa = /visa|card/i.test(line.method || '')
  const method = isVisa ? 'visa_card' : 'cash'
  const actualCurrency = isVisa ? 'EGP' : (line.currency || 'EUR')
  const invoiceCurrency = isVisa ? (line.fxRefCurrency || line.currency || 'EUR') : (line.currency || 'EUR')
  const foreign = isVisa ? Number(line.fxRefAmount ?? line.amount) : Number(line.amount)
  const fxRate = isVisa
    ? (Number(line.fxRate) || null)
    : (actualCurrency === invoiceCurrency ? null : (Number(line.fxRate) || null))
  if (!foreign || foreign <= 0) return null
  if (isVisa && (!fxRate || fxRate <= 0)) return null   // RPC requires FX for Visa — skip incomplete line
  const { data, error } = await db.rpc('portal_record_collection', {
    p_case_id: caseId, p_collection_purpose: purpose, p_payment_method: method,
    p_invoice_currency: invoiceCurrency, p_foreign_amount_covered: foreign,
    p_actual_currency: actualCurrency, p_fx_rate: fxRate,
    p_collection_location_id: locId, p_charge_id: null,
  })
  if (error) throw error
  return data
}

/** RLS-scoped: collections the current user may see (clinic = own location; admin = all).
 *  Enriched for the live Collections list: case OUR Ref + patient name (via the case FK)
 *  and the collector's display name (best-effort — portal_user_profiles is self-readable
 *  for clinic users, all-readable for admin). No FX is invented: cash settles in its own
 *  currency; Visa/Card settles in EGP and carries the stored fx_rate verbatim. */
export async function fetchCollections() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_collections')
    .select(`id, case_id, collection_purpose, payment_method, invoice_currency,
      foreign_amount_covered, actual_currency, fx_rate, actual_collected_amount,
      treasury_channel, status, collection_location_id, collected_by, collected_at,
      caseref:case_id ( our_ref, patient:patient_id ( first_name, last_name ) )`)
    .order('collected_at', { ascending: false })
  if (error) throw error
  const rows = data || []

  // Best-effort collector-name resolution. RLS returns only the current user's own
  // profile for a clinic user (so other collectors show as a short id), and every
  // profile for an admin. Never blocks the list if it fails.
  let nameByUid = {}
  let myUid = null
  try {
    const { data: au } = await db.auth.getUser()
    myUid = au?.user?.id || null
    const { data: profs } = await db.from('portal_user_profiles').select('user_id, display_name')
    nameByUid = Object.fromEntries((profs || []).map((p) => [p.user_id, p.display_name]))
  } catch { /* names are best-effort only */ }

  return rows.map((c) => {
    const cs = one(c.caseref)
    const pat = cs ? one(cs.patient) : null
    const loc = maps.locById[c.collection_location_id] || {}
    return {
      id: c.id,
      caseId: c.case_id,
      ourRef: cs?.our_ref || null,
      patientName: pat ? [pat.first_name, pat.last_name].filter(Boolean).join(' ') || null : null,
      purpose: c.collection_purpose,
      method: c.payment_method,
      invoiceCurrency: c.invoice_currency,
      foreignAmount: c.foreign_amount_covered,
      actualCurrency: c.actual_currency,
      actualAmount: c.actual_collected_amount,
      fxRate: c.fx_rate,
      treasuryChannel: c.treasury_channel,
      status: c.status,
      locationCode: loc.code || null,
      locationName: loc.name || null,
      collectedBy: c.collected_by,
      collectedByName: nameByUid[c.collected_by] || (c.collected_by && c.collected_by === myUid ? 'You' : null),
      collectedAt: c.collected_at,
    }
  })
}

/** Admin-only (RLS). Upsert billing preparation for a case. */
export async function upsertBillingPrep(caseId, fields) {
  const db = await getSupabaseClient()
  const uid = await currentUid(db)
  const row = { ...billingPrepToRow(caseId, fields), completed_by: uid, completed_at: new Date().toISOString() }
  const { error } = await db.from('portal_insurance_billing_preparations').upsert(row, { onConflict: 'case_id' })
  if (error) throw error
  return caseId
}

/* =========================================================================
 * Attendance (P3B / Task #9) — supabase mode only.
 * Reads are RLS-scoped (clinic = own location; admin = all). Writes go
 * through the verified SECURITY DEFINER RPCs, which enforce that the caller
 * has scope on the location AND the staff is an active nurse/doctor assigned
 * to that location.
 * ========================================================================= */

/** uuid of a location CODE (e.g. 'tropitel'), or null. */
export async function locationIdForCode(code) {
  if (!code) return null
  const maps = await loadRefMaps()
  return maps.locIdByCode[code] || null
}

/** RLS-scoped nurse shifts + doctor duties, optionally for one work date (YYYY-MM-DD). */
export async function fetchAttendance(workDateYmd = null) {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  let shiftsQ = db.from('portal_nurse_shifts')
    .select('id, location_id, staff_id, work_date, shift_start_at, shift_end_at, worked_minutes, status, recorded_by, staff:staff_id ( full_name )')
    .order('shift_start_at', { ascending: false })
  let dutiesQ = db.from('portal_doctor_daily_duty')
    .select('id, location_id, staff_id, work_date, note, recorded_by, staff:staff_id ( full_name )')
    .order('work_date', { ascending: false })
  if (workDateYmd) { shiftsQ = shiftsQ.eq('work_date', workDateYmd); dutiesQ = dutiesQ.eq('work_date', workDateYmd) }
  const [{ data: sh, error: e1 }, { data: du, error: e2 }] = await Promise.all([shiftsQ, dutiesQ])
  if (e1) throw e1
  if (e2) throw e2
  const loc = (id) => maps.locById[id] || {}
  return {
    shifts: (sh || []).map((s) => ({
      id: s.id,
      locationCode: loc(s.location_id).code || null,
      locationName: loc(s.location_id).name || null,
      staffId: s.staff_id,
      staffName: one(s.staff)?.full_name || null,
      workDate: s.work_date,
      startAt: s.shift_start_at,
      endAt: s.shift_end_at,
      workedMinutes: s.worked_minutes,
      status: s.status,
      recordedBy: s.recorded_by,
    })),
    duties: (du || []).map((d) => ({
      id: d.id,
      locationCode: loc(d.location_id).code || null,
      locationName: loc(d.location_id).name || null,
      staffId: d.staff_id,
      staffName: one(d.staff)?.full_name || null,
      workDate: d.work_date,
      note: d.note,
      recordedBy: d.recorded_by,
    })),
  }
}

/** RLS-scoped active staff↔location assignments (own clinic; admin = all).
 *  Feeds the nurse/doctor pickers — only staff valid for the RPC appear. */
export async function fetchAssignableStaff() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_staff_location_assignments')
    .select('assignment_role, active, location_id, staff:staff_id ( id, full_name, staff_role, active )')
    .eq('active', true)
  if (error) throw error
  return (data || [])
    .map((a) => {
      const st = one(a.staff) || {}
      return {
        staffId: st.id,
        name: st.full_name,
        role: a.assignment_role,            // 'nurse' | 'doctor'
        staffActive: st.active !== false,
        locationId: a.location_id,
        locationCode: maps.locById[a.location_id]?.code || null,
        locationName: maps.locById[a.location_id]?.name || null,
      }
    })
    .filter((a) => a.staffId && a.staffActive)
}

/** Start a nurse shift (RPC validates scope + nurse assignment). Returns shift id. */
export async function recordNurseShift(locationId, staffId, workDateYmd) {
  const db = await getSupabaseClient()
  const { data, error } = await db.rpc('portal_record_nurse_shift', {
    p_location_id: locationId, p_staff_id: staffId, p_work_date: workDateYmd,
  })
  if (error) throw error
  return data
}

/** End an active nurse shift (RPC validates location scope). */
export async function endNurseShift(shiftId) {
  const db = await getSupabaseClient()
  const { error } = await db.rpc('portal_end_nurse_shift', { p_shift_id: shiftId })
  if (error) throw error
}

/** Record the doctor on duty for a date (RPC validates scope + doctor assignment;
 *  upserts on location+date+staff). Returns duty id. */
export async function recordDoctorDuty(locationId, staffId, workDateYmd, note = null) {
  const db = await getSupabaseClient()
  const { data, error } = await db.rpc('portal_record_doctor_duty', {
    p_location_id: locationId, p_staff_id: staffId, p_work_date: workDateYmd, p_note: note,
  })
  if (error) throw error
  return data
}

/* =========================================================================
 * Admin configuration (config-first staging) — supabase mode only.
 * All writes are gated by the existing admin RLS (portal_is_admin()).
 * NO auth-user / password handling here (creating logins needs a server-side
 * function with the service-role key — intentionally out of the client).
 * ========================================================================= */

/** All locations (for pickers). */
export async function fetchLocations() {
  const db = await getSupabaseClient()
  const { data, error } = await db.from('portal_locations')
    .select('id, code, name, location_type, active').order('location_type').order('name')
  if (error) throw error
  return (data || []).map((l) => ({ id: l.id, code: l.code, name: l.name, type: l.location_type, active: l.active }))
}

// ---- Rooms (portal_rooms) ----
export async function fetchRooms() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const { data, error } = await db.from('portal_rooms')
    .select('id, location_id, room_code, room_name, sort_order, active')
    .order('location_id').order('sort_order', { nullsFirst: true }).order('room_code')
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.id, locationId: r.location_id,
    locationCode: maps.locById[r.location_id]?.code || null,
    locationName: maps.locById[r.location_id]?.name || null,
    roomCode: r.room_code, roomName: r.room_name, sortOrder: r.sort_order, active: r.active,
  }))
}
export async function upsertRoom(room) {
  const db = await getSupabaseClient()
  const row = {
    location_id: room.locationId, room_code: room.roomCode, room_name: room.roomName,
    sort_order: room.sortOrder ?? null, active: room.active ?? true,
  }
  if (room.id) {
    const { error } = await db.from('portal_rooms').update(row).eq('id', room.id)
    if (error) throw error
    return room.id
  }
  const { data, error } = await db.from('portal_rooms').insert(row).select('id').single()
  if (error) throw error
  return data.id
}
export async function setRoomActive(id, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_rooms').update({ active }).eq('id', id)
  if (error) throw error
}

// ---- Payment methods (portal_payment_methods) ----
export async function fetchPaymentMethods({ activeOnly = false } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_payment_methods').select('code, label, kind, settlement_note, active, sort_order').order('sort_order')
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function setPaymentMethodActive(code, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_payment_methods').update({ active, updated_at: new Date().toISOString() }).eq('code', code)
  if (error) throw error
}

// ---- Nationalities (portal_nationalities) ----
export async function fetchNationalities({ activeOnly = true } = {}) {
  const db = await getSupabaseClient()
  let q = db.from('portal_nationalities').select('id, name_en, flag, phone_code, active').order('name_en')
  if (activeOnly) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}
export async function setNationalityActive(id, active) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_nationalities').update({ active }).eq('id', id)
  if (error) throw error
}

// ---- Users + location scopes (portal_user_profiles / portal_user_location_scopes) ----
export async function fetchAdminUsers() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const [{ data: profs, error: e1 }, { data: scopes, error: e2 }] = await Promise.all([
    db.from('portal_user_profiles').select('user_id, display_name, role, active, linked_staff_id'),
    db.from('portal_user_location_scopes').select('id, user_id, location_id, active'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const byUser = {}
  for (const s of (scopes || [])) (byUser[s.user_id] ||= []).push(s)
  return (profs || []).map((u) => ({
    userId: u.user_id, displayName: u.display_name, role: u.role, active: u.active, linkedStaffId: u.linked_staff_id,
    scopes: (byUser[u.user_id] || []).filter((s) => s.active).map((s) => ({
      id: s.id, locationId: s.location_id,
      locationCode: maps.locById[s.location_id]?.code || null,
      locationName: maps.locById[s.location_id]?.name || null,
    })),
  })).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
}
export async function grantUserScope(userId, locationId) {
  const db = await getSupabaseClient()
  const { data: existing } = await db.from('portal_user_location_scopes')
    .select('id, active').eq('user_id', userId).eq('location_id', locationId).maybeSingle()
  if (existing) {
    if (!existing.active) {
      const { error } = await db.from('portal_user_location_scopes').update({ active: true }).eq('id', existing.id)
      if (error) throw error
    }
    return existing.id
  }
  const { data, error } = await db.from('portal_user_location_scopes')
    .insert({ user_id: userId, location_id: locationId, active: true }).select('id').single()
  if (error) throw error
  return data.id
}
export async function revokeUserScope(scopeId) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_user_location_scopes').update({ active: false }).eq('id', scopeId)
  if (error) throw error
}

// ---- Staff + clinic assignments (portal_staff / portal_staff_location_assignments) ----
export async function fetchAdminStaff() {
  const db = await getSupabaseClient()
  const maps = await loadRefMaps()
  const [{ data: staff, error: e1 }, { data: asg, error: e2 }] = await Promise.all([
    db.from('portal_staff').select('id, staff_code, full_name, staff_role, phone, active'),
    db.from('portal_staff_location_assignments').select('id, staff_id, location_id, assignment_role, active'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const byStaff = {}
  for (const a of (asg || [])) (byStaff[a.staff_id] ||= []).push(a)
  return (staff || []).map((s) => ({
    id: s.id, staffCode: s.staff_code, fullName: s.full_name, role: s.staff_role, phone: s.phone, active: s.active,
    assignments: (byStaff[s.id] || []).filter((a) => a.active).map((a) => ({
      id: a.id, locationId: a.location_id, role: a.assignment_role,
      locationCode: maps.locById[a.location_id]?.code || null,
      locationName: maps.locById[a.location_id]?.name || null,
    })),
  })).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
}
export async function upsertStaff(staff) {
  const db = await getSupabaseClient()
  if (staff.id) {
    const { error } = await db.from('portal_staff').update({
      full_name: staff.fullName, staff_role: staff.role, phone: staff.phone || null, active: staff.active ?? true,
    }).eq('id', staff.id)
    if (error) throw error
    return staff.id
  }
  const code = staff.staffCode || ('STF-' + String(staff.role || 'oth').slice(0, 3).toUpperCase() + '-' + Date.now().toString(36).slice(-5).toUpperCase())
  const { data, error } = await db.from('portal_staff').insert({
    staff_code: code, full_name: staff.fullName, staff_role: staff.role, phone: staff.phone || null, active: staff.active ?? true,
  }).select('id').single()
  if (error) throw error
  return data.id
}
export async function assignStaffToClinic(staffId, locationId, assignmentRole) {
  const db = await getSupabaseClient()
  const { data: existing } = await db.from('portal_staff_location_assignments')
    .select('id, active').eq('staff_id', staffId).eq('location_id', locationId).eq('assignment_role', assignmentRole).maybeSingle()
  if (existing) {
    if (!existing.active) {
      const { error } = await db.from('portal_staff_location_assignments').update({ active: true }).eq('id', existing.id)
      if (error) throw error
    }
    return existing.id
  }
  const uid = await currentUid(db)
  const { data, error } = await db.from('portal_staff_location_assignments')
    .insert({ staff_id: staffId, location_id: locationId, assignment_role: assignmentRole, active: true, created_by: uid })
    .select('id').single()
  if (error) throw error
  return data.id
}
export async function unassignStaff(assignmentId) {
  const db = await getSupabaseClient()
  const { error } = await db.from('portal_staff_location_assignments').update({ active: false }).eq('id', assignmentId)
  if (error) throw error
}

/* =========================================================================
 * Portal user administration (Sprint 1) — supabase mode only.
 * These call the admin-users Edge Function (service-role, server-side). The
 * function re-verifies the caller is an admin; nothing privileged runs in the
 * client and no service-role key is present here. Each returns
 * { ok, error?, ... } (link actions also return { action_link, email_otp }).
 * ========================================================================= */

/** Create a real login user: auth user + profile + scopes + optional staff link.
 *  payload: { email, display_name, role, active, scope_location_codes:[], linked_staff_id? }
 *  Returns { ok, user_id?, action_link?, email_otp?, error? }. The link/otp are a
 *  one-time set-password handle to give the new user. */
export async function createPortalUser(payload) {
  return sbAdminUsers('create_user', payload)
}
/** Enable/disable a login (profile.active + auth ban). History is preserved. */
export async function setUserActive(userId, active) {
  return sbAdminUsers('set_active', { user_id: userId, active })
}
/** Change a login's portal role. */
export async function setUserRole(userId, role) {
  return sbAdminUsers('set_role', { user_id: userId, role })
}
/** Link (or unlink with null) a login to a portal_staff record. */
export async function linkUserStaff(userId, linkedStaffId) {
  return sbAdminUsers('link_staff', { user_id: userId, linked_staff_id: linkedStaffId || null })
}
/** Generate a one-time set-password link/OTP for an existing user (admin only). */
export async function generateSetPasswordLink({ userId, email, redirectTo }) {
  return sbAdminUsers('generate_set_password_link', { user_id: userId, email, redirectTo })
}
