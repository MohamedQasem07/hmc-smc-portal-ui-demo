/* =========================================================================
 * PORTAL-UX-P2B.1 — Admin Control Center mock data
 * -----------------------------------------------------------------------
 * Every record here is INVENTED for the UI/UX prototype.
 * No real users, no real insurance companies, no real hotels.
 * Usage counts are demo numbers — not derived from real data.
 * ========================================================================= */

import { FACILITIES, BRANCHES } from './mock'

// ----------------------------------------------------------------
// BILLING FACILITIES — the medical entity under whose name an insurance case
// is opened and later invoiced. Separate concept from Operational Clinics.
// ----------------------------------------------------------------
export const BILLING_FACILITIES = [
  { id: 'hmc', name: 'Hurghada Medical Center',    shortName: 'HMC', isActive: true, usageCount: 14, kind: 'system' },
  { id: 'smc', name: 'Sahl Hasheesh Medical Centre', shortName: 'SMC', isActive: true, usageCount: 9,  kind: 'system' },
]

// ----------------------------------------------------------------
// Operational Clinics — extend BRANCHES with admin-governance fields.
// Each clinic has a default Billing Facility but a case may be invoiced under
// a different Billing Facility (Tropitel Clinic → opened under SMC).
// ----------------------------------------------------------------
export const CLINIC_TYPES = ['Main Branch', 'External Clinic', 'Receiving Branch']

export const CLINICS = BRANCHES.map((b, i) => ({
  id: b.id,
  name: b.name,
  defaultBillingFacility: b.facility, // default — may be overridden per-case
  city: b.city,
  area: b.mapHint || b.city,
  type: i === 0 || i === 4 ? 'Main Branch' : i % 2 === 0 ? 'External Clinic' : 'Receiving Branch',
  acceptsTransfers: true,
  isActive: true,
  assignedUsers: 1 + ((i * 3) % 4),
  casesCount: 6 + ((i * 7) % 17),
}))

// ----------------------------------------------------------------
// Users
// ----------------------------------------------------------------
export const ROLES = [
  { id: 'admin',          name: 'Admin' },
  { id: 'branch_manager', name: 'Branch Manager' },
  { id: 'clinic_user',    name: 'Reception / Clinic User' },
  { id: 'viewer',         name: 'Viewer' },
]

export const PERMISSIONS = [
  { id: 'register_cases',          label: 'Register New Cases',                clinic: true, default: { admin: true, branch_manager: true,  clinic_user: true,  viewer: false } },
  { id: 'edit_clinic_cases',       label: 'Edit Own Clinic Cases',             clinic: true, default: { admin: true, branch_manager: true,  clinic_user: true,  viewer: false } },
  { id: 'receive_transfers',       label: 'Receive Transfers',                 clinic: true, default: { admin: true, branch_manager: true,  clinic_user: true,  viewer: false } },
  { id: 'send_transfers',          label: 'Send Transfers',                    clinic: true, default: { admin: true, branch_manager: true,  clinic_user: true,  viewer: false } },
  { id: 'record_cash',             label: 'Record Cash Payments',              clinic: true, default: { admin: true, branch_manager: true,  clinic_user: true,  viewer: false } },
  { id: 'view_daily_report',       label: 'View Clinic Daily Report',          clinic: true, default: { admin: true, branch_manager: true,  clinic_user: true,  viewer: true  } },
  { id: 'view_monthly_report',     label: 'View Clinic Monthly Report',        clinic: true, default: { admin: true, branch_manager: true,  clinic_user: false, viewer: true  } },
  { id: 'view_all_clinics',        label: 'View All Clinics — Admin only',     clinic: false, default: { admin: true, branch_manager: false, clinic_user: false, viewer: false } },
  { id: 'access_control_center',   label: 'Access Admin Control Center — Admin only', clinic: false, default: { admin: true, branch_manager: false, clinic_user: false, viewer: false } },
  { id: 'access_invoice_manager',  label: 'Access Invoice Manager — Admin only / Future Protected Module', clinic: false, future: true, default: { admin: true, branch_manager: false, clinic_user: false, viewer: false } },
]

