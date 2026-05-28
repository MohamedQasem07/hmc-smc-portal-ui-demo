/* =========================================================================
 * PORTAL-UX-P2C — Mock Data: clinic + reception workflows
 * -----------------------------------------------------------------------
 * Every record is INVENTED for UI/UX demo only:
 *   - All patient/staff names contain "Demo" or are obviously placeholders.
 *   - All refs are DEMO-P2C-* — never confused with real HMC2026XXXXX / SHMC-* ids.
 *   - All financial amounts are demonstration amounts only.
 *   - No real insurance/assistance refs.
 *   - No real hotels are required — sample hotel names match the existing P1 list.
 *
 * Schema decisions (binding):
 *   ROUTE          — patient journey (separate from financial type)
 *   FINANCIAL TYPE — Pending / Cash / Insurance
 *   BILLING_FACILITY — Insurance only. 'HMC' or 'SMC'. Selected by clinic/reception
 *                      user at case opening per Mohamed's instruction. May be
 *                      preserved through transfers; admin can review/correct.
 *   TRANSFER STATUS — Sent → Received → Financial Type Confirmed → Admin Review → Closed
 *
 * NOTHING in this file imports real data. It is consumed only by P2C routes.
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
// External clinics that nurses log in to
// (External = NOT one of HMC's own owned branches, BUT still operationally
//  connected to HMC's network. Each clinic is its own demo identity here.)
// =====================================================================
export const EXTERNAL_CLINICS = [
  { id: 'tropitel',      name: 'Tropitel Clinic',       hotel: 'Tropitel Sahl Hasheesh',  city: 'Sahl Hasheesh' },
  { id: 'romance',       name: 'Romance Clinic',        hotel: 'Romance Hurghada Hotel',  city: 'Hurghada' },
  { id: 'sahl_hasheesh', name: 'Sahl Hasheesh Clinics', hotel: 'SMC Sahl Hasheesh Campus',city: 'Sahl Hasheesh' },
  { id: 'mamsha',        name: 'Mamsha Clinic',         hotel: 'Mamsha Promenade',        city: 'Sahl Hasheesh' },
  { id: 'pharaoh',       name: 'Pharaoh Clinic',        hotel: 'Pharaoh Azur Resort',     city: 'Hurghada' },
  { id: 'menamark',      name: 'Menamark Clinic',       hotel: 'Menamark Resort',         city: 'Hurghada' },
]

// Main HMC branches that receive transfers + register direct cases
export const RECEIVING_BRANCHES = [
  { id: 'al_kawther', name: 'Al-Kawther Branch', city: 'Hurghada', mapHint: 'Al-Kawther District' },
  { id: 'sheraton',   name: 'Sheraton Branch',   city: 'Hurghada', mapHint: 'Sheraton Road' },
]

export const ALL_CLINICS_AND_BRANCHES = [
  ...EXTERNAL_CLINICS.map((c) => ({ ...c, kind: 'external' })),
  ...RECEIVING_BRANCHES.map((b) => ({ ...b, kind: 'branch' })),
]

export const getClinicById = (id) => ALL_CLINICS_AND_BRANCHES.find((x) => x.id === id) || null
export const getClinicName = (id) => getClinicById(id)?.name || 'Unknown Clinic'

// =====================================================================
// Demo identities — used by Role Preview entry page
// =====================================================================
export const P2C_DEMO_USERS = {
  admin: {
    role: 'admin',
    name: 'Demo Administrator',
    title: 'Financial Director',
    avatarTone: 'teal',
  },
  clinic_nurse: {
    role: 'clinic_nurse',
    name: 'Demo Nurse',
    title: 'External Clinic Nurse',
    defaultClinicId: 'tropitel',
    avatarTone: 'navy',
  },
  reception_kawther: {
    role: 'reception_kawther',
    name: 'Demo Reception',
    title: 'Reception — Al-Kawther Branch',
    branchId: 'al_kawther',
    avatarTone: 'navy',
  },
  reception_sheraton: {
    role: 'reception_sheraton',
    name: 'Demo Reception',
    title: 'Reception — Sheraton Branch',
    branchId: 'sheraton',
    avatarTone: 'navy',
  },
}

// =====================================================================
// Vocabularies (UI labels only)
// =====================================================================
export const P2C_FINANCIAL_TYPES = ['Pending', 'Cash', 'Insurance']
export const P2C_BILLING_FACILITIES = [
  { code: 'HMC', label: 'Hurghada Medical Center — HMC' },
  { code: 'SMC', label: 'Sahl Hasheesh Medical Centre — SMC' },
]
export const P2C_ROUTES_EXTERNAL = [
  { code: 'direct',         label: 'Direct at this Clinic' },
  { code: 'to_al_kawther',  label: 'Transfer to Al-Kawther Branch' },
  { code: 'to_sheraton',    label: 'Transfer to Sheraton Branch' },
]
export const P2C_PAYMENT_METHODS = ['Cash', 'Visa / Card', 'Bank Transfer', 'Other']
export const P2C_CURRENCIES = ['EGP', 'EUR', 'USD', 'GBP']
export const P2C_OP_STATUSES = ['Open', 'Closed']

// Transfer status progression
export const P2C_TRANSFER_STATUS_FLOW = [
  'Sent',
  'Received',
  'Financial Type Confirmed',
  'Admin Review',
  'Closed',
]

// =====================================================================
// CASES — every case has BOTH route and financialType as separate fields,
// plus billingFacility (HMC/SMC) when financialType === 'Insurance'.
// =====================================================================
export const P2C_CASES = [
  // ------- Tropitel Clinic — Direct cases (own queue) -------
  {
    id: 'p2c_001',
    ourRef: 'DEMO-P2C-1001',
    registeredAtId: 'tropitel',
    registeredAtName: 'Tropitel Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 9, 5),
    patient: {
      name: 'Demo Patient Alpha', gender: 'Male', age: 41, nationality: 'German',
      hotel: 'Tropitel Sahl Hasheesh', note: 'Sunburn, mild dehydration — quick consult.',
    },
    route: 'direct',
    routeLabel: 'Direct at Tropitel Clinic',
    financialType: 'Cash',
    cashPayment: { amount: 380, currency: 'EUR', method: 'Visa / Card', settlement: 'Paid' },
    mixedCurrency: false,
    transfer: null,
    billingFacility: null,
    insurance: null,
    operationalStatus: 'Closed',
    notes: 'Quick consult — paid at front desk.',
    history: [
      { at: isoDays(0, 9, 5),  by: 'Demo Nurse — Tropitel', field: 'Case',           from: null, to: 'Created' },
      { at: isoDays(0, 9, 15), by: 'Demo Nurse — Tropitel', field: 'Financial Type', from: 'Pending', to: 'Cash' },
      { at: isoDays(0, 9, 45), by: 'Demo Nurse — Tropitel', field: 'Op Status',      from: 'Open', to: 'Closed' },
    ],
  },
  {
    id: 'p2c_002',
    ourRef: 'DEMO-P2C-1002',
    registeredAtId: 'tropitel',
    registeredAtName: 'Tropitel Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 10, 30),
    patient: {
      name: 'Demo Patient Beta', gender: 'Female', age: 28, nationality: 'British',
      hotel: 'Tropitel Sahl Hasheesh', note: 'Acute gastroenteritis — needs labs + IV.',
    },
    route: 'direct',
    routeLabel: 'Direct at Tropitel Clinic',
    financialType: 'Insurance',
    billingFacility: 'SMC',
    insurance: { company: 'AXA Assistance', ref: 'AXA-DEMO-P2C-7741' },
    cashPayment: null,
    mixedCurrency: false,
    transfer: null,
    operationalStatus: 'Open',
    notes: 'Mohamed instructed: open under SMC.',
    history: [
      { at: isoDays(0, 10, 30), by: 'Demo Nurse — Tropitel', field: 'Case',              from: null,      to: 'Created' },
      { at: isoDays(0, 10, 35), by: 'Demo Nurse — Tropitel', field: 'Financial Type',    from: 'Pending', to: 'Insurance' },
      { at: isoDays(0, 10, 36), by: 'Demo Nurse — Tropitel', field: 'Billing Facility',  from: null,      to: 'SMC' },
    ],
  },
  // ------- Tropitel — Pending transfer sent to Al-Kawther (no fin type yet) -------
  {
    id: 'p2c_003',
    ourRef: 'DEMO-P2C-1003',
    registeredAtId: 'tropitel',
    registeredAtName: 'Tropitel Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 8, 10),
    patient: {
      name: 'Demo Patient Gamma', gender: 'Male', age: 62, nationality: 'Czech',
      hotel: 'Tropitel Sahl Hasheesh', note: 'Suspected fracture — sent for imaging.',
    },
    route: 'to_al_kawther',
    routeLabel: 'Transfer to Al-Kawther Branch',
    financialType: 'Pending',
    billingFacility: null,
    insurance: null,
    cashPayment: null,
    mixedCurrency: false,
    transfer: {
      toBranchId: 'al_kawther',
      toBranchName: 'Al-Kawther Branch',
      reason: 'Suspected ankle fracture — needs imaging + ortho assessment.',
      transport: 'Ambulance',
      sentAt: isoDays(0, 8, 25),
      receivedAt: null,
      status: 'Sent',
    },
    operationalStatus: 'Open',
    notes: 'Financial type to be decided at Al-Kawther after assessment.',
    history: [
      { at: isoDays(0, 8, 10), by: 'Demo Nurse — Tropitel', field: 'Case',  from: null,     to: 'Created' },
      { at: isoDays(0, 8, 25), by: 'Demo Nurse — Tropitel', field: 'Route', from: 'Direct', to: 'Transfer to Al-Kawther Branch' },
    ],
  },

  // ------- Romance Clinic — Insurance known before transfer (HMC) -------
  {
    id: 'p2c_004',
    ourRef: 'DEMO-P2C-1004',
    registeredAtId: 'romance',
    registeredAtName: 'Romance Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 8, 50),
    patient: {
      name: 'Demo Patient Delta', gender: 'Female', age: 35, nationality: 'Polish',
      hotel: 'Romance Hurghada Hotel', note: 'Pre-existing cardiology follow-up — needs admission.',
    },
    route: 'to_al_kawther',
    routeLabel: 'Transfer to Al-Kawther Branch',
    financialType: 'Insurance',
    billingFacility: 'HMC',
    insurance: { company: 'Allianz Worldwide Care', ref: 'ALZ-DEMO-P2C-5512' },
    cashPayment: null,
    mixedCurrency: false,
    transfer: {
      toBranchId: 'al_kawther',
      toBranchName: 'Al-Kawther Branch',
      reason: 'Inpatient admission required — known insurance case.',
      transport: 'Ambulance',
      sentAt: isoDays(0, 9, 10),
      receivedAt: null,
      status: 'Sent',
    },
    operationalStatus: 'Open',
    notes: 'Receiving branch must preserve HMC selection — Mohamed pre-approved.',
    history: [
      { at: isoDays(0, 8, 50), by: 'Demo Nurse — Romance', field: 'Case',              from: null,      to: 'Created' },
      { at: isoDays(0, 8, 55), by: 'Demo Nurse — Romance', field: 'Financial Type',    from: 'Pending', to: 'Insurance' },
      { at: isoDays(0, 8, 56), by: 'Demo Nurse — Romance', field: 'Billing Facility',  from: null,      to: 'HMC' },
      { at: isoDays(0, 9, 10), by: 'Demo Nurse — Romance', field: 'Route',             from: 'Direct',  to: 'Transfer to Al-Kawther Branch' },
    ],
  },

  // ------- Sahl Hasheesh Clinics — Direct outpatient Insurance/SMC -------
  {
    id: 'p2c_005',
    ourRef: 'DEMO-P2C-1005',
    registeredAtId: 'sahl_hasheesh',
    registeredAtName: 'Sahl Hasheesh Clinics',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 11, 0),
    patient: {
      name: 'Demo Patient Epsilon', gender: 'Female', age: 56, nationality: 'Italian',
      hotel: 'SMC Sahl Hasheesh Campus', note: 'Outpatient — routine consult + labs.',
    },
    route: 'direct',
    routeLabel: 'Direct at Sahl Hasheesh Clinics',
    financialType: 'Insurance',
    billingFacility: 'SMC',
    insurance: { company: 'Europ Assistance', ref: 'EUR-DEMO-P2C-9921' },
    cashPayment: null,
    mixedCurrency: false,
    transfer: null,
    operationalStatus: 'Open',
    notes: 'SMC is the home facility — straightforward selection.',
    history: [
      { at: isoDays(0, 11, 0), by: 'Demo Nurse — SMC',     field: 'Case',             from: null,      to: 'Created' },
      { at: isoDays(0, 11, 5), by: 'Demo Nurse — SMC',     field: 'Financial Type',   from: 'Pending', to: 'Insurance' },
      { at: isoDays(0, 11, 6), by: 'Demo Nurse — SMC',     field: 'Billing Facility', from: null,      to: 'SMC' },
    ],
  },

  // ------- Mamsha — direct cash (mixed currency demo) -------
  {
    id: 'p2c_006',
    ourRef: 'DEMO-P2C-1006',
    registeredAtId: 'mamsha',
    registeredAtName: 'Mamsha Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 12, 15),
    patient: {
      name: 'Demo Tourist Case', gender: 'Male', age: 47, nationality: 'French',
      hotel: 'Mamsha Promenade', note: 'Mixed currency demo — for admin review only.',
    },
    route: 'direct',
    routeLabel: 'Direct at Mamsha Clinic',
    financialType: 'Cash',
    cashPayment: { amount: 500, currency: 'EUR', method: 'Cash', settlement: 'Partially Paid', topUp: { amount: 7000, currency: 'EGP', method: 'Visa / Card' } },
    mixedCurrency: true,
    transfer: null,
    billingFacility: null,
    insurance: null,
    operationalStatus: 'Open',
    notes: 'Mixed currency — flagged for admin review.',
    history: [
      { at: isoDays(0, 12, 15), by: 'Demo Nurse — Mamsha', field: 'Case',             from: null,      to: 'Created' },
      { at: isoDays(0, 12, 25), by: 'Demo Nurse — Mamsha', field: 'Financial Type',   from: 'Pending', to: 'Cash' },
      { at: isoDays(0, 12, 26), by: 'Demo Nurse — Mamsha', field: 'Mixed Currency',   from: null,      to: 'Yes — admin review required' },
    ],
  },

  // ------- Al-Kawther — Direct walk-in (cash) -------
  {
    id: 'p2c_101',
    ourRef: 'DEMO-P2C-2001',
    registeredAtId: 'al_kawther',
    registeredAtName: 'Al-Kawther Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(0, 10, 5),
    patient: {
      name: 'Demo Patient Zeta', gender: 'Female', age: 33, nationality: 'Hungarian',
      hotel: 'Palace Resort', note: 'Walk-in — minor cut, sutured.',
    },
    route: 'direct',
    routeLabel: 'Direct at Al-Kawther Branch',
    financialType: 'Cash',
    cashPayment: { amount: 220, currency: 'EUR', method: 'Cash', settlement: 'Paid' },
    mixedCurrency: false,
    transfer: null,
    billingFacility: null,
    insurance: null,
    operationalStatus: 'Closed',
    notes: '',
    history: [
      { at: isoDays(0, 10, 5),  by: 'Demo Reception — Al-Kawther', field: 'Case',           from: null,      to: 'Created' },
      { at: isoDays(0, 10, 25), by: 'Demo Reception — Al-Kawther', field: 'Financial Type', from: 'Pending', to: 'Cash' },
    ],
  },

  // ------- Al-Kawther — Insurance direct (Mohamed selected HMC) -------
  {
    id: 'p2c_102',
    ourRef: 'DEMO-P2C-2002',
    registeredAtId: 'al_kawther',
    registeredAtName: 'Al-Kawther Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(0, 11, 25),
    patient: {
      name: 'Demo Patient Eta', gender: 'Male', age: 71, nationality: 'Dutch',
      hotel: 'Sheraton Soma Bay', note: 'Cardiac follow-up — inpatient observation.',
    },
    route: 'direct',
    routeLabel: 'Direct at Al-Kawther Branch',
    financialType: 'Insurance',
    billingFacility: 'HMC',
    insurance: { company: 'Roland Assistance', ref: 'ROL-DEMO-P2C-3321' },
    cashPayment: null,
    mixedCurrency: false,
    transfer: null,
    operationalStatus: 'Open',
    notes: '',
    history: [
      { at: isoDays(0, 11, 25), by: 'Demo Reception — Al-Kawther', field: 'Case',             from: null,      to: 'Created' },
      { at: isoDays(0, 11, 28), by: 'Demo Reception — Al-Kawther', field: 'Financial Type',   from: 'Pending', to: 'Insurance' },
      { at: isoDays(0, 11, 29), by: 'Demo Reception — Al-Kawther', field: 'Billing Facility', from: null,      to: 'HMC' },
    ],
  },

  // ------- Sheraton — direct cash (yesterday) -------
  {
    id: 'p2c_201',
    ourRef: 'DEMO-P2C-3001',
    registeredAtId: 'sheraton',
    registeredAtName: 'Sheraton Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(-1, 16, 40),
    patient: {
      name: 'Demo Patient Theta', gender: 'Female', age: 24, nationality: 'Swedish',
      hotel: 'Sheraton Soma Bay', note: 'Wound check — minor.',
    },
    route: 'direct',
    routeLabel: 'Direct at Sheraton Branch',
    financialType: 'Cash',
    cashPayment: { amount: 150, currency: 'EUR', method: 'Cash', settlement: 'Paid' },
    mixedCurrency: false,
    transfer: null,
    billingFacility: null,
    insurance: null,
    operationalStatus: 'Closed',
    notes: '',
    history: [
      { at: isoDays(-1, 16, 40), by: 'Demo Reception — Sheraton', field: 'Case',           from: null,      to: 'Created' },
      { at: isoDays(-1, 16, 55), by: 'Demo Reception — Sheraton', field: 'Financial Type', from: 'Pending', to: 'Cash' },
    ],
  },

  // ------- Sheraton — Insurance direct (Mohamed selected SMC for SMC patient) -------
  {
    id: 'p2c_202',
    ourRef: 'DEMO-P2C-3002',
    registeredAtId: 'sheraton',
    registeredAtName: 'Sheraton Branch',
    registeredAtKind: 'branch',
    visitDate: isoDays(0, 9, 50),
    patient: {
      name: 'Demo Patient Iota', gender: 'Male', age: 49, nationality: 'Belgian',
      hotel: 'Sheraton Soma Bay', note: 'Outpatient consult + lab panel.',
    },
    route: 'direct',
    routeLabel: 'Direct at Sheraton Branch',
    financialType: 'Insurance',
    billingFacility: 'SMC',
    insurance: { company: 'Mondial Assistance', ref: 'MON-DEMO-P2C-4421' },
    cashPayment: null,
    mixedCurrency: false,
    transfer: null,
    operationalStatus: 'Open',
    notes: 'Mohamed instructed: open under SMC.',
    history: [
      { at: isoDays(0, 9, 50), by: 'Demo Reception — Sheraton', field: 'Case',             from: null,      to: 'Created' },
      { at: isoDays(0, 9, 55), by: 'Demo Reception — Sheraton', field: 'Financial Type',   from: 'Pending', to: 'Insurance' },
      { at: isoDays(0, 9, 56), by: 'Demo Reception — Sheraton', field: 'Billing Facility', from: null,      to: 'SMC' },
    ],
  },

  // ------- Incoming transfer: Pharaoh → Sheraton (pending, needs receipt + fin type) -------
  {
    id: 'p2c_203',
    ourRef: 'DEMO-P2C-3003',
    registeredAtId: 'pharaoh',
    registeredAtName: 'Pharaoh Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 7, 45),
    patient: {
      name: 'Demo Patient Kappa', gender: 'Female', age: 67, nationality: 'Czech',
      hotel: 'Pharaoh Azur Resort', note: 'Possible appendicitis — sent for further work-up.',
    },
    route: 'to_sheraton',
    routeLabel: 'Transfer to Sheraton Branch',
    financialType: 'Pending',
    billingFacility: null,
    insurance: null,
    cashPayment: null,
    mixedCurrency: false,
    transfer: {
      toBranchId: 'sheraton',
      toBranchName: 'Sheraton Branch',
      reason: 'Possible appendicitis — needs surgical assessment.',
      transport: 'Ambulance',
      sentAt: isoDays(0, 8, 0),
      receivedAt: null,
      status: 'Sent',
    },
    operationalStatus: 'Open',
    notes: 'Receiving branch decides Cash / Insurance after intake.',
    history: [
      { at: isoDays(0, 7, 45), by: 'Demo Nurse — Pharaoh', field: 'Case',  from: null,     to: 'Created' },
      { at: isoDays(0, 8, 0),  by: 'Demo Nurse — Pharaoh', field: 'Route', from: 'Direct', to: 'Transfer to Sheraton Branch' },
    ],
  },

  // ------- Incoming transfer received at Sheraton, later confirmed Insurance/HMC -------
  {
    id: 'p2c_204',
    ourRef: 'DEMO-P2C-3004',
    registeredAtId: 'menamark',
    registeredAtName: 'Menamark Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(-1, 18, 5),
    patient: {
      name: 'Demo Patient Lambda', gender: 'Male', age: 58, nationality: 'British',
      hotel: 'Menamark Resort', note: 'Chest pain — to main branch.',
    },
    route: 'to_sheraton',
    routeLabel: 'Transfer to Sheraton Branch',
    financialType: 'Insurance',
    billingFacility: 'HMC',
    insurance: { company: 'Bupa', ref: 'BUPA-DEMO-P2C-2042' },
    cashPayment: null,
    mixedCurrency: false,
    transfer: {
      toBranchId: 'sheraton',
      toBranchName: 'Sheraton Branch',
      reason: 'Chest pain — cardiology workup required.',
      transport: 'Ambulance',
      sentAt: isoDays(-1, 18, 15),
      receivedAt: isoDays(-1, 19, 0),
      status: 'Financial Type Confirmed',
    },
    operationalStatus: 'Open',
    notes: 'Insurance/HMC confirmed by Reception after intake (Mohamed instruction).',
    history: [
      { at: isoDays(-1, 18, 5),  by: 'Demo Nurse — Menamark',     field: 'Case',             from: null,      to: 'Created' },
      { at: isoDays(-1, 18, 15), by: 'Demo Nurse — Menamark',     field: 'Route',            from: 'Direct',  to: 'Transfer to Sheraton Branch' },
      { at: isoDays(-1, 19, 0),  by: 'Demo Reception — Sheraton', field: 'Transfer Status',  from: 'Sent',    to: 'Received' },
      { at: isoDays(-1, 19, 10), by: 'Demo Reception — Sheraton', field: 'Financial Type',   from: 'Pending', to: 'Insurance' },
      { at: isoDays(-1, 19, 11), by: 'Demo Reception — Sheraton', field: 'Billing Facility', from: null,      to: 'HMC' },
    ],
  },

  // ------- Incoming transfer received at Al-Kawther, classified Cash on arrival -------
  {
    id: 'p2c_103',
    ourRef: 'DEMO-P2C-2003',
    registeredAtId: 'menamark',
    registeredAtName: 'Menamark Clinic',
    registeredAtKind: 'external',
    visitDate: isoDays(0, 9, 20),
    patient: {
      name: 'Demo Patient Mu', gender: 'Female', age: 38, nationality: 'Greek',
      hotel: 'Menamark Resort', note: 'Allergic reaction — observation in Al-Kawther.',
    },
    route: 'to_al_kawther',
    routeLabel: 'Transfer to Al-Kawther Branch',
    financialType: 'Cash',
    cashPayment: { amount: 290, currency: 'EUR', method: 'Visa / Card', settlement: 'Paid' },
    mixedCurrency: false,
    transfer: {
      toBranchId: 'al_kawther',
      toBranchName: 'Al-Kawther Branch',
      reason: 'Allergic reaction — needs observation.',
      transport: 'Patient Own Transport',
      sentAt: isoDays(0, 9, 35),
      receivedAt: isoDays(0, 9, 55),
      status: 'Financial Type Confirmed',
    },
    billingFacility: null,
    insurance: null,
    operationalStatus: 'Open',
    notes: 'Pending → Cash on arrival.',
    history: [
      { at: isoDays(0, 9, 20), by: 'Demo Nurse — Menamark',         field: 'Case',            from: null,       to: 'Created' },
      { at: isoDays(0, 9, 35), by: 'Demo Nurse — Menamark',         field: 'Route',           from: 'Direct',   to: 'Transfer to Al-Kawther Branch' },
      { at: isoDays(0, 9, 55), by: 'Demo Reception — Al-Kawther',   field: 'Transfer Status', from: 'Sent',     to: 'Received' },
      { at: isoDays(0, 10, 5), by: 'Demo Reception — Al-Kawther',   field: 'Financial Type',  from: 'Pending',  to: 'Cash' },
    ],
  },
]

// =====================================================================
// Selectors / aggregates
// =====================================================================

/** Cases owned by a given external clinic (registeredAt === clinicId) */
export function casesForClinic(clinicId) {
  return P2C_CASES.filter((c) => c.registeredAtId === clinicId)
}

