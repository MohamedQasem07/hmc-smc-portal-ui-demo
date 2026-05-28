/* =========================================================================
 * PORTAL-UX-P2C.R1 — Real Clinic Operations mock data (additive)
 * -----------------------------------------------------------------------
 * Sibling file to ./p2c.js. NEVER replaces it — extends the model with
 * the richer operational concepts Mohamed described in the R1 brief:
 *
 *   - Hotel + Hotel Room (where the patient is staying)
 *   - Internal Center Room 1–15 (where the patient is treated at a branch)
 *   - Multi-payment lines: Cash + Visa/Card (always EGP)
 *   - Patient Excess as a distinct collection type
 *   - Free / Complimentary financial type
 *   - Treatment Mode (Not Determined / Conservative / Surgical)
 *   - Nurse shifts + Doctor on Duty
 *   - Per-location, per-currency cash treasury balances
 *   - EGP Visa/Bank collection movements
 *   - Period handover statements
 *   - Expense entries (external clinics only)
 *
 * EVERY record is invented placeholder DEMO data. No real refs, no real
 * insurer names, no real prices. The string "DEMO" is preserved in every
 * patient name and ref. This file is consumed by the R1 screens only.
 * ========================================================================= */

const TODAY = new Date('2026-05-27T10:00:00')
const isoMins = (offset) => {
  const d = new Date(TODAY)
  d.setMinutes(d.getMinutes() + offset)
  return d.toISOString()
}
const isoDays = (offset, h = 9, m = 0) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// =====================================================================
// Extended vocabularies
// =====================================================================
export const R1_FINANCIAL_TYPES = ['Pending', 'Cash', 'Insurance', 'Free / Complimentary']

// Encounter Pattern — independent of Route / Financial Type / Treatment Mode
export const R1_ENCOUNTER_PATTERNS = [
  { code: 'outpatient_single',   label: 'Outpatient — Single Visit',           tone: 'navy', short: 'Single Visit' },
  { code: 'outpatient_multi',    label: 'Outpatient — Multiple Visits / Sessions', tone: 'teal', short: 'Multi-Session' },
  { code: 'inpatient_admission', label: 'Inpatient Admission',                  tone: 'mixed', short: 'Inpatient' },
]

export function encounterMeta(code) {
  return R1_ENCOUNTER_PATTERNS.find((p) => p.code === code) || null
}

/** Returns a short summary string suitable for a table cell. */
export function encounterSummary(c) {
  if (!c) return '—'
  if (c.encounterPattern === 'outpatient_single') {
    if (c.visit?.checkOutAt) return `Visit closed ${fmtTime(c.visit.checkOutAt)}`
    if (c.visit?.checkInAt)  return `Active visit · in ${fmtTime(c.visit.checkInAt)}`
    return 'Single Visit'
  }
  if (c.encounterPattern === 'outpatient_multi') {
    const list = c.sessions || []
    const completed = list.filter((s) => s.status === 'completed').length
    const active    = list.filter((s) => s.status === 'active').length
    return `${list.length} Session${list.length !== 1 ? 's' : ''} · ${completed} Completed · ${active} Active`
  }
  if (c.encounterPattern === 'inpatient_admission') {
    if (c.admission?.dischargedAt) {
      const h = hoursBetween(c.admission.admittedAt, c.admission.dischargedAt)
      return `Discharged · ${h.toFixed(1)}h`
    }
    if (c.admission?.admittedAt) {
      const h = hoursBetween(c.admission.admittedAt, new Date(TODAY).toISOString())
      return `Admitted · ${h.toFixed(1)}h so far`
    }
    return 'Inpatient'
  }
  return '—'
}

function hoursBetween(startIso, endIso) {
  if (!startIso) return 0
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : new Date(TODAY).getTime()
  return Math.max(0, (end - start) / 36e5)
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}


export const R1_TREATMENT_MODES = [
  { code: 'pending',      label: 'Not Determined Yet',      tone: 'pending' },
  { code: 'conservative', label: 'Conservative Treatment',  tone: 'teal' },
  { code: 'surgical',     label: 'Surgical Treatment',      tone: 'mixed' },
]

export const R1_PAYMENT_METHODS = ['Cash', 'Visa / Card', 'Bank Transfer']
export const R1_COLLECTION_TYPES = ['Invoice Payment', 'Patient Excess']
export const R1_CURRENCIES = ['EGP', 'EUR', 'USD', 'GBP']

// Country codes for phone prefix (demo subset)
export const R1_COUNTRY_CODES = [
  { code: '+20',  label: 'Egypt (+20)' },
  { code: '+44',  label: 'United Kingdom (+44)' },
  { code: '+49',  label: 'Germany (+49)' },
  { code: '+33',  label: 'France (+33)' },
  { code: '+31',  label: 'Netherlands (+31)' },
  { code: '+39',  label: 'Italy (+39)' },
  { code: '+34',  label: 'Spain (+34)' },
  { code: '+48',  label: 'Poland (+48)' },
  { code: '+420', label: 'Czechia (+420)' },
  { code: '+36',  label: 'Hungary (+36)' },
  { code: '+30',  label: 'Greece (+30)' },
  { code: '+46',  label: 'Sweden (+46)' },
  { code: '+32',  label: 'Belgium (+32)' },
]

// Common nationalities seen at the clinics (demo subset)
export const R1_NATIONALITIES = [
  'German', 'British', 'French', 'Dutch', 'Italian', 'Polish', 'Czech',
  'Hungarian', 'Belgian', 'Swedish', 'Greek', 'Spanish', 'Egyptian', 'Other',
]

// "Other Destination" — admin-configurable concept (mock list shown to user)
export const R1_OTHER_TRANSFER_DESTINATIONS = [
  'External Hospital (admin-configurable)',
  'Private Surgical Centre (admin-configurable)',
  'Patient Repatriation (admin-configurable)',
]