export const USERS = [
  {
    id: 'u_admin',
    name: 'Demo Admin',
    email: 'admin.demo@hmc.example',
    role: 'admin',
    facilityIds: ['hmc', 'smc'],
    clinicIds: [], // all
    status: 'Active',
    lastLogin: '2026-05-27T08:14:00',
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.id]: p.default.admin }), {}),
  },
  {
    id: 'u_tropitel_recep',
    name: 'Tropitel Reception Demo',
    email: 'reception.tropitel.demo@hmc.example',
    role: 'clinic_user',
    facilityIds: ['hmc'],
    clinicIds: ['tropitel'],
    status: 'Active',
    lastLogin: '2026-05-26T17:42:00',
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.id]: p.default.clinic_user }), {}),
  },
  {
    id: 'u_sheraton_recep',
    name: 'Sheraton Reception Demo',
    email: 'reception.sheraton.demo@hmc.example',
    role: 'clinic_user',
    facilityIds: ['hmc'],
    clinicIds: ['sheraton'],
    status: 'Active',
    lastLogin: '2026-05-26T20:15:00',
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.id]: p.default.clinic_user }), {}),
  },
  {
    id: 'u_sahl_manager',
    name: 'Sahl Hasheesh Manager Demo',
    email: 'manager.sahl.demo@smc.example',
    role: 'branch_manager',
    facilityIds: ['smc'],
    clinicIds: ['sahl_hasheesh', 'mamsha'],
    status: 'Active',
    lastLogin: '2026-05-27T07:55:00',
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.id]: p.default.branch_manager }), {}),
  },
  {
    id: 'u_inactive_demo',
    name: 'Old Account Demo',
    email: 'old.demo@hmc.example',
    role: 'viewer',
    facilityIds: ['hmc'],
    clinicIds: ['romance'],
    status: 'Inactive',
    lastLogin: '2025-12-04T14:10:00',
    permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.id]: p.default.viewer }), {}),
  },
]

// ----------------------------------------------------------------
// Transfer destinations
// ----------------------------------------------------------------
export const LOCATION_TYPES = ['Branch', 'Hospital', 'External Referral Location']

export const TRANSFER_DESTINATIONS = [
  ...CLINICS.map((c) => ({
    id: `td_${c.id}`,
    name: c.name,
    facility: c.facility,
    locationType: 'Branch',
    acceptsIncoming: true,
    isActive: true,
    usageCount: c.casesCount,
    kind: 'system',
  })),
  { id: 'td_ext_hghada_hospital', name: 'Hurghada Public Hospital (Demo)', facility: 'hmc', locationType: 'Hospital',                isActive: true,  acceptsIncoming: true,  usageCount: 3, kind: 'custom' },
  { id: 'td_ext_cardio_referral', name: 'Cairo Cardio Referral (Demo)',    facility: 'hmc', locationType: 'External Referral Location', isActive: true,  acceptsIncoming: false, usageCount: 1, kind: 'custom' },
  { id: 'td_unused_demo',         name: 'New Test Destination (Demo)',     facility: 'smc', locationType: 'External Referral Location', isActive: true,  acceptsIncoming: false, usageCount: 0, kind: 'custom' },
  { id: 'td_archived_demo',       name: 'Old External Clinic (Demo)',      facility: 'hmc', locationType: 'External Referral Location', isActive: false, acceptsIncoming: false, usageCount: 4, kind: 'custom' },
]

// ----------------------------------------------------------------
// Payment methods
// ----------------------------------------------------------------
export const PAYMENT_METHODS = [
  { id: 'pm_cash',     name: 'Cash',          isActive: true,  availableForClinic: true,  usageCount: 18, kind: 'system' },
  { id: 'pm_visa',     name: 'Visa / Card',   isActive: true,  availableForClinic: true,  usageCount: 11, kind: 'system' },
  { id: 'pm_bank',     name: 'Bank Transfer', isActive: true,  availableForClinic: true,  usageCount: 5,  kind: 'system' },
  { id: 'pm_other',    name: 'Other',         isActive: true,  availableForClinic: true,  usageCount: 2,  kind: 'system' },
  { id: 'pm_voucher',  name: 'Hotel Voucher (Demo)', isActive: true, availableForClinic: false, usageCount: 0, kind: 'custom' },
  { id: 'pm_archived', name: 'Crypto (Demo)', isActive: false, availableForClinic: false, usageCount: 0, kind: 'custom' },
]

// ----------------------------------------------------------------
// Insurance / Assistance / Provider companies
// ----------------------------------------------------------------
export const COMPANY_TYPES = ['Insurance Company', 'Assistance Company', 'Case Provider']