/**
 * Cases visible at a branch reception:
 *   - Direct cases registered at this branch
 *   - Transferred-in cases (transfer.toBranchId === branchId)
 */
export function casesForBranch(branchId) {
  return P2C_CASES.filter((c) =>
    c.registeredAtId === branchId ||
    (c.transfer && c.transfer.toBranchId === branchId),
  )
}

/** Transfers SENT BY a clinic (out-going). */
export function transfersSentBy(clinicId) {
  return P2C_CASES.filter((c) => c.registeredAtId === clinicId && c.transfer)
}

/** Incoming transfers waiting at a branch (not yet received). */
export function incomingTransfersAt(branchId, { includeReceived = true } = {}) {
  return P2C_CASES.filter((c) => {
    if (!c.transfer || c.transfer.toBranchId !== branchId) return false
    if (!includeReceived && c.transfer.receivedAt) return false
    return true
  })
}

/** Today's date used by demo dashboards. */
export const P2C_TODAY = '2026-05-27'
export const P2C_TODAY_LABEL = '27 May 2026'

/** Numeric KPI builder used by every dashboard. */
export function summarize(cases) {
  const today = P2C_TODAY
  const todayList = cases.filter((c) => (c.visitDate || '').slice(0, 10) === today)
  const totals = {
    total: todayList.length,
    cash: todayList.filter((c) => c.financialType === 'Cash').length,
    insurance: todayList.filter((c) => c.financialType === 'Insurance').length,
    pending: todayList.filter((c) => c.financialType === 'Pending').length,
    transfersSent: todayList.filter((c) => c.route !== 'direct' && c.registeredAtKind === 'external').length,
    transfersReceived: todayList.filter((c) => c.transfer && c.transfer.receivedAt && c.transfer.receivedAt.slice(0,10) === today).length,
    transfersIncoming: todayList.filter((c) => c.transfer && !c.transfer.receivedAt).length,
    open: todayList.filter((c) => c.operationalStatus === 'Open').length,
    closed: todayList.filter((c) => c.operationalStatus === 'Closed').length,
    mixed: todayList.filter((c) => c.mixedCurrency).length,
    hmc: todayList.filter((c) => c.billingFacility === 'HMC').length,
    smc: todayList.filter((c) => c.billingFacility === 'SMC').length,
  }
  // Collections by currency
  const collections = {}
  const methodByCurrency = {}
  for (const c of todayList) {
    if (c.financialType !== 'Cash' || !c.cashPayment) continue
    const { amount, currency, method } = c.cashPayment
    collections[currency] = (collections[currency] || 0) + amount
    const key = `${method}::${currency}`
    methodByCurrency[key] = (methodByCurrency[key] || 0) + amount
    if (c.cashPayment.topUp) {
      const t = c.cashPayment.topUp
      collections[t.currency] = (collections[t.currency] || 0) + t.amount
      const tk = `${t.method}::${t.currency}`
      methodByCurrency[tk] = (methodByCurrency[tk] || 0) + t.amount
    }
  }
  return { todayList, totals, collections, methodByCurrency }
}