// =====================================================================
// Staff directories (DEMO)
// =====================================================================
export const R1_NURSES_BY_CLINIC = {
  tropitel:      [
    { id: 'n_trop_1', name: 'Demo Nurse Alia' },
    { id: 'n_trop_2', name: 'Demo Nurse Bahy' },
    { id: 'n_trop_3', name: 'Demo Nurse Carla' },
  ],
  romance:       [
    { id: 'n_rom_1',  name: 'Demo Nurse Rana' },
    { id: 'n_rom_2',  name: 'Demo Nurse Sami' },
  ],
  sahl_hasheesh: [
    { id: 'n_shc_1',  name: 'Demo Nurse Layla' },
    { id: 'n_shc_2',  name: 'Demo Nurse Mido' },
  ],
  mamsha:        [
    { id: 'n_mam_1',  name: 'Demo Nurse Hana' },
    { id: 'n_mam_2',  name: 'Demo Nurse Omar' },
  ],
  pharaoh:       [
    { id: 'n_pha_1',  name: 'Demo Nurse Kira' },
  ],
  menamark:      [
    { id: 'n_men_1',  name: 'Demo Nurse Tarek' },
    { id: 'n_men_2',  name: 'Demo Nurse Yara' },
  ],
  al_kawther:    [
    { id: 'n_kaw_1',  name: 'Demo Nurse Ahmed' },
    { id: 'n_kaw_2',  name: 'Demo Nurse Mariam' },
    { id: 'n_kaw_3',  name: 'Demo Nurse Nour' },
  ],
  sheraton:      [
    { id: 'n_sher_1', name: 'Demo Nurse Hala' },
    { id: 'n_sher_2', name: 'Demo Nurse Ziad' },
  ],
}

export const R1_DOCTORS_BY_CLINIC = {
  tropitel:      [{ id: 'd_trop_1', name: 'Dr. Demo Physician 1' }, { id: 'd_trop_2', name: 'Dr. Demo Physician 2' }],
  romance:       [{ id: 'd_rom_1',  name: 'Dr. Demo Physician 3' }],
  sahl_hasheesh: [{ id: 'd_shc_1',  name: 'Dr. Demo Physician 4' }, { id: 'd_shc_2', name: 'Dr. Demo Physician 5' }],
  mamsha:        [{ id: 'd_mam_1',  name: 'Dr. Demo Physician 6' }],
  pharaoh:       [{ id: 'd_pha_1',  name: 'Dr. Demo Physician 7' }],
  menamark:      [{ id: 'd_men_1',  name: 'Dr. Demo Physician 8' }],
  al_kawther:    [{ id: 'd_kaw_1',  name: 'Dr. Demo Surgeon 1' }, { id: 'd_kaw_2', name: 'Dr. Demo Internist 1' }, { id: 'd_kaw_3', name: 'Dr. Demo Pediatrician 1' }],
  sheraton:      [{ id: 'd_sher_1', name: 'Dr. Demo Surgeon 2' }, { id: 'd_sher_2', name: 'Dr. Demo Internist 2' }],
}

// =====================================================================
// Attendance — mock nurse shifts + doctor on duty today
// =====================================================================
// Active shifts (endedAt: null) and closed shifts in the same day
export const R1_NURSE_SHIFTS = [
  // Tropitel — two nurses on shift today, one closed earlier
  { id: 'sh_001', clinicId: 'tropitel',   nurseId: 'n_trop_1', startedAt: isoDays(0, 10, 0), endedAt: null,                status: 'active' },
  { id: 'sh_002', clinicId: 'tropitel',   nurseId: 'n_trop_2', startedAt: isoDays(0, 14, 0), endedAt: null,                status: 'active' },
  { id: 'sh_003', clinicId: 'tropitel',   nurseId: 'n_trop_3', startedAt: isoDays(-1, 8, 0), endedAt: isoDays(-1, 16, 0),  status: 'closed' },
  // Romance
  { id: 'sh_010', clinicId: 'romance',    nurseId: 'n_rom_1',  startedAt: isoDays(0, 9, 0),  endedAt: null,                status: 'active' },
  // Sahl Hasheesh
  { id: 'sh_020', clinicId: 'sahl_hasheesh', nurseId: 'n_shc_1', startedAt: isoDays(0, 8, 0), endedAt: null,               status: 'active' },
  { id: 'sh_021', clinicId: 'sahl_hasheesh', nurseId: 'n_shc_2', startedAt: isoDays(0, 14, 0), endedAt: null,              status: 'active' },
  // Al-Kawther — branch attendance
  { id: 'sh_100', clinicId: 'al_kawther', nurseId: 'n_kaw_1',  startedAt: isoDays(0, 7, 0),  endedAt: null,                status: 'active' },
  { id: 'sh_101', clinicId: 'al_kawther', nurseId: 'n_kaw_2',  startedAt: isoDays(0, 15, 0), endedAt: null,                status: 'active' },
  { id: 'sh_102', clinicId: 'al_kawther', nurseId: 'n_kaw_3',  startedAt: isoDays(-1, 7, 0), endedAt: isoDays(-1, 15, 0),  status: 'closed' },
  // Sheraton
  { id: 'sh_200', clinicId: 'sheraton',   nurseId: 'n_sher_1', startedAt: isoDays(0, 8, 0),  endedAt: null,                status: 'active' },
]

export const R1_DOCTOR_ON_DUTY = {
  tropitel:      { date: '2026-05-27', doctorId: 'd_trop_1' },
  romance:       { date: '2026-05-27', doctorId: 'd_rom_1' },
  sahl_hasheesh: { date: '2026-05-27', doctorId: 'd_shc_1' },
  mamsha:        { date: '2026-05-27', doctorId: 'd_mam_1' },
  pharaoh:       { date: '2026-05-27', doctorId: 'd_pha_1' },
  menamark:      { date: '2026-05-27', doctorId: 'd_men_1' },
  al_kawther:    { date: '2026-05-27', doctorId: 'd_kaw_1' },
  sheraton:      { date: '2026-05-27', doctorId: 'd_sher_2' },
}