export const COMPANIES = [
  { id: 'co_atlas',     name: 'Atlas Travel Cover Demo',     type: 'Insurance Company',  status: 'Active', usageCount: 6, contactNote: 'EU coverage · 24/7 line' },
  { id: 'co_meridian',  name: 'Meridian Assistance Demo',    type: 'Assistance Company', status: 'Active', usageCount: 4, contactNote: 'Tour-operator partner' },
  { id: 'co_northsea',  name: 'NorthSea Health Support Demo',type: 'Insurance Company',  status: 'Active', usageCount: 2, contactNote: '' },
  { id: 'co_argo',      name: 'Argo Group Travel Demo',      type: 'Case Provider',      status: 'Active', usageCount: 1, contactNote: 'Embassy channel' },
  { id: 'co_unused',    name: 'New Partner — Onboarding (Demo)', type: 'Insurance Company', status: 'Active', usageCount: 0, contactNote: 'Test entry' },
  { id: 'co_archived',  name: 'Sunset Travel Cover (Demo)',  type: 'Insurance Company',  status: 'Archived', usageCount: 9, contactNote: 'Contract ended 2024' },
]

// ----------------------------------------------------------------
// Insurance workflow statuses
// ----------------------------------------------------------------
export const INSURANCE_WORKFLOW = [
  { id: 'iw_details',      name: 'Details Pending',     color: '#94A3B8', order: 1,  isActive: true,  casesCount: 4, kind: 'system' },
  { id: 'iw_noc_req',      name: 'NOC Requested',       color: '#F0A848', order: 2,  isActive: true,  casesCount: 3, kind: 'system' },
  { id: 'iw_noc_rcv',      name: 'NOC Received',        color: '#2DD4C7', order: 3,  isActive: true,  casesCount: 5, kind: 'system' },
  { id: 'iw_gop_req',      name: 'GOP Requested',       color: '#E1A148', order: 4,  isActive: true,  casesCount: 4, kind: 'system' },
  { id: 'iw_gop_rcv',      name: 'GOP Received',        color: '#0FB5A9', order: 5,  isActive: true,  casesCount: 7, kind: 'system' },
  { id: 'iw_fin_req',      name: 'Final GOP Requested', color: '#B98F50', order: 6,  isActive: true,  casesCount: 2, kind: 'system' },
  { id: 'iw_fin_rcv',      name: 'Final GOP Received',  color: '#0A8F87', order: 7,  isActive: true,  casesCount: 3, kind: 'system' },
  { id: 'iw_invoice',      name: 'Invoice Submitted',   color: '#5E83B5', order: 8,  isActive: true,  casesCount: 4, kind: 'system' },
  { id: 'iw_partial',      name: 'Partially Paid',      color: '#C68F32', order: 9,  isActive: true,  casesCount: 2, kind: 'system' },
  { id: 'iw_paid',         name: 'Paid',                color: '#0A8F62', order: 10, isActive: true,  casesCount: 12, kind: 'system' },
  { id: 'iw_rejected',     name: 'Rejected',            color: '#E26A6A', order: 11, isActive: true,  casesCount: 1, kind: 'system' },
  { id: 'iw_closed',       name: 'Closed',              color: '#475774', order: 12, isActive: true,  casesCount: 8, kind: 'system' },
  { id: 'iw_unused_demo',  name: 'Custom Pre-Auth (Demo)', color: '#6F5DCE', order: 13, isActive: true, casesCount: 0, kind: 'custom' },
]

// ----------------------------------------------------------------
// Operational case statuses — P2B.2 simplification: only Open / Closed.
// Route is tracked separately. Insurance progression is tracked separately.
// Payment status is tracked separately.
// ----------------------------------------------------------------
export const CASE_STATUSES_LIST = [
  { id: 'cs_open',   name: 'Open',   color: '#0FB5A9', isActive: true, casesCount: 17, kind: 'protected', helper: 'Case is currently open for work.' },
  { id: 'cs_closed', name: 'Closed', color: '#475774', isActive: true, casesCount: 23, kind: 'protected', helper: 'Case has been closed — settled, archived, or cancelled.' },
]

