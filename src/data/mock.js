/* =========================================================================
 * PORTAL-UX-P1 — Mock Data (expanded)
 * -----------------------------------------------------------------------
 * Every record here is INVENTED for the UI/UX prototype.
 *  - No real patient names, no real insurance refs, no real prices.
 *  - "Our Ref" values use a DEMO prefix so they cannot be confused with
 *    HMC/SMC production ref formats.
 *  - All dates are anchored relative to TODAY (2026-05-26) for a believable
 *    operational timeline.
 *  - All fields below mirror the P1 expanded field matrix
 *    (see docs/P1_FIELD_MATRIX.md).
 * ========================================================================= */

const TODAY = new Date('2026-05-26T11:30:00')
const isoDays = (offsetDays, hours = 9, minutes = 0) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}
const isoMins = (offsetMins) => {
  const d = new Date(TODAY)
  d.setMinutes(d.getMinutes() + offsetMins)
  return d.toISOString()
}

// =====================================================================
// Facilities & Branches
// =====================================================================
export const FACILITIES = [
  { id: 'hmc', name: 'HMC', longName: 'Hurghada Medical Center' },
  { id: 'smc', name: 'SMC', longName: 'Sahl Hasheesh Medical Centre' },
]

export const BRANCHES = [
  { id: 'al_kawther',      name: 'Al-Kawther Branch',     facility: 'hmc', city: 'Hurghada',     mapHint: 'Al-Kawther District' },
  { id: 'sheraton',        name: 'Sheraton Branch',       facility: 'hmc', city: 'Hurghada',     mapHint: 'Sheraton Road' },
  { id: 'tropitel',        name: 'Tropitel Clinic',       facility: 'hmc', city: 'Sahl Hasheesh',mapHint: 'Tropitel Resort' },
  { id: 'romance',         name: 'Romance Clinic',        facility: 'hmc', city: 'Hurghada',     mapHint: 'Romance Hotel' },
  { id: 'sahl_hasheesh',   name: 'Sahl Hasheesh Clinics', facility: 'smc', city: 'Sahl Hasheesh',mapHint: 'SMC main campus' },
  { id: 'mamsha',          name: 'Mamsha Clinic',         facility: 'smc', city: 'Sahl Hasheesh',mapHint: 'Mamsha Promenade' },
  { id: 'pharaoh',         name: 'Pharaoh Clinic',        facility: 'hmc', city: 'Hurghada',     mapHint: 'Pharaoh Azur' },
  { id: 'menamark',        name: 'Menamark Clinic',       facility: 'hmc', city: 'Hurghada',     mapHint: 'Menamark Resort' },
]

export const getBranch = (id) => BRANCHES.find((b) => b.id === id)
export const getBranchName = (id) => getBranch(id)?.name || 'Unknown Branch'
export const getBranchFacility = (id) => getBranch(id)?.facility || 'hmc'

// =====================================================================
// Demo Users
// =====================================================================
export const DEMO_USERS = {
  clinic: {
    id: 'u_clinic_demo',
    name: 'Sarah El-Sayed',
    role: 'clinic',
    title: 'Reception',
    branchId: 'tropitel',
    facilityId: 'hmc',
  },
  admin: {
    id: 'u_admin_mohamed',
    name: 'Demo Administrator',
    role: 'admin',
    title: 'Financial Director',
  },
}

// =====================================================================
// Lookup vocabularies — single source of truth used by every screen
// =====================================================================
export const HOTELS = [
  'Tropitel Sahl Hasheesh', 'Jaz Oriental', 'Cleopatra Luxury Resort',
  'Palace Resort', 'Pyramisa Sahl Hasheesh', 'Steigenberger Aqua Magic',
  'Sunrise Holidays Resort', 'Sentido Mamlouk Palace', 'Albatros Palace',
  'Sahl Hasheesh — Private Villa', 'Stella Di Mare', 'Hilton Hurghada',
  'Movenpick Soma Bay', 'Sheraton Soma Bay', 'Old Palace Resort',
]

export const NATIONALITIES = [
  'German', 'British', 'French', 'Italian', 'Dutch', 'Belgian',
  'Czech', 'Polish', 'Hungarian', 'Slovak', 'Swedish', 'Greek',
  'Austrian', 'Spanish', 'Romanian', 'Irish', 'Danish', 'Norwegian',
  'Finnish', 'Swiss', 'Russian', 'Ukrainian', 'Portuguese',
]

export const INSURANCE_COMPANIES = [
  'AXA Assistance', 'Allianz Worldwide Care', 'Roland Assistance',
  'Europ Assistance', 'Mondial Assistance', 'Generali',
  'AIG Travel Guard', 'Bupa', 'LGA', 'BIA', 'Mapfre', 'ERV',
  'TUI Care+', 'IPID', 'World Nomads',
]

export const ASSISTANCE_COMPANIES = [
  'SOS International', 'Coris', 'Falck', 'Tangiers', 'Savitar',
  'Aetna Assistance', 'Universal Air Assist', 'MedicAir', 'CMN',
]

export const CASE_PROVIDERS = [
  'Direct Provider Network', 'Agency-Referred', 'Hotel Doctor Network',
  'Tour Operator Channel', 'Embassy Channel',
]

export const CASE_SOURCES = [
  'Walk-in', 'Hotel Call / Referral', 'Transfer Received', 'Manual Admin Entry',
]