// =====================================================================
// Branch room board — Rooms 1..15 per branch (treatment / admission rooms)
// Each room either Available or Occupied by a caseId (R1_CASES).
// =====================================================================
function buildRoomBoard(branchId, occupancy) {
  const out = []
  for (let i = 1; i <= 15; i++) {
    const occ = occupancy[i]
    out.push({
      branchId,
      number: i,
      label: `Room ${String(i).padStart(2, '0')}`,
      caseId: occ?.caseId || null,
      occupant: occ?.occupant || null,
      status: occ ? 'occupied' : 'available',
    })
  }
  return out
}

export const R1_ROOM_BOARD = {
  al_kawther: buildRoomBoard('al_kawther', {
    3:  { caseId: 'r1_p2c_003' },
    7:  { caseId: 'r1_p2c_004' },
    9:  { caseId: 'r1_p2c_007' },
    10: { caseId: 'r1_p2c_005' },
    12: { caseId: 'r1_p2c_006' },
  }),
  sheraton: buildRoomBoard('sheraton', {
    2:  { caseId: 'r1_p2c_201' },
    5:  { caseId: 'r1_p2c_203' },
    8:  { caseId: 'r1_p2c_204' },
  }),
}

// =====================================================================
// Cases — extended R1 shape: hotel + hotelRoom, paymentLines, excess,
// treatmentMode, centerRoomNumber for branch-assigned rooms.
// =====================================================================
function r1Case(o) {
  // Default encounter pattern derived from existing shape if not supplied
  let encounterPattern = o.encounterPattern
  let visit = o.visit ?? null
  let sessions = o.sessions ?? []
  let admission = o.admission ?? null
  if (!encounterPattern) {
    if (o.centerRoomNumber && (o.treatmentMode === 'surgical' || o.treatmentMode === 'conservative')) {
      encounterPattern = 'inpatient_admission'
      admission = admission ?? { admittedAt: o.visitDate, dischargedAt: null, status: 'admitted' }
    } else {
      encounterPattern = 'outpatient_single'
      visit = visit ?? {
        checkInAt: o.visitDate,
        checkOutAt: o.operationalStatus === 'Closed' ? o.visitDate : null,
        status: o.operationalStatus === 'Closed' ? 'completed' : 'active',
      }
    }
  }
  return {
    paymentLines:    [],
    excessLines:     [],
    treatmentMode:   null,
    centerRoomNumber: null,
    excessAmount:    null,
    excessCurrency:  null,
    hasPatientExcess: false,
    encounterPattern,
    visit,
    sessions,
    admission,
    ...o,
  }
}