// ----------------------------------------------------------------
// Currencies — configurable, no exchange rates, grouped by original currency.
// ----------------------------------------------------------------
export const CURRENCIES_LIST = [
  { id: 'cur_egp', code: 'EGP', name: 'Egyptian Pound',        symbol: 'E£', isActive: true,  inRegistration: true,  inPayments: true,  usageCount: 18, kind: 'system' },
  { id: 'cur_eur', code: 'EUR', name: 'Euro',                  symbol: '€',  isActive: true,  inRegistration: true,  inPayments: true,  usageCount: 24, kind: 'system' },
  { id: 'cur_usd', code: 'USD', name: 'US Dollar',             symbol: '$',  isActive: true,  inRegistration: true,  inPayments: true,  usageCount: 4,  kind: 'system' },
  { id: 'cur_gbp', code: 'GBP', name: 'British Pound Sterling',symbol: '£',  isActive: true,  inRegistration: true,  inPayments: true,  usageCount: 6,  kind: 'system' },
]

// ----------------------------------------------------------------
// Reference lists (4 grouped sublists)
// ----------------------------------------------------------------
export const REFERENCE_LISTS = {
  hotels: {
    title: 'Hotels / Accommodation Locations',
    helper: 'Drives the hotel selector on Add New Case and the hotel column in reports.',
    items: [
      { id: 'h1', name: 'Coral Bay Resort Demo',   isActive: true,  usageCount: 9, kind: 'custom' },
      { id: 'h2', name: 'Marina Heights Hotel Demo', isActive: true, usageCount: 4, kind: 'custom' },
      { id: 'h3', name: 'Sunrise Lagoon Demo',     isActive: true,  usageCount: 2, kind: 'custom' },
      { id: 'h4', name: 'Stella Maris Beach Demo', isActive: true,  usageCount: 0, kind: 'custom' },
      { id: 'h5', name: 'Old Pyramid Inn Demo',    isActive: false, usageCount: 11, kind: 'custom' },
    ],
  },
  caseSources: {
    title: 'Case Sources',
    helper: 'Where the case originated. Selected on Add New Case · Section A.',
    items: [
      { id: 'src1', name: 'Walk-in',                isActive: true, usageCount: 8, kind: 'system' },
      { id: 'src2', name: 'Hotel Call / Referral',  isActive: true, usageCount: 4, kind: 'system' },
      { id: 'src3', name: 'Transfer Received',      isActive: true, usageCount: 2, kind: 'system' },
      { id: 'src4', name: 'Manual Admin Entry',     isActive: true, usageCount: 9, kind: 'system' },
    ],
  },
  transportTypes: {
    title: 'Transport Types',
    helper: 'For transferred cases — used in Add New Case · Section C.',
    items: [
      { id: 'tr1', name: 'Ambulance',             isActive: true, usageCount: 2, kind: 'system' },
      { id: 'tr2', name: 'Patient Own Transport', isActive: true, usageCount: 1, kind: 'system' },
      { id: 'tr3', name: 'Other',                 isActive: true, usageCount: 0, kind: 'system' },
    ],
  },
}

// ----------------------------------------------------------------
// Fixed protected system values — P2B.2: Currency removed (now configurable
// under its own module). Operational Status is also fixed (Open / Closed only).
// ----------------------------------------------------------------
export const PROTECTED_SYSTEM_VALUES = {
  financialType: {
    label: 'Financial Type',
    helper: 'Drives the financial classification of every case. Modifying these values affects every workflow and every report.',
    values: ['Pending', 'Cash', 'Insurance'],
  },
  route: {
    label: 'Route',
    helper: 'Drives the case route concept (direct visit or transfer between branches).',
    values: ['Direct', 'Transfer Sent', 'Transfer Received'],
  },
  operationalStatus: {
    label: 'Operational Status',
    helper: 'Simplified to Open / Closed. Route and insurance progression are tracked separately and never conflated with operational state.',
    values: ['Open', 'Closed'],
  },
}