export const COVERAGE_STATUSES = [
  'Details Pending', 'Coverage Request Needed', 'Under Review', 'Confirmed',
]

export const TRANSPORT_TYPES = ['Ambulance', 'Patient Own Transport', 'Other']

export const PAYMENT_METHODS = ['Cash', 'Visa / Card', 'Bank Transfer', 'Other']
export const FINANCIAL_TYPES = ['Pending', 'Cash', 'Insurance']
export const ROUTES = ['Direct', 'Transferred Out', 'Transferred In']
export const CASE_STATUSES = ['Open', 'Reviewed', 'Closed']
export const INVOICE_READINESS = ['Pending Information', 'Ready for Invoice', 'Invoice Generated', 'Reviewed', 'Finalized']

// Documents checklist canonical keys + labels
export const DOC_CHECKLIST_DEFS = [
  { key: 'passport_id',         label: 'Passport / ID Received' },
  { key: 'insurance_document',  label: 'Insurance Document Received' },
  { key: 'medical_report',      label: 'Medical Report Available' },
  { key: 'lab_results',         label: 'Laboratory Results Available' },
  { key: 'imaging',             label: 'Imaging / Other Supporting Documents Available' },
  { key: 'transfer_documents',  label: 'Transfer Documents Sent / Received' },
]
export const emptyChecklist = () => DOC_CHECKLIST_DEFS.reduce((acc, d) => { acc[d.key] = false; return acc }, {})

// =====================================================================
// Cases
//   Each case carries enough data for every P1 screen:
//   Identity:      ourRef, source, branchId, facilityId, hotel, patient, visitDate, visitTime, caseSource
//   Patient:       name, gender, dob, nationality, hotel, room, postalCode, phone, email, arrivalDate, departureDate, passport, note
//   Routing:       route, transferFromId, transferToId, transferNote, transferSentAt, transferReceivedAt, transportType
//   Financial:     financialType, currency, invoiceTotal, payments[], settlementStatus, mixedCurrency
//   Insurance:     insuranceCompany, assistanceCompany, insuranceRef, policyNumber, caseProvider, coverageStatus,
//                  diagnosis, serviceChargePct
//   Documents:     docsChecklist {key: bool}
//   Workflow:      caseStatus, invoiceReadiness, finalInvoiceAmount, finalCurrency, invoiceGeneratedAt,
//                  externalBillingNote, adminNotes
//   Audit:         history[]
// =====================================================================

const makeHistory = (entries) => entries.map((h) => ({ ...h }))