export const R1_CASES = [
  // ----- Tropitel direct cases -----
  r1Case({
    id: 'r1_p2c_001',
    ourRef: 'DEMO-P2C-R1-1001',
    registeredAtId: 'tropitel',
    registeredAtName: 'Tropitel Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 9, 5),
    patient: {
      firstName: 'Demo', lastName: 'Patient Alpha', name: 'Demo Patient Alpha',
      gender: 'Male', age: 41, dob: '12.04.1985', nationality: 'German',
      hotel: 'Tropitel Sahl Hasheesh', hotelRoom: '317',
      address: 'Tropitel Sahl Hasheesh — Room 317', postal: '84511',
      phoneCode: '+49', phone: '17612345678', email: 'demo.alpha@example.com',
      note: 'Sunburn, mild dehydration — quick consult.',
    },
    route: 'direct',
    routeLabel: 'Direct at Tropitel Clinic',
    financialType: 'Cash',
    invoice: { number: 'DEMO-CASH-1001', amount: 200, currency: 'EUR' },
    paymentLines: [
      { id: 'pl_001a', type: 'Invoice Payment', method: 'Cash',         currency: 'EUR', amount: 100,    note: '' },
      { id: 'pl_001b', type: 'Invoice Payment', method: 'Visa / Card',  currency: 'EGP', amount: 6200,   note: 'Foreign EUR 100 at FX 62.00 EGP/EUR', fxRefAmount: 100, fxRefCurrency: 'EUR', fxRate: 62.00 },
    ],
    settlement: 'Paid',
    transfer: null,
    billingFacility: null,
    insurance: null,
    treatmentMode: null,
    centerRoomNumber: null,
    operationalStatus: 'Closed',
    notes: 'Demonstrates mixed cash + Visa/EGP payment lines.',
  }),
  r1Case({
    id: 'r1_p2c_002',
    ourRef: 'DEMO-P2C-R1-1002',
    registeredAtId: 'tropitel',
    registeredAtName: 'Tropitel Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 10, 30),
    patient: {
      firstName: 'Demo', lastName: 'Patient Beta', name: 'Demo Patient Beta',
      gender: 'Female', age: 28, dob: '03.11.1998', nationality: 'British',
      hotel: 'Tropitel Sahl Hasheesh', hotelRoom: '208',
      address: 'Tropitel Sahl Hasheesh — Room 208', postal: '84511',
      phoneCode: '+44', phone: '7700900123', email: 'demo.beta@example.com',
      note: 'Acute gastroenteritis — needs labs + IV.',
    },
    route: 'direct',
    routeLabel: 'Direct at Tropitel Clinic',
    financialType: 'Insurance',
    billingFacility: 'SMC',
    insurance: {
      company: 'Demo Allianz Worldwide Care', ref: 'ALZ-DEMO-R1-7741',
      email: 'claims@demo-allianz.example',
    },
    hasPatientExcess: true,
    excessAmount: 100,
    excessCurrency: 'EUR',
    excessLines: [
      { id: 'el_002a', type: 'Patient Excess', method: 'Cash',        currency: 'EUR', amount: 50,   note: '' },
      { id: 'el_002b', type: 'Patient Excess', method: 'Visa / Card', currency: 'EGP', amount: 3100, note: 'Foreign EUR 50 at FX 62.00 EGP/EUR', fxRefAmount: 50, fxRefCurrency: 'EUR', fxRate: 62.00 },
    ],
    invoice: null,
    paymentLines: [],
    settlement: 'Paid',
    transfer: null,
    treatmentMode: null,
    centerRoomNumber: null,
    operationalStatus: 'Open',
    notes: 'Mohamed instructed: open under SMC. Patient Excess EUR 100 collected mixed.',
    encounterPattern: 'outpatient_multi',
    sessions: [
      { id: 'ses_002_1', date: isoDays(0, 10, 30), checkInAt: isoDays(0, 10, 30), checkOutAt: isoDays(0, 12, 45), status: 'completed', note: 'Session 1 — IV fluids + anti-emetic' },
      { id: 'ses_002_2', date: isoDays(0, 16, 0),  checkInAt: isoDays(0, 16, 0),  checkOutAt: null,                status: 'active',    note: 'Session 2 — repeat IV' },
    ],
  }),
  // ----- Tropitel — Pending transfer to Al-Kawther (not yet received) -----
  r1Case({
    id: 'r1_p2c_003',
    ourRef: 'DEMO-P2C-R1-1003',
    registeredAtId: 'tropitel',
    registeredAtName: 'Tropitel Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 8, 10),
    patient: {
      firstName: 'Demo', lastName: 'Patient Gamma', name: 'Demo Patient Gamma',
      gender: 'Male', age: 62, dob: '21.07.1963', nationality: 'Czech',
      hotel: 'Tropitel Sahl Hasheesh', hotelRoom: '405',
      address: 'Tropitel Sahl Hasheesh — Room 405', postal: '84511',
      phoneCode: '+420', phone: '601234567', email: 'demo.gamma@example.com',
      note: 'Suspected ankle fracture — sent for imaging + ortho.',
    },
    route: 'to_al_kawther',
    routeLabel: 'Transfer to Al-Kawther Branch',
    financialType: 'Pending',
    billingFacility: null,
    insurance: null,
    invoice: null,
    paymentLines: [],
    settlement: null,
    transfer: {
      toBranchId: 'al_kawther',
      toBranchName: 'Al-Kawther Branch',
      reason: 'Suspected ankle fracture — needs imaging + ortho assessment.',
      transport: 'Ambulance',
      referralNote: 'Possible surgical intervention if fracture confirmed.',
      sentAt: isoDays(0, 8, 25),
      receivedAt: isoDays(0, 9, 10),
      status: 'Received',
    },
    treatmentMode: 'pending',
    centerRoomNumber: 3,                  // Al-Kawther Room 3 assigned
    operationalStatus: 'Open',
    notes: 'Awaiting classification at Al-Kawther.',
  }),
  // ----- Romance — Insurance + HMC, sent to Al-Kawther, surgical -----
  r1Case({
    id: 'r1_p2c_004',
    ourRef: 'DEMO-P2C-R1-1004',
    registeredAtId: 'romance',
    registeredAtName: 'Romance Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 8, 50),
    patient: {
      firstName: 'Demo', lastName: 'Patient Delta', name: 'Demo Patient Delta',
      gender: 'Female', age: 35, dob: '02.02.1990', nationality: 'Polish',
      hotel: 'Romance Hurghada Hotel', hotelRoom: '206',
      address: 'Romance Hurghada Hotel — Room 206', postal: '84512',
      phoneCode: '+48', phone: '601112233', email: 'demo.delta@example.com',
      note: 'Acute appendicitis — needs surgical admission.',
    },
    route: 'to_al_kawther',
    routeLabel: 'Transfer to Al-Kawther Branch',
    financialType: 'Insurance',
    billingFacility: 'HMC',
    insurance: {
      company: 'Demo Allianz Worldwide Care', ref: 'ALZ-DEMO-R1-5512',
      email: 'claims@demo-allianz.example',
    },
    hasPatientExcess: false,
    excessLines: [],
    invoice: null,
    paymentLines: [],
    settlement: null,
    transfer: {
      toBranchId: 'al_kawther',
      toBranchName: 'Al-Kawther Branch',
      reason: 'Acute appendicitis — surgical assessment required.',
      transport: 'Ambulance',
      referralNote: 'Suspected surgery — please prepare OR.',
      sentAt: isoDays(0, 9, 10),
      receivedAt: isoDays(0, 9, 45),
      status: 'Financial Type Confirmed',
    },
    treatmentMode: 'surgical',
    centerRoomNumber: 7,
    operationalStatus: 'Open',
    notes: 'HMC preserved through transfer per Mohamed.',
    encounterPattern: 'inpatient_admission',
    admission: { admittedAt: isoDays(0, 9, 45), dischargedAt: null, status: 'admitted' },
  }),
  // ----- Mamsha → Al-Kawther — Cash transferred + already collected -----
  r1Case({
    id: 'r1_p2c_005',
    ourRef: 'DEMO-P2C-R1-1005',
    registeredAtId: 'mamsha',
    registeredAtName: 'Mamsha Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 11, 30),
    patient: {
      firstName: 'Demo', lastName: 'Patient Delta-Cash', name: 'Demo Patient Delta-Cash',
      gender: 'Male', age: 47, dob: '15.05.1978', nationality: 'French',
      hotel: 'Mamsha Promenade', hotelRoom: '512',
      address: 'Mamsha Promenade — Room 512', postal: '84511',
      phoneCode: '+33', phone: '612345678', email: 'demo.deltacash@example.com',
      note: 'Severe migraine + IV — wants conservative treatment.',
    },
    route: 'to_al_kawther',
    routeLabel: 'Transfer to Al-Kawther Branch',
    financialType: 'Cash',
    invoice: { number: 'DEMO-CASH-1005', amount: 350, currency: 'EUR' },
    paymentLines: [
      { id: 'pl_005a', type: 'Invoice Payment', method: 'Cash',        currency: 'EUR', amount: 200, note: '' },
      { id: 'pl_005b', type: 'Invoice Payment', method: 'Visa / Card', currency: 'EGP', amount: 9300, note: 'Foreign EUR 150 at FX 62.00 EGP/EUR', fxRefAmount: 150, fxRefCurrency: 'EUR', fxRate: 62.00 },
    ],
    settlement: 'Paid',
    billingFacility: null,
    insurance: null,
    transfer: {
      toBranchId: 'al_kawther',
      toBranchName: 'Al-Kawther Branch',
      reason: 'Severe migraine — needs IV + monitoring.',
      transport: 'Patient Own Transport',
      referralNote: '',
      sentAt: isoDays(0, 11, 45),
      receivedAt: isoDays(0, 12, 10),
      status: 'Financial Type Confirmed',
    },
    treatmentMode: 'conservative',
    centerRoomNumber: 10,
    operationalStatus: 'Open',
    notes: 'Pre-paid at Mamsha. Treated conservatively at Al-Kawther.',
  }),
  // ----- Al-Kawther direct walk-in Insurance/SMC + Excess -----
  r1Case({
    id: 'r1_p2c_006',
    ourRef: 'DEMO-P2C-R1-2001',
    registeredAtId: 'al_kawther',
    registeredAtName: 'Al-Kawther Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(0, 10, 5),
    patient: {
      firstName: 'Demo', lastName: 'Patient Eta', name: 'Demo Patient Eta',
      gender: 'Female', age: 56, dob: '08.10.1969', nationality: 'Italian',
      hotel: 'Steigenberger Al Dau', hotelRoom: '418',
      address: 'Steigenberger Al Dau — Room 418', postal: '84513',
      phoneCode: '+39', phone: '3331234567', email: 'demo.eta@example.com',
      note: 'Diabetes complication — observation + IV. Conservative plan.',
    },
    route: 'direct',
    routeLabel: 'Direct at Al-Kawther Branch',
    financialType: 'Insurance',
    billingFacility: 'SMC',
    insurance: {
      company: 'Demo Europ Assistance', ref: 'EUR-DEMO-R1-9921',
      email: 'claims@demo-europassist.example',
    },
    hasPatientExcess: true,
    excessAmount: 80,
    excessCurrency: 'EUR',
    excessLines: [
      { id: 'el_006a', type: 'Patient Excess', method: 'Cash', currency: 'EUR', amount: 80, note: '' },
    ],
    invoice: null,
    paymentLines: [],
    settlement: 'Paid',
    transfer: null,
    treatmentMode: 'conservative',
    centerRoomNumber: 12,
    operationalStatus: 'Open',
    notes: 'Patient Excess EUR 80 collected in cash at reception.',
  }),
  // ----- Al-Kawther direct walk-in cash surgical -----
  r1Case({
    id: 'r1_p2c_007',
    ourRef: 'DEMO-P2C-R1-2002',
    registeredAtId: 'al_kawther',
    registeredAtName: 'Al-Kawther Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(0, 12, 0),
    patient: {
      firstName: 'Demo', lastName: 'Patient Theta', name: 'Demo Patient Theta',
      gender: 'Male', age: 49, dob: '23.06.1976', nationality: 'Dutch',
      hotel: 'Sahl Hasheesh Palm Royale', hotelRoom: '702',
      address: 'Sahl Hasheesh Palm Royale — Room 702', postal: '84511',
      phoneCode: '+31', phone: '612345678', email: 'demo.theta@example.com',
      note: 'Acute abdomen — surgical exploration likely.',
    },
    route: 'direct',
    routeLabel: 'Direct at Al-Kawther Branch',
    financialType: 'Cash',
    invoice: { number: 'DEMO-CASH-2002', amount: 1800, currency: 'EUR' },
    paymentLines: [
      { id: 'pl_007a', type: 'Invoice Payment', method: 'Cash',        currency: 'EUR', amount: 1000,  note: '' },
      { id: 'pl_007b', type: 'Invoice Payment', method: 'Visa / Card', currency: 'EGP', amount: 24800, note: 'Foreign EUR 400 at FX 62.00 EGP/EUR', fxRefAmount: 400, fxRefCurrency: 'EUR', fxRate: 62.00 },
    ],
    settlement: 'Partially Paid',
    billingFacility: null,
    insurance: null,
    transfer: null,
    treatmentMode: 'surgical',
    centerRoomNumber: 9,
    operationalStatus: 'Open',
    notes: 'Outstanding EUR 400 — patient agreed to settle post-op.',
    encounterPattern: 'inpatient_admission',
    admission: { admittedAt: isoDays(0, 12, 0), dischargedAt: null, status: 'admitted' },
  }),
  // ----- Romance Direct Free / Complimentary -----
  r1Case({
    id: 'r1_p2c_008',
    ourRef: 'DEMO-P2C-R1-1006',
    registeredAtId: 'romance',
    registeredAtName: 'Romance Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 13, 15),
    patient: {
      firstName: 'Demo', lastName: 'Patient Free', name: 'Demo Patient Free',
      gender: 'Female', age: 8, dob: '01.01.2018', nationality: 'Egyptian',
      hotel: 'Staff Family Member', hotelRoom: '—',
      address: 'Staff Quarters', postal: '',
      phoneCode: '+20', phone: '1001234567', email: '',
      note: 'Staff family — minor consult, courtesy waiver.',
    },
    route: 'direct',
    routeLabel: 'Direct at Romance Clinic',
    financialType: 'Free / Complimentary',
    complimentary: { reason: 'Staff family member courtesy', approvedBy: 'Mohamed (verbal)' },
    invoice: null,
    paymentLines: [],
    settlement: null,
    billingFacility: null,
    insurance: null,
    transfer: null,
    treatmentMode: null,
    centerRoomNumber: null,
    operationalStatus: 'Closed',
    notes: '',
  }),
  // ----- Sheraton direct walk-in cash conservative -----
  r1Case({
    id: 'r1_p2c_201',
    ourRef: 'DEMO-P2C-R1-3001',
    registeredAtId: 'sheraton',
    registeredAtName: 'Sheraton Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(0, 11, 10),
    patient: {
      firstName: 'Demo', lastName: 'Patient Iota', name: 'Demo Patient Iota',
      gender: 'Female', age: 24, dob: '12.03.2001', nationality: 'Swedish',
      hotel: 'Sheraton Soma Bay', hotelRoom: '212',
      address: 'Sheraton Soma Bay — Room 212', postal: '84514',
      phoneCode: '+46', phone: '701234567', email: 'demo.iota@example.com',
      note: 'Wound check + dressing change.',
    },
    route: 'direct',
    routeLabel: 'Direct at Sheraton Branch',
    financialType: 'Cash',
    invoice: { number: 'DEMO-CASH-3001', amount: 90, currency: 'EUR' },
    paymentLines: [
      { id: 'pl_201a', type: 'Invoice Payment', method: 'Cash', currency: 'EUR', amount: 90, note: '' },
    ],
    settlement: 'Paid',
    billingFacility: null,
    insurance: null,
    transfer: null,
    treatmentMode: 'conservative',
    centerRoomNumber: 2,
    operationalStatus: 'Open',
    notes: '',
  }),
  // ----- Pharaoh → Sheraton, pending receipt -----
  r1Case({
    id: 'r1_p2c_202',
    ourRef: 'DEMO-P2C-R1-3002',
    registeredAtId: 'pharaoh',
    registeredAtName: 'Pharaoh Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 7, 45),
    patient: {
      firstName: 'Demo', lastName: 'Patient Kappa', name: 'Demo Patient Kappa',
      gender: 'Female', age: 67, dob: '04.04.1958', nationality: 'Czech',
      hotel: 'Pharaoh Azur Resort', hotelRoom: '614',
      address: 'Pharaoh Azur Resort — Room 614', postal: '84512',
      phoneCode: '+420', phone: '602345678', email: 'demo.kappa@example.com',
      note: 'Possible appendicitis — for surgical assessment.',
    },
    route: 'to_sheraton',
    routeLabel: 'Transfer to Sheraton Branch',
    financialType: 'Pending',
    billingFacility: null,
    insurance: null,
    invoice: null,
    paymentLines: [],
    settlement: null,
    transfer: {
      toBranchId: 'sheraton',
      toBranchName: 'Sheraton Branch',
      reason: 'Possible appendicitis — needs surgical assessment.',
      transport: 'Ambulance',
      referralNote: 'Suspected surgery — please assess.',
      sentAt: isoDays(0, 8, 0),
      receivedAt: null,
      status: 'Sent',
    },
    treatmentMode: 'pending',
    centerRoomNumber: null,
    operationalStatus: 'Open',
    notes: 'Awaiting receipt at Sheraton.',
  }),
  // ----- Menamark → Sheraton, classified Insurance/HMC + surgical, room 5 -----
  r1Case({
    id: 'r1_p2c_203',
    ourRef: 'DEMO-P2C-R1-3003',
    registeredAtId: 'menamark',
    registeredAtName: 'Menamark Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(-1, 18, 5),
    patient: {
      firstName: 'Demo', lastName: 'Patient Lambda', name: 'Demo Patient Lambda',
      gender: 'Male', age: 58, dob: '14.09.1967', nationality: 'British',
      hotel: 'Menamark Resort', hotelRoom: '108',
      address: 'Menamark Resort — Room 108', postal: '84512',
      phoneCode: '+44', phone: '7711445566', email: 'demo.lambda@example.com',
      note: 'Chest pain — cardiology workup; admitted overnight.',
    },
    route: 'to_sheraton',
    routeLabel: 'Transfer to Sheraton Branch',
    financialType: 'Insurance',
    billingFacility: 'HMC',
    insurance: { company: 'Demo Bupa', ref: 'BUPA-DEMO-R1-2042', email: 'claims@demo-bupa.example' },
    hasPatientExcess: false,
    excessLines: [],
    invoice: null,
    paymentLines: [],
    settlement: null,
    transfer: {
      toBranchId: 'sheraton',
      toBranchName: 'Sheraton Branch',
      reason: 'Chest pain — cardiology workup required.',
      transport: 'Ambulance',
      referralNote: 'Suspected cardiac event — full workup.',
      sentAt: isoDays(-1, 18, 15),
      receivedAt: isoDays(-1, 19, 0),
      status: 'Financial Type Confirmed',
    },
    treatmentMode: 'surgical',
    centerRoomNumber: 5,
    operationalStatus: 'Open',
    notes: 'HMC preserved through transfer.',
  }),
  // ----- External Pharaoh — direct conservative IV outpatient -----
  r1Case({
    id: 'r1_p2c_204',
    ourRef: 'DEMO-P2C-R1-3004',
    registeredAtId: 'pharaoh',
    registeredAtName: 'Pharaoh Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 14, 0),
    patient: {
      firstName: 'Demo', lastName: 'Patient Mu', name: 'Demo Patient Mu',
      gender: 'Female', age: 38, dob: '19.08.1987', nationality: 'Belgian',
      hotel: 'Pharaoh Azur Resort', hotelRoom: '302',
      address: 'Pharaoh Azur Resort — Room 302', postal: '84512',
      phoneCode: '+32', phone: '470123456', email: 'demo.mu@example.com',
      note: 'Allergic reaction — observation in Pharaoh clinic.',
    },
    route: 'direct',
    routeLabel: 'Direct at Pharaoh Clinic',
    financialType: 'Cash',
    invoice: { number: 'DEMO-CASH-3004', amount: 120, currency: 'EUR' },
    paymentLines: [
      { id: 'pl_204a', type: 'Invoice Payment', method: 'Cash', currency: 'EUR', amount: 120, note: '' },
    ],
    settlement: 'Paid',
    billingFacility: null,
    insurance: null,
    transfer: null,
    treatmentMode: null,
    centerRoomNumber: null,
    operationalStatus: 'Closed',
    notes: '',
  }),
]