// ----------------------------------------------------------------
// Repatriation entries — Admin-only minimal records of repatriation invoicing
// ----------------------------------------------------------------
export const REPATRIATION_ENTRIES = [
  {
    id: 'rep_001', ourRef: 'DEMO-REPAT-0001', patientName: 'Helmut Vogel (DEMO)', date: '2026-05-22',
    billingFacility: 'hmc',
    invoiceAmount: 8500, invoiceCurrency: 'EUR',
    paidAmount: 8500,   paidCurrency: 'EUR',
    paymentMethod: 'Bank Transfer', note: 'Insurance-funded repatriation — settled in full.',
    paymentStatus: 'Paid',
  },
  {
    id: 'rep_002', ourRef: 'DEMO-REPAT-0002', patientName: 'Eira Lindqvist (DEMO)', date: '2026-05-19',
    billingFacility: 'smc',
    invoiceAmount: 12200, invoiceCurrency: 'EUR',
    paidAmount: 200000,   paidCurrency: 'EGP',
    paymentMethod: 'Bank Transfer', note: 'Partial settlement received in EGP — Admin Review Required.',
    paymentStatus: 'Mixed Currency',
  },
  {
    id: 'rep_003', ourRef: 'DEMO-REPAT-0003', patientName: 'Karol Nowak (DEMO)', date: '2026-05-26',
    billingFacility: 'hmc',
    invoiceAmount: 6700, invoiceCurrency: 'GBP',
    paidAmount: 3000,    paidCurrency: 'GBP',
    paymentMethod: 'Visa / Card', note: '',
    paymentStatus: 'Partially Paid',
  },
  {
    id: 'rep_004', ourRef: 'DEMO-REPAT-0004', patientName: 'Margaux Roux (DEMO)', date: '2026-05-12',
    billingFacility: 'hmc',
    invoiceAmount: 4250, invoiceCurrency: 'EUR',
    paidAmount: 0,       paidCurrency: 'EUR',
    paymentMethod: '',   note: 'Awaiting bank transfer.',
    paymentStatus: 'Not Paid',
  },
]

// ----------------------------------------------------------------
// Legacy review demo records — clearly mock, never real Master Sheet rows
// ----------------------------------------------------------------
export const LEGACY_REVIEW_ROWS = [
  { id: 'lg_001', ourRef: 'DEMO-LEGACY-001', patientName: 'Patient A (DEMO)',  date: '2024-07-18', clinic: 'HMC Main',          billingFacility: 'hmc', financialType: 'Insurance', insuranceCompany: 'Atlas Travel Cover Demo', insuranceRef: 'ATC-DEMO-LEG-0042', invoiceAmount: 1840, currency: 'EUR', matchStatus: 'Match Found',     conflict: null },
  { id: 'lg_002', ourRef: 'DEMO-LEGACY-002', patientName: 'Patient B (DEMO)',  date: '2024-09-04', clinic: 'SMC Main',          billingFacility: 'smc', financialType: 'Cash',      insuranceCompany: '',                          insuranceRef: '',                  invoiceAmount: 320,  currency: 'EUR', matchStatus: 'New Case',        conflict: null },
  { id: 'lg_003', ourRef: 'DEMO-LEGACY-003', patientName: 'Patient C (DEMO)',  date: '2025-01-22', clinic: 'Sheraton Branch',   billingFacility: 'hmc', financialType: 'Insurance', insuranceCompany: 'Meridian Assistance Demo',  insuranceRef: 'MER-DEMO-LEG-0190', invoiceAmount: 2150, currency: 'EUR', matchStatus: 'Possible Match', conflict: 'Same patient name across two visit dates' },
  { id: 'lg_004', ourRef: 'DEMO-LEGACY-004', patientName: 'Patient D (DEMO)',  date: '2025-05-09', clinic: 'Tropitel Clinic',   billingFacility: 'smc', financialType: 'Insurance', insuranceCompany: 'NorthSea Health Support Demo', insuranceRef: 'NSH-DEMO-LEG-0211', invoiceAmount: 612,  currency: 'EUR', matchStatus: 'Missing Field',   conflict: 'No GOP status recorded' },
  { id: 'lg_005', ourRef: 'DEMO-LEGACY-005', patientName: 'Patient E (DEMO)',  date: '2025-08-30', clinic: 'Mamsha Clinic',     billingFacility: 'smc', financialType: 'Cash',      insuranceCompany: '',                          insuranceRef: '',                  invoiceAmount: 95,   currency: 'EUR', matchStatus: 'New Case',        conflict: null },
  { id: 'lg_006', ourRef: 'DEMO-LEGACY-006', patientName: 'Patient F (DEMO)',  date: '2025-11-11', clinic: 'Al-Kawther Branch', billingFacility: 'hmc', financialType: 'Insurance', insuranceCompany: 'Atlas Travel Cover Demo',   insuranceRef: 'ATC-DEMO-LEG-0356', invoiceAmount: 1440, currency: 'GBP', matchStatus: 'Match Found',     conflict: null },
  { id: 'lg_007', ourRef: 'DEMO-LEGACY-007', patientName: 'Patient G (DEMO)',  date: '2026-01-08', clinic: 'Romance Clinic',    billingFacility: 'hmc', financialType: 'Insurance', insuranceCompany: 'Argo Group Travel Demo',    insuranceRef: 'ARG-DEMO-LEG-0408', invoiceAmount: 2956, currency: 'EUR', matchStatus: 'Possible Match', conflict: 'Insurance ref similar to active Portal case' },
  { id: 'lg_008', ourRef: 'DEMO-LEGACY-008', patientName: 'Patient H (DEMO)',  date: '2026-03-14', clinic: 'Pharaoh Clinic',    billingFacility: 'hmc', financialType: 'Cash',      insuranceCompany: '',                          insuranceRef: '',                  invoiceAmount: 480,  currency: 'EUR', matchStatus: 'Missing Field',   conflict: 'Payment method not recorded' },
]