export const CASES = [
  // ---- Today, live Portal ----
  {
    id: 'c001',
    ourRef: 'DEMO-PORTAL-0001',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'tropitel',
    hotel: 'Tropitel Sahl Hasheesh',
    patient: {
      name: 'Lina Georgiou', gender: 'Female', dob: '1986-04-12', nationality: 'Greek',
      room: '214', postalCode: '11528', phone: '+30 210 555 0142',
      email: 'lina.g.demo@example.test', passport: 'GR-DEMO-A1234567',
      arrivalDate: '2026-05-20', departureDate: '2026-05-30',
      note: 'Bilateral abdominal pain since morning.',
    },
    visitDate: isoDays(0, 10, 15),
    visitTime: '10:15',
    caseSource: 'Walk-in',
    route: 'Direct',
    financialType: 'Cash',
    currency: 'EUR',
    invoiceTotal: 500,
    payments: [
      { id: 'p1', amount: 300,   currency: 'EUR', method: 'Cash',        ref: '',             note: 'Initial payment' },
      { id: 'p2', amount: 12500, currency: 'EGP', method: 'Visa / Card', ref: 'AUTH-DM-7714', note: 'Card top-up' },
    ],
    settlementStatus: 'Partially Paid',
    mixedCurrency: true,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    adminNotes: 'Mixed-currency collection — needs reconciliation review.',
    history: makeHistory([
      { at: isoMins(-20), by: 'Sarah El-Sayed',   field: 'Case',           from: null,      to: 'Created' },
      { at: isoMins(-12), by: 'Sarah El-Sayed',   field: 'Financial Type', from: 'Pending', to: 'Cash' },
    ]),
  },
  {
    id: 'c002',
    ourRef: 'DEMO-PORTAL-0002',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'tropitel',
    hotel: 'Jaz Oriental',
    patient: {
      name: 'Anna Müller', gender: 'Female', dob: '1978-11-02', nationality: 'German',
      room: '512', postalCode: '60311', phone: '+49 69 555 0102',
      email: 'a.mueller.demo@example.test', passport: 'DE-DEMO-CN445221',
      arrivalDate: '2026-05-22', departureDate: '2026-06-02',
      note: '',
    },
    visitDate: isoDays(0, 9, 30),
    visitTime: '09:30',
    caseSource: 'Hotel Call / Referral',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'AXA Assistance',
    assistanceCompany: 'SOS International',
    insuranceRef: 'AXA-DEMO-2026-58712',
    policyNumber: 'PL-DEMO-AXA-9931',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Confirmed',
    diagnosis: 'Acute gastroenteritis',
    currency: 'EUR',
    serviceChargePct: 15,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: false, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Ready for Invoice',
    adminNotes: '',
    history: makeHistory([
      { at: isoMins(-180), by: 'Sarah El-Sayed',   field: 'Case',              from: null,                  to: 'Created' },
      { at: isoMins(-150), by: 'Sarah El-Sayed',   field: 'Insurance Ref',     from: '',                    to: 'AXA-DEMO-2026-58712' },
      { at: isoMins(-120), by: 'Sarah El-Sayed',   field: 'Coverage Status',   from: 'Under Review',        to: 'Confirmed' },
      { at: isoMins(-95),  by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Pending Information', to: 'Ready for Invoice' },
    ]),
  },
  {
    id: 'c003',
    ourRef: 'DEMO-PORTAL-0003',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'sheraton',
    hotel: 'Sheraton Soma Bay',
    patient: {
      name: 'John Smith', gender: 'Male', dob: '1969-02-22', nationality: 'British',
      room: '1108', postalCode: 'SW1A 1AA', phone: '+44 20 7946 0102',
      email: 'jsmith.demo@example.test', passport: 'GB-DEMO-512334922',
      arrivalDate: '2026-05-19', departureDate: '2026-06-01',
      note: 'Fall on hotel staircase — suspected ankle fracture.',
    },
    visitDate: isoDays(0, 8, 50),
    visitTime: '08:50',
    caseSource: 'Walk-in',
    route: 'Transferred Out',
    transferToId: 'sahl_hasheesh',
    transferToName: 'Sahl Hasheesh Clinics',
    transferNote: 'Suspected fracture — sent for imaging.',
    transportType: 'Ambulance',
    transferSentAt: isoMins(-110),
    financialType: 'Pending',
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: false, lab_results: false, imaging: false, transfer_documents: true },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: isoMins(-130), by: 'Sarah El-Sayed', field: 'Case',  from: null,     to: 'Created' },
      { at: isoMins(-110), by: 'Sarah El-Sayed', field: 'Route', from: 'Direct', to: 'Transferred Out → Sahl Hasheesh Clinics' },
    ]),
  },
  {
    id: 'c004',
    ourRef: 'DEMO-PORTAL-0004',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'romance',
    hotel: 'Cleopatra Luxury Resort',
    patient: {
      name: 'Maria Kovacs', gender: 'Female', dob: '1992-07-08', nationality: 'Hungarian',
      room: '305', postalCode: '1054', phone: '+36 1 555 0188',
      email: 'maria.k.demo@example.test', passport: 'HU-DEMO-AS112233',
      arrivalDate: '2026-05-23', departureDate: '2026-05-31',
      note: 'Sunburn + mild dehydration.',
    },
    visitDate: isoDays(0, 11, 45),
    visitTime: '11:45',
    caseSource: 'Walk-in',
    route: 'Direct',
    financialType: 'Pending',
    docsChecklist: { passport_id: false, insurance_document: false, medical_report: false, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: isoMins(-15), by: 'Sarah El-Sayed', field: 'Case', from: null, to: 'Created' },
    ]),
  },
  {
    id: 'c005',
    ourRef: 'DEMO-PORTAL-0005',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'al_kawther',
    hotel: 'Palace Resort',
    patient: {
      name: 'Henrik Larsson', gender: 'Male', dob: '1955-09-14', nationality: 'Swedish',
      room: 'V-12', postalCode: '11434', phone: '+46 8 555 0177',
      email: 'h.larsson.demo@example.test', passport: 'SE-DEMO-845221',
      arrivalDate: '2026-05-17', departureDate: '2026-05-28',
      note: 'Follow-up for mild dehydration; rehydration recommended.',
    },
    visitDate: isoDays(0, 12, 20),
    visitTime: '12:20',
    caseSource: 'Hotel Call / Referral',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Allianz Worldwide Care',
    assistanceCompany: 'Falck',
    insuranceRef: 'ALZ-DEMO-2026-00921',
    policyNumber: 'PL-DEMO-ALZ-44120',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Under Review',
    diagnosis: 'Mild dehydration, follow-up',
    currency: 'EUR',
    serviceChargePct: 20,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: isoMins(-8), by: 'Sarah El-Sayed', field: 'Case', from: null, to: 'Created' },
    ]),
  },
  {
    id: 'c006',
    ourRef: 'DEMO-PORTAL-0006',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'tropitel',
    hotel: 'Sentido Mamlouk Palace',
    patient: {
      name: 'Pietro Conti', gender: 'Male', dob: '1981-03-30', nationality: 'Italian',
      room: '719', postalCode: '00185', phone: '+39 06 555 0121',
      email: 'p.conti.demo@example.test', passport: 'IT-DEMO-YA773311',
      arrivalDate: '2026-05-21', departureDate: '2026-05-27',
      note: 'Minor laceration — wound cleaned, single suture, follow-up tomorrow.',
    },
    visitDate: isoDays(-1, 14, 0),
    visitTime: '14:00',
    caseSource: 'Walk-in',
    route: 'Direct',
    financialType: 'Cash',
    currency: 'EUR',
    invoiceTotal: 220,
    payments: [
      { id: 'p1', amount: 220, currency: 'EUR', method: 'Cash', ref: '', note: '' },
    ],
    settlementStatus: 'Paid in Full',
    mixedCurrency: false,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Ready for Invoice',
    history: makeHistory([
      { at: isoDays(-1, 14, 5),  by: 'Sarah El-Sayed',   field: 'Case',           from: null,      to: 'Created' },
      { at: isoDays(-1, 14, 20), by: 'Sarah El-Sayed',   field: 'Financial Type', from: 'Pending', to: 'Cash' },
      { at: isoMins(-340),       by: 'Demo Administrator', field: 'Case Status',   from: 'Open',    to: 'Reviewed' },
    ]),
  },

  // ---- Incoming transfers (received here) ----
  {
    id: 'c007',
    ourRef: 'DEMO-PORTAL-0011',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'tropitel',
    hotel: 'Steigenberger Aqua Magic',
    patient: {
      name: 'Eva Nováková', gender: 'Female', dob: '1990-12-19', nationality: 'Czech',
      room: '407', postalCode: '110 00', phone: '+420 222 555 011',
      email: 'eva.n.demo@example.test', passport: 'CZ-DEMO-7711345',
      arrivalDate: '2026-05-20', departureDate: '2026-05-28',
      note: 'Requested closer clinic after initial assessment.',
    },
    visitDate: isoDays(0, 7, 30),
    visitTime: '07:30',
    caseSource: 'Transfer Received',
    route: 'Transferred In',
    transferFromId: 'romance',
    transferFromName: 'Romance Clinic',
    transferNote: 'Patient requested closer location after initial assessment.',
    transportType: 'Patient Own Transport',
    transferSentAt: isoMins(-220),
    transferReceivedAt: null,
    financialType: 'Pending',
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: true },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: isoMins(-260), by: 'Romance Reception', field: 'Case',  from: null,     to: 'Created' },
      { at: isoMins(-220), by: 'Romance Reception', field: 'Route', from: 'Direct', to: 'Transferred Out → Tropitel Clinic' },
    ]),
  },
  {
    id: 'c008',
    ourRef: 'DEMO-PORTAL-0012',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'tropitel',
    hotel: 'Albatros Palace',
    patient: {
      name: 'Daniel Roux', gender: 'Male', dob: '1973-08-04', nationality: 'French',
      room: '212', postalCode: '75014', phone: '+33 1 4555 0166',
      email: 'd.roux.demo@example.test', passport: 'FR-DEMO-99K22117',
      arrivalDate: '2026-05-19', departureDate: '2026-05-30',
      note: 'Cardiology consult required.',
    },
    visitDate: isoDays(0, 9, 0),
    visitTime: '09:00',
    caseSource: 'Transfer Received',
    route: 'Transferred In',
    transferFromId: 'mamsha',
    transferFromName: 'Mamsha Clinic',
    transferNote: 'Cardiology consult required.',
    transportType: 'Ambulance',
    transferSentAt: isoMins(-50),
    transferReceivedAt: null,
    financialType: 'Pending',
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: false, imaging: false, transfer_documents: true },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: isoMins(-65), by: 'Mamsha Reception', field: 'Case',  from: null,     to: 'Created' },
      { at: isoMins(-50), by: 'Mamsha Reception', field: 'Route', from: 'Direct', to: 'Transferred Out → Tropitel Clinic' },
    ]),
  },

  // ---- Earlier in week ----
  {
    id: 'c009',
    ourRef: 'DEMO-PORTAL-0007',
    source: 'Portal',
    facilityId: 'hmc',
    branchId: 'tropitel',
    hotel: 'Pyramisa Sahl Hasheesh',
    patient: {
      name: 'Bartosz Lewandowski', gender: 'Male', dob: '1962-05-25', nationality: 'Polish',
      room: '603', postalCode: '00-001', phone: '+48 22 555 0199',
      email: 'b.lewa.demo@example.test', passport: 'PL-DEMO-AB6677',
      arrivalDate: '2026-05-15', departureDate: '2026-05-29',
      note: 'Hypertension follow-up.',
    },
    visitDate: isoDays(-2, 17, 30),
    visitTime: '17:30',
    caseSource: 'Walk-in',
    route: 'Direct',
    financialType: 'Cash',
    currency: 'EUR',
    invoiceTotal: 380,
    payments: [
      { id: 'p1', amount: 380, currency: 'EUR', method: 'Visa / Card', ref: 'AUTH-DM-5512', note: 'Card payment at front desk' },
    ],
    settlementStatus: 'Paid in Full',
    mixedCurrency: false,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: true, imaging: false, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Invoice Generated',
    finalInvoiceAmount: 380,
    finalCurrency: 'EUR',
    invoiceGeneratedAt: isoDays(-2, 19, 5),
    externalBillingNote: 'Generated via Claude / Manager — receipt printed at branch.',
    history: makeHistory([
      { at: isoDays(-2, 17, 35), by: 'Sarah El-Sayed',   field: 'Case',              from: null,                to: 'Created' },
      { at: isoDays(-2, 18, 10), by: 'Sarah El-Sayed',   field: 'Financial Type',    from: 'Pending',           to: 'Cash' },
      { at: isoDays(-2, 19, 5),  by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Ready for Invoice', to: 'Invoice Generated' },
    ]),
  },
  {
    id: 'c010',
    ourRef: 'DEMO-PORTAL-0008',
    source: 'Portal',
    facilityId: 'smc',
    branchId: 'sahl_hasheesh',
    hotel: 'Tropitel Sahl Hasheesh',
    patient: {
      name: 'Sofia Novak', gender: 'Female', dob: '1995-10-11', nationality: 'Slovak',
      room: '128', postalCode: '811 01', phone: '+421 2 555 0144',
      email: 's.novak.demo@example.test', passport: 'SK-DEMO-KK112',
      arrivalDate: '2026-05-21', departureDate: '2026-05-30',
      note: 'Sore throat + fever — recommend rest + antibiotics.',
    },
    visitDate: isoDays(-3, 10, 15),
    visitTime: '10:15',
    caseSource: 'Walk-in',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Europ Assistance',
    assistanceCompany: 'Coris',
    insuranceRef: 'EUR-DEMO-2026-44012',
    policyNumber: 'PL-DEMO-EUR-77232',
    caseProvider: 'Tour Operator Channel',
    coverageStatus: 'Confirmed',
    diagnosis: 'Tonsillitis, antibiotic course initiated.',
    currency: 'EUR',
    serviceChargePct: 15,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: false, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Invoice Generated',
    finalInvoiceAmount: 612,
    finalCurrency: 'EUR',
    invoiceGeneratedAt: isoDays(-2, 11, 20),
    externalBillingNote: 'Approved and submitted to Europ Assistance via Manager.',
    history: makeHistory([
      { at: isoDays(-3, 10, 20), by: 'SMC Reception',     field: 'Case',              from: null,                  to: 'Created' },
      { at: isoDays(-3, 11, 0),  by: 'SMC Reception',     field: 'Financial Type',    from: 'Pending',             to: 'Insurance' },
      { at: isoDays(-2, 11, 20), by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Ready for Invoice',   to: 'Invoice Generated' },
    ]),
  },

  // ---- Legacy mock rows (clearly demo) ----
  {
    id: 'l24_041',
    ourRef: 'DEMO-2024-0041',
    source: 'Legacy 2024',
    facilityId: 'hmc',
    branchId: 'sheraton',
    hotel: 'Cleopatra Luxury Resort',
    patient: {
      name: 'Elena Weber', gender: 'Female', dob: '1971-06-03', nationality: 'German',
      room: '—', postalCode: '20095', phone: '+49 40 555 0111',
      email: '', passport: 'DE-DEMO-LEG-2024',
      arrivalDate: '2024-08-10', departureDate: '2024-08-17',
      note: 'Inpatient observation — 1 night (legacy import).',
    },
    visitDate: '2024-08-14T10:00:00',
    visitTime: '10:00',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'AXA Assistance',
    assistanceCompany: 'SOS International',
    insuranceRef: 'AXA-DEMO-2024-LEGACY-41',
    policyNumber: 'PL-DEMO-LEG-AXA-2024',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Confirmed',
    diagnosis: 'Inpatient observation 1 night',
    currency: 'EUR',
    serviceChargePct: 20,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: true, transfer_documents: false },
    caseStatus: 'Closed',
    invoiceReadiness: 'Invoice Generated',
    finalInvoiceAmount: 1840,
    finalCurrency: 'EUR',
    invoiceGeneratedAt: '2024-08-15T12:30:00',
    externalBillingNote: 'Imported legacy case — already paid.',
    history: makeHistory([
      { at: '2024-08-14T10:05:00', by: 'Legacy Import',     field: 'Case',              from: null,                  to: 'Imported from 2024 Master Sheet' },
      { at: '2024-08-15T12:30:00', by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Ready for Invoice',   to: 'Invoice Generated' },
    ]),
  },
  {
    id: 'l25_182',
    ourRef: 'DEMO-2025-0182',
    source: 'Legacy 2025',
    facilityId: 'hmc',
    branchId: 'al_kawther',
    hotel: 'Palace Resort',
    patient: {
      name: 'Martin Blake', gender: 'Male', dob: '1968-01-29', nationality: 'British',
      room: '—', postalCode: 'M1 1AE', phone: '+44 161 555 0188',
      email: '', passport: 'GB-DEMO-LEG-2025',
      arrivalDate: '2025-09-18', departureDate: '2025-09-26',
      note: '',
    },
    visitDate: '2025-09-22T14:30:00',
    visitTime: '14:30',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Bupa',
    assistanceCompany: 'Tangiers',
    insuranceRef: 'BUPA-DEMO-2025-LEGACY-182',
    policyNumber: 'PL-DEMO-LEG-BUPA-25',
    caseProvider: 'Agency-Referred',
    coverageStatus: 'Details Pending',
    diagnosis: 'Outpatient consultation + labs',
    currency: 'GBP',
    serviceChargePct: 0,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: true, imaging: false, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: '2025-09-22T14:35:00', by: 'Legacy Import', field: 'Case', from: null, to: 'Imported from 2025 Master Sheet' },
    ]),
  },
  {
    id: 'l25_205',
    ourRef: 'DEMO-2025-0205',
    source: 'Legacy 2025',
    facilityId: 'smc',
    branchId: 'sahl_hasheesh',
    hotel: 'Sunrise Holidays Resort',
    patient: {
      name: 'Karel Dvořák', gender: 'Male', dob: '1980-04-18', nationality: 'Czech',
      room: '—', postalCode: '110 00', phone: '+420 222 555 0166',
      email: '', passport: 'CZ-DEMO-LEG-2025',
      arrivalDate: '2025-10-01', departureDate: '2025-10-08',
      note: '',
    },
    visitDate: '2025-10-04T09:00:00',
    visitTime: '09:00',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Cash',
    currency: 'EUR',
    invoiceTotal: 180,
    payments: [{ id: 'p1', amount: 180, currency: 'EUR', method: 'Cash', ref: '', note: '' }],
    settlementStatus: 'Paid in Full',
    mixedCurrency: false,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Closed',
    invoiceReadiness: 'Finalized',
    finalInvoiceAmount: 180,
    finalCurrency: 'EUR',
    history: makeHistory([
      { at: '2025-10-04T09:10:00', by: 'Legacy Import', field: 'Case', from: null, to: 'Imported from 2025 Master Sheet' },
    ]),
  },
  {
    id: 'l26_097',
    ourRef: 'DEMO-2026-0097',
    source: 'Legacy 2026',
    facilityId: 'smc',
    branchId: 'sahl_hasheesh',
    hotel: 'Tropitel Sahl Hasheesh',
    patient: {
      name: 'Sofia Novak', gender: 'Female', dob: '1995-10-11', nationality: 'Slovak',
      room: '—', postalCode: '811 01', phone: '+421 2 555 0144',
      email: '', passport: 'SK-DEMO-LEG-26',
      arrivalDate: '2026-02-09', departureDate: '2026-02-15',
      note: 'Inpatient ICU 2 nights — demo.',
    },
    visitDate: '2026-02-11T11:00:00',
    visitTime: '11:00',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Roland Assistance',
    assistanceCompany: 'Universal Air Assist',
    insuranceRef: 'ROL-DEMO-2026-LEGACY-97',
    policyNumber: 'PL-DEMO-LEG-ROL-26',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Confirmed',
    diagnosis: 'Inpatient ICU 2 nights — demo',
    currency: 'EUR',
    serviceChargePct: 20,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: true, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Ready for Invoice',
    history: makeHistory([
      { at: '2026-02-11T11:05:00', by: 'Legacy Import',     field: 'Case',              from: null,                  to: 'Imported from 2026 Master Sheet' },
      { at: '2026-04-02T08:15:00', by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Pending Information', to: 'Ready for Invoice' },
    ]),
  },
  {
    id: 'l26_104',
    ourRef: 'DEMO-2026-0104',
    source: 'Legacy 2026',
    facilityId: 'hmc',
    branchId: 'sheraton',
    hotel: 'Jaz Oriental',
    patient: {
      name: 'Hans Becker', gender: 'Male', dob: '1959-11-27', nationality: 'German',
      room: '—', postalCode: '80331', phone: '+49 89 555 0144',
      email: '', passport: 'DE-DEMO-LEG-26',
      arrivalDate: '2026-03-05', departureDate: '2026-03-12',
      note: '',
    },
    visitDate: '2026-03-08T16:45:00',
    visitTime: '16:45',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Cash',
    currency: 'EUR',
    invoiceTotal: 720,
    payments: [
      { id: 'p1', amount: 500,  currency: 'EUR', method: 'Cash',         ref: '',             note: '' },
      { id: 'p2', amount: 5500, currency: 'EGP', method: 'Visa / Card',  ref: 'AUTH-DM-1822', note: 'Card top-up' },
    ],
    settlementStatus: 'Partially Paid',
    mixedCurrency: true,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Open',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: '2026-03-08T17:00:00', by: 'Legacy Import', field: 'Case', from: null, to: 'Imported from 2026 Master Sheet' },
    ]),
  },
  {
    id: 'l26_119',
    ourRef: 'DEMO-2026-0119',
    source: 'Legacy 2026',
    facilityId: 'smc',
    branchId: 'mamsha',
    hotel: 'Pyramisa Sahl Hasheesh',
    patient: {
      name: 'Isabella Romano', gender: 'Female', dob: '1989-07-30', nationality: 'Italian',
      room: '—', postalCode: '20121', phone: '+39 02 555 0177',
      email: '', passport: 'IT-DEMO-LEG-26',
      arrivalDate: '2026-04-09', departureDate: '2026-04-16',
      note: '',
    },
    visitDate: '2026-04-12T08:00:00',
    visitTime: '08:00',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Generali',
    assistanceCompany: 'Coris',
    insuranceRef: 'GEN-DEMO-2026-LEGACY-119',
    policyNumber: 'PL-DEMO-LEG-GEN-26',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Confirmed',
    diagnosis: 'Outpatient gastro — demo',
    currency: 'EUR',
    serviceChargePct: 0,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: false, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Invoice Generated',
    finalInvoiceAmount: 295,
    finalCurrency: 'EUR',
    invoiceGeneratedAt: '2026-04-12T14:00:00',
    history: makeHistory([
      { at: '2026-04-12T08:05:00', by: 'Legacy Import',     field: 'Case',              from: null,                  to: 'Imported from 2026 Master Sheet' },
      { at: '2026-04-12T14:00:00', by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Ready for Invoice',   to: 'Invoice Generated' },
    ]),
  },
  {
    id: 'l24_007',
    ourRef: 'DEMO-2024-0007',
    source: 'Legacy 2024',
    facilityId: 'smc',
    branchId: 'sahl_hasheesh',
    hotel: 'Sentido Mamlouk Palace',
    patient: {
      name: 'Andre Janssen', gender: 'Male', dob: '1942-02-15', nationality: 'Dutch',
      room: '—', postalCode: '1011', phone: '+31 20 555 0188',
      email: '', passport: 'NL-DEMO-LEG-24',
      arrivalDate: '2024-03-08', departureDate: '2024-03-20',
      note: 'Elderly cardiac follow-up — demo.',
    },
    visitDate: '2024-03-11T07:45:00',
    visitTime: '07:45',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Mondial Assistance',
    assistanceCompany: 'Aetna Assistance',
    insuranceRef: 'MON-DEMO-2024-LEGACY-7',
    policyNumber: 'PL-DEMO-LEG-MON-24',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Confirmed',
    diagnosis: 'Elderly cardiac follow-up — demo',
    currency: 'EUR',
    serviceChargePct: 15,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: true, transfer_documents: false },
    caseStatus: 'Closed',
    invoiceReadiness: 'Finalized',
    finalInvoiceAmount: 2150,
    finalCurrency: 'EUR',
    invoiceGeneratedAt: '2024-03-12T10:00:00',
    externalBillingNote: 'Closed after Mondial settlement received.',
    history: makeHistory([
      { at: '2024-03-11T08:00:00', by: 'Legacy Import',     field: 'Case',         from: null,    to: 'Imported from 2024 Master Sheet' },
      { at: '2024-04-02T12:30:00', by: 'Demo Administrator', field: 'Case Status', from: 'Open',  to: 'Closed' },
    ]),
  },
  {
    id: 'l25_088',
    ourRef: 'DEMO-2025-0088',
    source: 'Legacy 2025',
    facilityId: 'hmc',
    branchId: 'pharaoh',
    hotel: 'Albatros Palace',
    patient: {
      name: 'Patricia O\'Connor', gender: 'Female', dob: '1976-12-04', nationality: 'Irish',
      room: '—', postalCode: 'D02 X285', phone: '+353 1 555 0144',
      email: '', passport: 'IE-DEMO-LEG-25',
      arrivalDate: '2025-05-15', departureDate: '2025-05-26',
      note: '',
    },
    visitDate: '2025-05-19T13:20:00',
    visitTime: '13:20',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'AIG Travel Guard',
    assistanceCompany: 'MedicAir',
    insuranceRef: 'AIG-DEMO-2025-LEGACY-88',
    policyNumber: 'PL-DEMO-LEG-AIG-25',
    caseProvider: 'Embassy Channel',
    coverageStatus: 'Under Review',
    diagnosis: 'Surgical day-case — demo',
    currency: 'GBP',
    serviceChargePct: 20,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: true, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Ready for Invoice',
    history: makeHistory([
      { at: '2025-05-19T13:25:00', by: 'Legacy Import',     field: 'Case',              from: null,                  to: 'Imported from 2025 Master Sheet' },
      { at: '2025-05-22T09:30:00', by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Pending Information', to: 'Ready for Invoice' },
    ]),
  },
  {
    id: 'm_admin_01',
    ourRef: 'DEMO-MANUAL-001',
    source: 'Manual Admin Entry',
    facilityId: 'hmc',
    branchId: 'menamark',
    hotel: 'Cleopatra Luxury Resort',
    patient: {
      name: 'Liam Murphy', gender: 'Male', dob: '1990-03-21', nationality: 'British',
      room: '—', postalCode: 'EH1 1YJ', phone: '+44 131 555 0144',
      email: '', passport: 'GB-DEMO-MAN-1',
      arrivalDate: '2026-05-19', departureDate: '2026-05-28',
      note: 'Late entry — paper case logged manually.',
    },
    visitDate: isoDays(-5, 11, 0),
    visitTime: '11:00',
    caseSource: 'Manual Admin Entry',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'Bupa',
    assistanceCompany: 'Tangiers',
    insuranceRef: 'BUPA-DEMO-2026-MANUAL-1',
    policyNumber: 'PL-DEMO-MAN-BUPA-1',
    caseProvider: 'Direct Provider Network',
    coverageStatus: 'Coverage Request Needed',
    diagnosis: 'Late entry — paper case logged manually',
    currency: 'GBP',
    serviceChargePct: 20,
    docsChecklist: { passport_id: true, insurance_document: false, medical_report: true, lab_results: false, imaging: false, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Pending Information',
    history: makeHistory([
      { at: isoDays(-5, 11, 5), by: 'Demo Administrator', field: 'Case', from: null, to: 'Created manually by admin' },
    ]),
  },

  // ---- A Portal case with admin-recorded final invoice (showcase) ----
  {
    id: 'c011',
    ourRef: 'DEMO-PORTAL-0021',
    source: 'Portal',
    facilityId: 'smc',
    branchId: 'mamsha',
    hotel: 'Movenpick Soma Bay',
    patient: {
      name: 'Greta Lindqvist', gender: 'Female', dob: '1983-01-09', nationality: 'Swedish',
      room: '802', postalCode: '113 30', phone: '+46 8 555 0123',
      email: 'g.lind.demo@example.test', passport: 'SE-DEMO-XX9911',
      arrivalDate: '2026-05-15', departureDate: '2026-05-27',
      note: 'Inpatient observation — single night.',
    },
    visitDate: isoDays(-1, 21, 10),
    visitTime: '21:10',
    caseSource: 'Hotel Call / Referral',
    route: 'Direct',
    financialType: 'Insurance',
    insuranceCompany: 'TUI Care+',
    assistanceCompany: 'Coris',
    insuranceRef: 'TUI-DEMO-2026-22014',
    policyNumber: 'PL-DEMO-TUI-552',
    caseProvider: 'Tour Operator Channel',
    coverageStatus: 'Confirmed',
    diagnosis: 'Inpatient observation 1 night',
    currency: 'EUR',
    serviceChargePct: 20,
    docsChecklist: { passport_id: true, insurance_document: true, medical_report: true, lab_results: true, imaging: false, transfer_documents: false },
    caseStatus: 'Reviewed',
    invoiceReadiness: 'Finalized',
    finalInvoiceAmount: 2456,
    finalCurrency: 'EUR',
    invoiceGeneratedAt: isoMins(-90),
    externalBillingNote: 'Approved invoice produced by Claude / Manager, recorded here.',
    adminNotes: 'Documents complete. Settlement expected within 30 days.',
    history: makeHistory([
      { at: isoDays(-1, 21, 15), by: 'SMC Reception',     field: 'Case',              from: null,                  to: 'Created' },
      { at: isoDays(-1, 22, 0),  by: 'SMC Reception',     field: 'Financial Type',    from: 'Pending',             to: 'Insurance' },
      { at: isoMins(-200),       by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Pending Information', to: 'Ready for Invoice' },
      { at: isoMins(-90),        by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Ready for Invoice',   to: 'Invoice Generated' },
      { at: isoMins(-30),        by: 'Demo Administrator', field: 'Invoice Readiness', from: 'Invoice Generated',   to: 'Finalized' },
    ]),
  },
]

// =====================================================================
// Helpers / aggregations
// =====================================================================
export function getCaseById(id) {
  return CASES.find((c) => c.id === id) || null
}

export function aggregateForAdmin(filter = {}) {
  const list = CASES.filter((c) => {
    if (filter.facilityId && filter.facilityId !== 'all' && c.facilityId !== filter.facilityId) return false
    if (filter.branchId   && filter.branchId   !== 'all' && c.branchId   !== filter.branchId)   return false
    if (filter.financial  && filter.financial  !== 'all' && c.financialType !== filter.financial) return false
    if (filter.route      && filter.route      !== 'all' && c.route          !== filter.route)      return false
    if (filter.status     && filter.status     !== 'all' && c.caseStatus     !== filter.status)     return false
    if (filter.date) {
      const day = (c.visitDate || '').slice(0, 10)
      if (filter.date !== 'all' && day !== filter.date) return false
    }
    return true
  })

  const totals = {
    total: list.length,
    cash: list.filter((c) => c.financialType === 'Cash').length,
    insurance: list.filter((c) => c.financialType === 'Insurance').length,
    pending: list.filter((c) => c.financialType === 'Pending').length,
    transfersOut: list.filter((c) => c.route === 'Transferred Out').length,
    transfersIn: list.filter((c) => c.route === 'Transferred In').length,
    ready: list.filter((c) => c.invoiceReadiness === 'Ready for Invoice').length,
    invoiced: list.filter((c) => c.invoiceReadiness === 'Invoice Generated').length,
    finalized: list.filter((c) => c.invoiceReadiness === 'Finalized').length,
    needsAdminReview: list.filter((c) =>
      c.mixedCurrency === true ||
      (c.financialType === 'Insurance' && c.coverageStatus === 'Coverage Request Needed') ||
      (c.financialType === 'Pending'),
    ).length,
  }

  // Cash totals by invoice currency
  const cashInvoiceByCurrency = {}
  for (const c of list) {
    if (c.financialType !== 'Cash') continue
    cashInvoiceByCurrency[c.currency] = (cashInvoiceByCurrency[c.currency] || 0) + (c.invoiceTotal || 0)
  }

  // Collections by method + currency
  const collections = {}
  for (const c of list) {
    if (c.financialType !== 'Cash') continue
    for (const p of c.payments || []) {
      const key = `${p.method}::${p.currency}`
      collections[key] = (collections[key] || 0) + (p.amount || 0)
    }
  }

  // Branch comparison
  const byBranch = {}
  for (const c of list) {
    const k = c.branchId
    if (!byBranch[k]) {
      byBranch[k] = {
        branchId: k,
        branchName: getBranchName(k),
        facilityId: c.facilityId,
        total: 0, cash: 0, insurance: 0, pending: 0,
        transfersIn: 0, transfersOut: 0,
      }
    }
    byBranch[k].total++
    if (c.financialType === 'Cash')      byBranch[k].cash++
    if (c.financialType === 'Insurance') byBranch[k].insurance++
    if (c.financialType === 'Pending')   byBranch[k].pending++
    if (c.route === 'Transferred In')  byBranch[k].transfersIn++
    if (c.route === 'Transferred Out') byBranch[k].transfersOut++
  }
  const branchComparison = Object.values(byBranch).sort((a, b) => b.total - a.total)

  // Invoice workflow summary
  const invoiceWorkflow = {}
  for (const c of list) {
    invoiceWorkflow[c.invoiceReadiness] = (invoiceWorkflow[c.invoiceReadiness] || 0) + 1
  }

  return {
    list,
    totals,
    cashInvoiceByCurrency,
    collections,
    insuranceCasesToday: list.filter((c) => c.financialType === 'Insurance'),
    transfersToday: list.filter((c) => c.route !== 'Direct'),
    branchComparison,
    invoiceWorkflow,
  }
}

/** Branch-only aggregation used by the clinic daily report. */
export function aggregateForBranch(branchId, filter = {}) {
  return aggregateForAdmin({ ...filter, branchId })
}

export const DEMO_TODAY = '2026-05-26'
export const DEMO_TODAY_LABEL = '26 May 2026'

// Backward-compat: P0 code used `byBranch` and `todayOnly` helpers
export function byBranchOnly(branchId, list = CASES) {
  return list.filter((c) => c.branchId === branchId)
}
export function todayOnly(list = CASES) {
  return list.filter((c) => (c.visitDate || '').slice(0, 10) === DEMO_TODAY)
}