// =====================================================================
// Treasury balances — per location, per currency. Mock cumulative snapshot.
//
// Each entry holds:
//   cashInvoiceCollections  — sum of Cash invoice payment lines in that currency
//   patientExcessCollections — sum of Patient Excess lines in that currency
//   expenses                — recorded expenses (external clinics only)
//   handedOver              — cumulative handed over in prior periods
//   net                     — current available to hand over = collections + excess − expenses − handedOver
//
// Visa/Bank EGP balances are tracked separately.
// =====================================================================
export const R1_CASH_TREASURY = {
  tropitel: {
    EGP: { cashInvoiceCollections: 1000, patientExcessCollections: 200, expenses: 150, handedOver: 500, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    EUR: { cashInvoiceCollections: 200,  patientExcessCollections: 100, expenses: 50,  handedOver: 0,   get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    USD: { cashInvoiceCollections: 0,    patientExcessCollections: 0,   expenses: 0,   handedOver: 0,   get net() { return 0 } },
    GBP: { cashInvoiceCollections: 0,    patientExcessCollections: 0,   expenses: 0,   handedOver: 0,   get net() { return 0 } },
  },
  romance: {
    EGP: { cashInvoiceCollections: 600,  patientExcessCollections: 0,   expenses: 100, handedOver: 0,   get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    EUR: { cashInvoiceCollections: 380,  patientExcessCollections: 0,   expenses: 0,   handedOver: 0,   get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    USD: { cashInvoiceCollections: 0,    patientExcessCollections: 0,   expenses: 0,   handedOver: 0,   get net() { return 0 } },
    GBP: { cashInvoiceCollections: 0,    patientExcessCollections: 0,   expenses: 0,   handedOver: 0,   get net() { return 0 } },
  },
  al_kawther: {
    EGP: { cashInvoiceCollections: 24800, patientExcessCollections: 0,  expenses: 0, handedOver: 10000, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.handedOver } },
    EUR: { cashInvoiceCollections: 1000,  patientExcessCollections: 80, expenses: 0, handedOver: 500,   get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.handedOver } },
    USD: { cashInvoiceCollections: 0,     patientExcessCollections: 0,  expenses: 0, handedOver: 0,     get net() { return 0 } },
    GBP: { cashInvoiceCollections: 0,     patientExcessCollections: 0,  expenses: 0, handedOver: 0,     get net() { return 0 } },
  },
  sheraton: {
    EGP: { cashInvoiceCollections: 0,    patientExcessCollections: 0,  expenses: 0, handedOver: 0, get net() { return 0 } },
    EUR: { cashInvoiceCollections: 90,   patientExcessCollections: 0,  expenses: 0, handedOver: 0, get net() { return 90 } },
    USD: { cashInvoiceCollections: 0,    patientExcessCollections: 0,  expenses: 0, handedOver: 0, get net() { return 0 } },
    GBP: { cashInvoiceCollections: 0,    patientExcessCollections: 0,  expenses: 0, handedOver: 0, get net() { return 0 } },
  },
}

// EGP-only Visa/Bank movements per location
export const R1_VISA_BANK = {
  tropitel:   { totalMovements: 6200, movementsCount: 1, confirmedInHandover: 3000, get pending() { return this.totalMovements - this.confirmedInHandover } },
  romance:    { totalMovements: 0,    movementsCount: 0, confirmedInHandover: 0,    get pending() { return 0 } },
  al_kawther: { totalMovements: 34100, movementsCount: 3, confirmedInHandover: 20000, get pending() { return this.totalMovements - this.confirmedInHandover } },
  sheraton:   { totalMovements: 0,    movementsCount: 0, confirmedInHandover: 0,    get pending() { return 0 } },
}

// Recent expense entries (external clinics only)
export const R1_EXPENSE_ENTRIES = [
  { id: 'ex_001', clinicId: 'tropitel', at: isoDays(0, 9, 30),  currency: 'EGP', amount: 80,  category: 'Cleaning Supplies', note: 'DEMO — local stationery + cleaning', paidFrom: 'Physical Cash Balance' },
  { id: 'ex_002', clinicId: 'tropitel', at: isoDays(0, 11, 0),  currency: 'EGP', amount: 70,  category: 'Petty Cash', note: 'DEMO — courier fee', paidFrom: 'Physical Cash Balance' },
  { id: 'ex_003', clinicId: 'tropitel', at: isoDays(0, 13, 15), currency: 'EUR', amount: 50,  category: 'Pharmacy Replenishment', note: 'DEMO — small supplies', paidFrom: 'Physical Cash Balance' },
  { id: 'ex_004', clinicId: 'romance',  at: isoDays(0, 10, 45), currency: 'EGP', amount: 100, category: 'Cleaning Supplies', note: 'DEMO', paidFrom: 'Physical Cash Balance' },
]

// Open + recent closed handover periods, per location
export const R1_HANDOVERS = [
  // Tropitel — open morning shift
  {
    id: 'ho_001', locationId: 'tropitel', locationName: 'Tropitel Clinic',
    periodFrom: isoDays(0, 7, 0), periodTo: null,
    handedOverBy: 'Demo Nurse Alia', receivedBy: 'Demo Supervisor',
    status: 'Draft',
    notes: 'DEMO — open shift.',
    rows: [
      { type: 'Cash',        currency: 'EGP', collections: 1000, excess: 200, expenses: -150, netBook: 1050, actualDelivered: 1050, difference: 0 },
      { type: 'Cash',        currency: 'EUR', collections: 200,  excess: 100, expenses: -50,  netBook: 250,  actualDelivered: 250,  difference: 0 },
      { type: 'Visa / Bank', currency: 'EGP', collections: 6200, excess: 0,   expenses: null, netBook: 6200, actualDelivered: 6200, difference: 0 },
    ],
  },
  // Tropitel — yesterday closed
  {
    id: 'ho_002', locationId: 'tropitel', locationName: 'Tropitel Clinic',
    periodFrom: isoDays(-1, 7, 0), periodTo: isoDays(-1, 19, 0),
    handedOverBy: 'Demo Nurse Carla', receivedBy: 'Demo Supervisor',
    status: 'Closed',
    notes: 'DEMO — closed prior shift.',
    rows: [
      { type: 'Cash',        currency: 'EGP', collections: 500,  excess: 0, expenses: -50, netBook: 450, actualDelivered: 450, difference: 0 },
      { type: 'Cash',        currency: 'EUR', collections: 100,  excess: 0, expenses: 0,   netBook: 100, actualDelivered: 100, difference: 0 },
      { type: 'Visa / Bank', currency: 'EGP', collections: 3000, excess: 0, expenses: null,netBook: 3000, actualDelivered: 3000, difference: 0 },
    ],
  },
  // Al-Kawther — open
  {
    id: 'ho_010', locationId: 'al_kawther', locationName: 'Al-Kawther Branch',
    periodFrom: isoDays(0, 7, 0), periodTo: null,
    handedOverBy: 'Demo Reception — Al-Kawther', receivedBy: 'Demo Branch Accountant',
    status: 'Draft',
    notes: 'DEMO — branch open period.',
    rows: [
      { type: 'Cash',        currency: 'EGP', collections: 24800, excess: 0,  expenses: null, netBook: 24800, actualDelivered: 24800, difference: 0 },
      { type: 'Cash',        currency: 'EUR', collections: 1000,  excess: 80, expenses: null, netBook: 1080,  actualDelivered: 1080,  difference: 0 },
      { type: 'Visa / Bank', currency: 'EGP', collections: 34100, excess: 0,  expenses: null, netBook: 34100, actualDelivered: 34100, difference: 0 },
    ],
  },
  // Al-Kawther — yesterday closed
  {
    id: 'ho_011', locationId: 'al_kawther', locationName: 'Al-Kawther Branch',
    periodFrom: isoDays(-1, 7, 0), periodTo: isoDays(-1, 19, 0),
    handedOverBy: 'Demo Reception — Al-Kawther', receivedBy: 'Demo Branch Accountant',
    status: 'Closed',
    notes: '',
    rows: [
      { type: 'Cash',        currency: 'EGP', collections: 10000, excess: 0, expenses: null, netBook: 10000, actualDelivered: 10000, difference: 0 },
      { type: 'Cash',        currency: 'EUR', collections: 500,   excess: 0, expenses: null, netBook: 500,   actualDelivered: 500,   difference: 0 },
      { type: 'Visa / Bank', currency: 'EGP', collections: 20000, excess: 0, expenses: null, netBook: 20000, actualDelivered: 20000, difference: 0 },
    ],
  },
]

// =====================================================================
// Selectors
// =====================================================================
export function r1CasesForClinic(clinicId) {
  return R1_CASES.filter((c) => c.registeredAtId === clinicId)
}

export function r1CasesForBranch(branchId) {
  return R1_CASES.filter((c) =>
    c.registeredAtId === branchId ||
    (c.transfer && c.transfer.toBranchId === branchId),
  )
}

export function r1IncomingTransfersAt(branchId, { includeReceived = true } = {}) {
  return R1_CASES.filter((c) => {
    if (!c.transfer || c.transfer.toBranchId !== branchId) return false
    if (!includeReceived && c.transfer.receivedAt) return false
    return true
  })
}

export function r1FindCase(id) {
  return R1_CASES.find((c) => c.id === id) || null
}

export function r1RoomBoard(branchId) {
  return R1_ROOM_BOARD[branchId] || []
}

export function r1NursesFor(clinicId) {
  return R1_NURSES_BY_CLINIC[clinicId] || []
}

export function r1DoctorsFor(clinicId) {
  return R1_DOCTORS_BY_CLINIC[clinicId] || []
}

export function r1ActiveShifts(clinicId) {
  return R1_NURSE_SHIFTS.filter((s) => s.clinicId === clinicId && s.status === 'active')
}

export function r1ClosedShiftsToday(clinicId) {
  const today = '2026-05-27'
  return R1_NURSE_SHIFTS.filter((s) => s.clinicId === clinicId && s.status === 'closed' && s.startedAt.slice(0, 10) === today)
}

export function r1NurseName(nurseId) {
  for (const list of Object.values(R1_NURSES_BY_CLINIC)) {
    const found = list.find((n) => n.id === nurseId)
    if (found) return found.name
  }
  return nurseId
}

export function r1DoctorName(doctorId) {
  for (const list of Object.values(R1_DOCTORS_BY_CLINIC)) {
    const found = list.find((d) => d.id === doctorId)
    if (found) return found.name
  }
  return doctorId
}

export function r1DoctorOnDuty(clinicId) {
  const entry = R1_DOCTOR_ON_DUTY[clinicId]
  if (!entry) return null
  return { ...entry, name: r1DoctorName(entry.doctorId) }
}

export function r1Treasury(locationId) {
  return R1_CASH_TREASURY[locationId] || null
}

export function r1VisaBank(locationId) {
  return R1_VISA_BANK[locationId] || null
}

export function r1ExpensesFor(clinicId) {
  return R1_EXPENSE_ENTRIES.filter((e) => e.clinicId === clinicId)
}

export function r1HandoversFor(locationId) {
  return R1_HANDOVERS.filter((h) => h.locationId === locationId)
}

export const R1_TODAY = '2026-05-27'
export const R1_TODAY_LABEL = '27 May 2026'

/** Hours worked, given start + optional end ISO strings. */
export function shiftHours(start, end) {
  const endMs = end ? new Date(end).getTime() : new Date(TODAY).getTime()
  const startMs = new Date(start).getTime()
  return Math.max(0, (endMs - startMs) / 36e5)
}

/** Compute room board KPIs for a branch. */
export function r1RoomKpis(branchId) {
  const board = r1RoomBoard(branchId)
  const cases = r1CasesForBranch(branchId)
  const occupied = board.filter((r) => r.status === 'occupied').length
  const available = 15 - occupied
  const waiting = cases.filter((c) =>
    (c.transfer && c.transfer.toBranchId === branchId && c.transfer.receivedAt && !c.centerRoomNumber) ||
    (c.registeredAtId === branchId && !c.centerRoomNumber && c.operationalStatus === 'Open'),
  ).length
  const conservative = cases.filter((c) => c.treatmentMode === 'conservative').length
  const surgical = cases.filter((c) => c.treatmentMode === 'surgical').length
  const pendingMode = cases.filter((c) => c.treatmentMode === 'pending').length
  const insurance = cases.filter((c) => c.financialType === 'Insurance').length
  const cash = cases.filter((c) => c.financialType === 'Cash').length
  const pendingFin = cases.filter((c) => c.financialType === 'Pending').length
  const free = cases.filter((c) => c.financialType === 'Free / Complimentary').length
  const hmc = cases.filter((c) => c.billingFacility === 'HMC').length
  const smc = cases.filter((c) => c.billingFacility === 'SMC').length
  return { total: 15, occupied, available, waiting, conservative, surgical, pendingMode, insurance, cash, pendingFin, free, hmc, smc }
}