// ----------------------------------------------------------------
// Change history (mock)
// ----------------------------------------------------------------
export const CHANGE_HISTORY = [
  { at: '2026-05-27T08:14:00', by: 'Demo Admin', module: 'Insurance Workflow Statuses', action: 'Color changed', target: 'GOP Received',         from: '#5E83B5', to: '#0FB5A9' },
  { at: '2026-05-27T08:08:00', by: 'Demo Admin', module: 'Payment Methods',             action: 'Archived',       target: 'Crypto (Demo)',       from: 'Active',  to: 'Archived' },
  { at: '2026-05-27T08:01:00', by: 'Demo Admin', module: 'Users & Access',              action: 'Clinic assigned', target: 'Tropitel Reception Demo', from: '—',  to: 'Tropitel Clinic' },
  { at: '2026-05-26T19:42:00', by: 'Demo Admin', module: 'Insurance & Assistance',      action: 'Created',        target: 'NorthSea Health Support Demo', from: '—', to: 'Insurance Company' },
  { at: '2026-05-26T17:30:00', by: 'Demo Admin', module: 'Reference Lists · Hotels',    action: 'Added value',    target: 'Coral Bay Resort Demo', from: '—',     to: 'Active' },
  { at: '2026-05-26T11:18:00', by: 'Demo Admin', module: 'Facilities & Clinics',        action: 'Status changed', target: 'Romance Clinic',      from: 'Active',  to: 'Inactive', reason: 'Seasonal closure (demo)' },
  { at: '2026-05-26T10:50:00', by: 'Demo Admin', module: 'Insurance Workflow Statuses', action: 'Reordered',      target: 'Final GOP Requested',  from: 'Order 6', to: 'Order 7' },
  { at: '2026-05-25T15:22:00', by: 'Demo Admin', module: 'Users & Access',              action: 'Deactivated',    target: 'Old Account Demo',     from: 'Active',  to: 'Inactive' },
]

// ----------------------------------------------------------------
// Governance summary KPIs
// ----------------------------------------------------------------
export function governanceSummary() {
  return {
    billingFacilities:    BILLING_FACILITIES.filter((f) => f.isActive).length,
    activeClinics:        CLINICS.filter((c) => c.isActive).length,
    activeUsers:          USERS.filter((u) => u.status === 'Active').length,
    paymentMethods:       PAYMENT_METHODS.filter((p) => p.isActive).length,
    currencies:           CURRENCIES_LIST.filter((c) => c.isActive).length,
    insuranceStatuses:    INSURANCE_WORKFLOW.filter((s) => s.isActive).length,
    archivedValues:
      PAYMENT_METHODS.filter((p) => !p.isActive).length +
      CLINICS.filter((c) => !c.isActive).length +
      USERS.filter((u) => u.status !== 'Active').length +
      TRANSFER_DESTINATIONS.filter((d) => !d.isActive).length +
      COMPANIES.filter((c) => c.status === 'Archived').length +
      Object.values(REFERENCE_LISTS).reduce((n, g) => n + g.items.filter((i) => !i.isActive).length, 0),
    pendingReview: 3, // demo — items waiting on the owner's review
  }
}