/** Compose a transfer-journey step list for any case. */
export function timelineForCase(c, viewerBranchId = null) {
  const steps = []
  steps.push({
    key: 'registered',
    title: `Registered at ${c.registeredAtName}`,
    at: c.visitDate,
    done: true,
    tone: 'navy',
  })

  if (!c.transfer) {
    steps.push({
      key: 'classified',
      title: c.financialType === 'Pending'
        ? 'Financial Type pending classification'
        : `Financial Type: ${c.financialType}${c.financialType === 'Insurance' && c.billingFacility ? ` — Billing under ${c.billingFacility}` : ''}`,
      at: null,
      done: c.financialType !== 'Pending',
      tone: c.financialType === 'Pending' ? 'amber' : c.financialType === 'Insurance' ? 'teal' : 'cash',
    })
    if (c.operationalStatus === 'Closed') {
      steps.push({ key: 'closed', title: 'Operationally Closed', at: null, done: true, tone: 'finalized' })
    }
    return steps
  }

  // Transfer flow
  steps.push({
    key: 'sent',
    title: `Transfer Sent to ${c.transfer.toBranchName}`,
    at: c.transfer.sentAt,
    done: true,
    tone: 'transferred',
    detail: c.transfer.reason,
  })
  steps.push({
    key: 'received',
    title: c.transfer.receivedAt ? `Received at ${c.transfer.toBranchName}` : `Awaiting receipt at ${c.transfer.toBranchName}`,
    at: c.transfer.receivedAt,
    done: !!c.transfer.receivedAt,
    tone: c.transfer.receivedAt ? 'cash' : 'amber',
  })
  steps.push({
    key: 'classified',
    title: c.financialType === 'Pending'
      ? 'Financial Type pending classification'
      : `Financial Type Confirmed: ${c.financialType}${c.financialType === 'Insurance' && c.billingFacility ? ` — Billing under ${c.billingFacility}` : ''}`,
    at: null,
    done: c.financialType !== 'Pending',
    tone: c.financialType === 'Pending' ? 'amber' : c.financialType === 'Insurance' ? 'teal' : 'cash',
  })
  if (c.financialType === 'Insurance') {
    steps.push({
      key: 'admin_review',
      title: 'Admin Review (Insurance)',
      at: null,
      done: c.transfer.status === 'Closed',
      tone: 'navy',
    })
  }
  steps.push({
    key: 'closed',
    title: c.operationalStatus === 'Closed' ? 'Operationally Closed' : 'Open',
    at: null,
    done: c.operationalStatus === 'Closed',
    tone: c.operationalStatus === 'Closed' ? 'finalized' : 'amber',
  })
  return steps
}
