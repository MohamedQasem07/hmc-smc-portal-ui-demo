/* =========================================================================
 * Portal field mapping — mock Case shape  →  hmc-medical public.portal_*
 * -----------------------------------------------------------------------
 * The field map AS CODE. Pure functions, no I/O. Used by the Supabase
 * backend (P3B) to translate the in-app case/billing shapes into row
 * inserts/upserts. Column names verified against migrations 001/004/005.
 *
 * Slug/name -> uuid lookups (locations, facilities, insurers, assistance)
 * are passed in by the caller (resolved from portal_locations /
 * portal_billing_facilities / portal_insurance_companies /
 * portal_local_assistance_companies) — this module never invents ids.
 * ========================================================================= */

// ---- enum value maps (frontend label -> portal enum) ----
export const FINANCIAL_TYPE_TO_PORTAL = {
  Pending: 'pending', Cash: 'cash', Insurance: 'insurance',
  'Free / Complimentary': 'free_complimentary',
}
export const ROUTE_TO_PORTAL = {
  direct: 'direct', to_al_kawther: 'transfer_to_al_kawther',
  to_sheraton: 'transfer_to_sheraton', transfer_other: 'transfer_other',
}
export const OP_STATUS_TO_PORTAL = { Open: 'open', Closed: 'closed' }
export const GENDER_TO_PORTAL = { Male: 'male', Female: 'female' }
export const ENCOUNTER_PATTERN_TO_PORTAL = {
  outpatient_single: 'outpatient_single', outpatient_multi: 'outpatient_multi',
  inpatient_admission: 'inpatient_admission',
}

// Frontend billingPrepStatus  <->  portal_insurance_billing_preparation_status.
// NOTE the value rename: 'ready_for_claude' -> 'ready_for_claude_invoice_preparation'.
export const BILLING_STATUS_TO_PORTAL = {
  awaiting_admin_completion: 'awaiting_admin_completion',
  ready_for_claude: 'ready_for_claude_invoice_preparation',
  future_integration: 'invoice_generated_future_placeholder',
  review_required: 'review_required',
  completed: 'completed',
}
export const BILLING_STATUS_FROM_PORTAL = Object.fromEntries(
  Object.entries(BILLING_STATUS_TO_PORTAL).map(([k, v]) => [v, k]),
)

export function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

/** mock case.patient  ->  portal_patients insert row (PHI). */
export function patientToRow(c) {
  const p = c.patient || {}
  return {
    ...splitName(p.name),
    date_of_birth: p.dob || null,           // age is NEVER stored (computed)
    gender: GENDER_TO_PORTAL[p.gender] || null,
    nationality: p.nationality || null,
    email: p.email || null,
    phone_number: p.phone || null,
  }
}

/** mock case  ->  portal_cases insert row. ids resolved by caller. */
export function caseToRow(c, ids = {}) {
  return {
    our_ref: c.ourRef || null,             // server (008) may (re)generate
    patient_id: ids.patientId,
    registered_location_id: ids.registeredLocationId,   // from c.registeredAtId slug
    current_location_id: ids.currentLocationId || ids.registeredLocationId,
    billing_facility_id: ids.billingFacilityId || null, // from c.billingFacility 'HMC'/'SMC'
    route: ROUTE_TO_PORTAL[c.route] || 'direct',
    financial_type: FINANCIAL_TYPE_TO_PORTAL[c.financialType] || 'pending',
    encounter_pattern: ENCOUNTER_PATTERN_TO_PORTAL[c.encounterPattern] || 'outpatient_single',
    operational_status: OP_STATUS_TO_PORTAL[c.operationalStatus] || 'open',
    visit_date: (c.visitDate || '').slice(0, 10) || null,
    hotel_or_location: c.patient?.hotel || null,
    short_clinical_note: c.patient?.note || c.notes || null,
  }
}

/**
 * mock case.insuranceCompletion  ->  portal_insurance_billing_preparations row.
 * The 4 fields marked NEW require an additive P3B migration (they do not yet
 * exist on the table — see docs/PORTAL_FIELD_MAP.md).
 */
export function billingPrepToRow(caseId, completion = {}, ids = {}) {
  return {
    case_id: caseId,
    invoice_currency: completion.invoiceCurrency || null,
    service_charge_pct: completion.serviceChargePct ?? null,
    local_assistance_company_id: ids.localAssistanceCompanyId || null, // from completion.localAssistanceId
    local_assistance_reference_number: completion.localAssistanceRef || null,
    billing_preparation_status:
      BILLING_STATUS_TO_PORTAL[completion.billingPrepStatus] || 'awaiting_admin_completion',
    admin_notes: completion.adminNotes || null,
    // ---- NEW (P3B additive migration required) ----
    transportation_fee: completion.transportationFee ?? null,
    patient_excess_amount: completion.patientExcess ?? null,
    onedrive_folder_path: completion.onedriveFolderPath || null,
    missing_data_note: completion.missingDataNote || null,
    // ---- written back by Claude after generating case.json + PDFs ----
    // future_invoice_json_reference, future_invoice_pdf_reference,
    // future_invoice_value, future_invoice_status
  }
}
