/* =========================================================================
 * P2C.R3.1 — UAT Review Dataset Builder
 * -----------------------------------------------------------------------
 * Produces a full, structured runtime state for Mohamed's local UAT pass.
 * Replaces the old arbitrary R1 demo seed.
 *
 * Coverage:
 *   For EVERY external clinic (Tropitel / Romance / Sahl Hasheesh /
 *   Mamsha / Pharaoh / Menamark) AND for both branches (Al-Kawther /
 *   Sheraton) — generate:
 *
 *     1) One Cash Case — EUR invoice paid fully by Visa/Card in EGP
 *     2) One Cash Case — EUR invoice paid as EGP physical cash + EUR physical cash (mixed)
 *     3) One Insurance Case (Stage 1 only — admin completion pending)
 *     4) One valid same-currency cash expense (clinics only)
 *     5) One nurse shift (start + end) + one doctor on duty
 *
 *   PLUS:
 *     6) One transfer from an external clinic → Al-Kawther, received, room assigned
 *     7) One transfer from an external clinic → Sheraton, received, room assigned
 *
 * Every record is clearly labelled "DEMO / UAT" and uses the same case /
 * payment-line schemas as actual runtime registrations. No backend, no
 * persistence — this dataset lives in React state until refresh or reset.
 * ========================================================================= */

import { EXTERNAL_CLINICS, RECEIVING_BRANCHES, getClinicName } from './p2c'
import { SEED_STAFF, SEED_USERS } from './staffUsers'
import { generateOurRef } from '../lib/ourRef'

const UAT_DATE = '2026-05-27'
const TODAY = new Date('2026-05-27T10:00:00')

function iso(h, m = 0, dayOffset = 0) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// Demo patient pool — clearly labelled, includes DOB for age auto-calc verification
const DEMO_PATIENTS = [
  { firstName: 'Demo UAT', lastName: 'Patient Anders',    gender: 'Male',   dob: '15.06.1980', nationality: 'German',  phoneCode: '+49',  phone: '17612345001', email: 'demo.anders@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Brigitte',  gender: 'Female', dob: '03.11.1992', nationality: 'French',  phoneCode: '+33',  phone: '612340002',   email: 'demo.brigitte@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Carla',     gender: 'Female', dob: '22.07.1975', nationality: 'Italian', phoneCode: '+39',  phone: '3471230003',  email: 'demo.carla@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Daan',      gender: 'Male',   dob: '11.02.1988', nationality: 'Dutch',   phoneCode: '+31',  phone: '612340004',   email: 'demo.daan@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Edith',     gender: 'Female', dob: '07.09.1965', nationality: 'British', phoneCode: '+44',  phone: '7700900005',  email: 'demo.edith@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Frantisek', gender: 'Male',   dob: '28.04.1970', nationality: 'Czech',   phoneCode: '+420', phone: '601230006',   email: 'demo.frantisek@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Greta',     gender: 'Female', dob: '14.12.1985', nationality: 'German',  phoneCode: '+49',  phone: '17612340007', email: 'demo.greta@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Henrik',    gender: 'Male',   dob: '09.05.1972', nationality: 'Swedish', phoneCode: '+46',  phone: '701230008',   email: 'demo.henrik@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Iza',       gender: 'Female', dob: '17.10.1990', nationality: 'Polish',  phoneCode: '+48',  phone: '601230009',   email: 'demo.iza@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Jan',       gender: 'Male',   dob: '01.03.1968', nationality: 'Czech',   phoneCode: '+420', phone: '601230010',   email: 'demo.jan@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Klaus',     gender: 'Male',   dob: '25.08.1955', nationality: 'German',  phoneCode: '+49',  phone: '17612340011', email: 'demo.klaus@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Lena',      gender: 'Female', dob: '19.06.1995', nationality: 'Greek',   phoneCode: '+30',  phone: '6971234012',  email: 'demo.lena@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Mateo',     gender: 'Male',   dob: '06.01.1962', nationality: 'Spanish', phoneCode: '+34',  phone: '612340013',   email: 'demo.mateo@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Nora',      gender: 'Female', dob: '12.08.1978', nationality: 'British', phoneCode: '+44',  phone: '7700900014',  email: 'demo.nora@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Olaf',      gender: 'Male',   dob: '04.04.1983', nationality: 'Belgian', phoneCode: '+32',  phone: '470123015',   email: 'demo.olaf@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Petra',     gender: 'Female', dob: '30.11.1969', nationality: 'Hungarian', phoneCode: '+36', phone: '301230016',  email: 'demo.petra@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Quentin',   gender: 'Male',   dob: '18.07.1996', nationality: 'French',  phoneCode: '+33',  phone: '612340017',   email: 'demo.quentin@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Riikka',    gender: 'Female', dob: '23.02.1971', nationality: 'Other',   phoneCode: '+46',  phone: '701230018',   email: 'demo.riikka@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Sven',      gender: 'Male',   dob: '08.10.1958', nationality: 'Swedish', phoneCode: '+46',  phone: '701230019',   email: 'demo.sven@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Teresa',    gender: 'Female', dob: '13.05.1986', nationality: 'Italian', phoneCode: '+39',  phone: '3471230020',  email: 'demo.teresa@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Ulrich',    gender: 'Male',   dob: '21.09.1974', nationality: 'German',  phoneCode: '+49',  phone: '17612340021', email: 'demo.ulrich@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Viktor',    gender: 'Male',   dob: '02.12.1981', nationality: 'Czech',   phoneCode: '+420', phone: '601230022',   email: 'demo.viktor@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Wanda',     gender: 'Female', dob: '16.03.1989', nationality: 'Polish',  phoneCode: '+48',  phone: '601230023',   email: 'demo.wanda@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Xander',    gender: 'Male',   dob: '29.06.1977', nationality: 'Dutch',   phoneCode: '+31',  phone: '612340024',   email: 'demo.xander@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Yara',      gender: 'Female', dob: '05.01.1984', nationality: 'Belgian', phoneCode: '+32',  phone: '470123025',   email: 'demo.yara@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Zoltan',    gender: 'Male',   dob: '20.11.1973', nationality: 'Hungarian', phoneCode: '+36', phone: '301230026',  email: 'demo.zoltan@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Adam',      gender: 'Male',   dob: '10.07.1964', nationality: 'British', phoneCode: '+44',  phone: '7700900027',  email: 'demo.adam@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Beata',     gender: 'Female', dob: '26.04.1991', nationality: 'Polish',  phoneCode: '+48',  phone: '601230028',   email: 'demo.beata@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Cyril',     gender: 'Male',   dob: '24.08.1960', nationality: 'French',  phoneCode: '+33',  phone: '612340029',   email: 'demo.cyril@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Dora',      gender: 'Female', dob: '15.10.1979', nationality: 'Greek',   phoneCode: '+30',  phone: '6971234030',  email: 'demo.dora@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Erik',      gender: 'Male',   dob: '07.03.1987', nationality: 'Swedish', phoneCode: '+46',  phone: '701230031',   email: 'demo.erik@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Fiona',     gender: 'Female', dob: '11.06.1993', nationality: 'British', phoneCode: '+44',  phone: '7700900032',  email: 'demo.fiona@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Gabor',     gender: 'Male',   dob: '03.02.1966', nationality: 'Hungarian', phoneCode: '+36', phone: '301230033',  email: 'demo.gabor@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Hella',     gender: 'Female', dob: '28.05.1982', nationality: 'German',  phoneCode: '+49',  phone: '17612340034', email: 'demo.hella@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Ivan',      gender: 'Male',   dob: '14.09.1976', nationality: 'Czech',   phoneCode: '+420', phone: '601230035',   email: 'demo.ivan@uat.example' },
  { firstName: 'Demo UAT', lastName: 'Patient Juno',      gender: 'Female', dob: '22.12.1994', nationality: 'Italian', phoneCode: '+39',  phone: '3471230036',  email: 'demo.juno@uat.example' },
]

const UAT_INSURERS = [
  { name: 'Demo Allianz Worldwide Care', email: 'claims@demo-allianz.example',   phone: '+49 89 1234567' },
  { name: 'Demo AXA Assistance',         email: 'claims@demo-axa.example',       phone: '+33 1 2345 6789' },
  { name: 'Demo Roland Assistance',      email: 'roland@demo-roland.example',    phone: '+49 30 1234567' },
  { name: 'Demo Europ Care',             email: 'claims@demo-europcare.example', phone: '+33 4 1234567' },
  { name: 'Demo GlobalMed Assist',       email: 'ops@demo-globalmed.example',    phone: '+44 20 12345678' },
]

const LOCATIONS = ['tropitel', 'romance', 'sahl_hasheesh', 'mamsha', 'pharaoh', 'menamark', 'al_kawther', 'sheraton']

// Helpers -----------------------------------------------------------

function makeId(prefix) { return `${prefix}_${Math.random().toString(36).slice(2, 10)}` }

function clinicConfig(locId) {
  const cl = EXTERNAL_CLINICS.find((c) => c.id === locId)
  if (cl) return { id: cl.id, name: cl.name, kind: 'external', hotel: cl.hotel }
  const br = RECEIVING_BRANCHES.find((b) => b.id === locId)
  if (br) return { id: br.id, name: br.name, kind: 'branch', hotel: null }
  return null
}

function patientObj(p, hotel) {
  const roomNo = String(200 + Math.floor(Math.random() * 500))
  return {
    firstName: p.firstName, lastName: p.lastName,
    name: `${p.firstName} ${p.lastName}`,
    gender: p.gender, dob: p.dob, nationality: p.nationality,
    hotel: hotel || '', hotelRoom: roomNo,
    address: hotel ? `${hotel} — Room ${roomNo}` : '',
    postal: '',
    phoneCode: p.phoneCode, phone: p.phone, email: p.email,
    note: 'DEMO / UAT patient — placeholder clinical note.',
  }
}

function picker(list) {
  let i = 0
  return () => list[i++ % list.length]
}

// Build core case shape -------------------------------------------------

function baseCase(opts) {
  const {
    id, ourRef, locId, locName, locKind, patient, hour, encounterPattern, transfer = null,
    financialType, billingFacility = null, insurance = null,
    invoice = null, paymentLines = [], excessLines = [], hasPatientExcess = false,
    excessAmount = null, excessCurrency = null, settlement = null,
    visitDate, treatmentMode = null, centerRoomNumber = null, operationalStatus = 'Open',
    insuranceCompletion = null,
  } = opts
  const visitIso = visitDate || iso(hour, 0)
  const isInpatient = encounterPattern === 'inpatient_admission'
  return {
    id,
    ourRef,
    registeredAtId: locId,
    registeredAtName: locName,
    registeredAtKind: locKind,
    visitDate: visitIso,
    patient,
    route: transfer ? `to_${transfer.toBranchId}` : 'direct',
    routeLabel: transfer ? `Transfer to ${transfer.toBranchName}` : `Direct at ${locName}`,
    financialType,
    billingFacility,
    insurance,
    hasPatientExcess, excessAmount, excessCurrency,
    excessLines,
    invoice,
    paymentLines,
    settlement,
    transfer,
    treatmentMode,
    centerRoomNumber,
    operationalStatus,
    notes: 'DEMO / UAT case — auto-generated by Load UAT Review Dataset.',
    encounterPattern: encounterPattern || 'outpatient_single',
    visit: encounterPattern === 'outpatient_single' ? { checkInAt: visitIso, checkOutAt: null, status: 'active' } : null,
    sessions: encounterPattern === 'outpatient_multi' ? [{ id: makeId('ses'), date: visitIso, checkInAt: visitIso, checkOutAt: null, status: 'active', note: 'Session 1' }] : [],
    admission: isInpatient ? { admittedAt: visitIso, dischargedAt: null, status: 'admitted' } : null,
    insuranceCompletion,
  }
}

// Build the full UAT state ---------------------------------------------

export function buildUatState() {
  // Start from empty state, mutate cases + ancillary slices.
  const pickPatient = picker(DEMO_PATIENTS)
  const pickInsurer = picker(UAT_INSURERS)
  const allRefs = []
  const cases = []
  const nurseShifts = []
  const doctorOnDuty = {}
  const expenses = []
  const handovers = []
  const confirmedVisaLineIds = {}

  // Empty room boards — will be filled by transfer-room-assign steps
  const roomBoard = {
    al_kawther: Array.from({ length: 15 }, (_, i) => ({ branchId: 'al_kawther', number: i + 1, label: `Room ${String(i + 1).padStart(2, '0')}`, caseId: null, occupant: null, status: 'available' })),
    sheraton:   Array.from({ length: 15 }, (_, i) => ({ branchId: 'sheraton',   number: i + 1, label: `Room ${String(i + 1).padStart(2, '0')}`, caseId: null, occupant: null, status: 'available' })),
  }

  // Seed treasury overlay (zero baseline)
  const zeroBalances = () => ({
    EGP: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    EUR: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    USD: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    GBP: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
  })
  const seedTreasury = {}
  for (const loc of LOCATIONS) seedTreasury[loc] = zeroBalances()
  const seedVisaBank = {}
  for (const loc of LOCATIONS) seedVisaBank[loc] = { totalMovements: 0, movementsCount: 0, confirmedInHandover: 0, get pending() { return this.totalMovements - this.confirmedInHandover } }

  // Helper: emit an OUR Ref consistent with the location's family
  function emitRef(locKind, locId, billingFacility) {
    const r = generateOurRef(allRefs, { registeredAtKind: locKind, registeredAtId: locId, billingFacility })
    allRefs.push(r.ref)
    return r
  }

  // ── For each location: 3 cases (Visa-only, Mixed-cash, Insurance) + expense (clinic only) + nurse shift + doctor on duty
  let hourSlot = 8
  for (const locId of LOCATIONS) {
    const cfg = clinicConfig(locId)
    if (!cfg) continue
    const isBranch = cfg.kind === 'branch'
    hourSlot = 8

    // CASE 1 — Visa-only EUR invoice
    {
      const patient = pickPatient()
      const ref = emitRef(cfg.kind, cfg.id, null)
      const lineId = makeId('pl')
      const c = baseCase({
        id: makeId('uat'),
        ourRef: ref.ref,
        locId: cfg.id, locName: cfg.name, locKind: cfg.kind,
        patient: patientObj(patient, cfg.hotel || 'DEMO Hotel'),
        hour: hourSlot++,
        encounterPattern: 'outpatient_single',
        financialType: 'Cash',
        invoice: { number: ref.ref, amount: 100, currency: 'EUR' },
        paymentLines: [{
          id: lineId, type: 'Invoice Payment', method: 'Visa / Card',
          fxRefCurrency: 'EUR', fxRefAmount: 100, fxRate: 62.00,
          actualCurrency: 'EGP', amount: 6200, actualAmount: 6200,
          currency: 'EGP', // back-compat
          note: 'UAT — full Visa/Card payment of EUR invoice settled in EGP @62',
        }],
        settlement: 'Paid',
        operationalStatus: 'Closed',
      })
      cases.push(c)
    }

    // CASE 2 — Mixed cash: EUR 100 cash + EGP 6,200 cash (100 EUR @62 FX)
    {
      const patient = pickPatient()
      const ref = emitRef(cfg.kind, cfg.id, null)
      const eurLineId = makeId('pl')
      const egpLineId = makeId('pl')
      const c = baseCase({
        id: makeId('uat'),
        ourRef: ref.ref,
        locId: cfg.id, locName: cfg.name, locKind: cfg.kind,
        patient: patientObj(patient, cfg.hotel || 'DEMO Hotel'),
        hour: hourSlot++,
        encounterPattern: 'outpatient_single',
        financialType: 'Cash',
        invoice: { number: ref.ref, amount: 200, currency: 'EUR' },
        paymentLines: [
          {
            id: eurLineId, type: 'Invoice Payment', method: 'Cash',
            fxRefCurrency: 'EUR', fxRefAmount: 100, fxRate: '',
            actualCurrency: 'EUR', amount: 100, actualAmount: 100,
            currency: 'EUR',
            note: 'UAT — EUR 100 cash (same-currency)',
          },
          {
            id: egpLineId, type: 'Invoice Payment', method: 'Cash',
            fxRefCurrency: 'EUR', fxRefAmount: 100, fxRate: 62.00,
            actualCurrency: 'EGP', amount: 6200, actualAmount: 6200,
            currency: 'EGP',
            note: 'UAT — EUR 100 paid as EGP cash @62 FX',
          },
        ],
        settlement: 'Paid',
        operationalStatus: 'Closed',
      })
      cases.push(c)
    }

    // CASE 3 — Insurance (Stage 1 only)
    {
      const patient = pickPatient()
      const insurer = pickInsurer()
      const facility = (Math.random() < 0.5) ? 'HMC' : 'SMC'
      const ref = emitRef(cfg.kind, cfg.id, facility)
      const c = baseCase({
        id: makeId('uat'),
        ourRef: ref.ref,
        locId: cfg.id, locName: cfg.name, locKind: cfg.kind,
        patient: patientObj(patient, cfg.hotel || 'DEMO Hotel'),
        hour: hourSlot++,
        encounterPattern: 'outpatient_single',
        financialType: 'Insurance',
        billingFacility: facility,
        insurance: {
          stage1: {
            company: insurer.name,
            ref: `UAT-INS-${Math.floor(10000 + Math.random() * 89999)}`,
            email: insurer.email,
            phone: insurer.phone,
          },
        },
        // back-compat: also flat `insurance` shape used in older readers
        insuranceCompletion: null,
        operationalStatus: 'Open',
      })
      // Provide a backward-compatible flat insurance object too
      c.insurance = {
        company: insurer.name,
        ref: `UAT-INS-${Math.floor(10000 + Math.random() * 89999)}`,
        email: insurer.email,
        phone: insurer.phone,
        stage1: {
          company: insurer.name,
          ref: `UAT-INS-${Math.floor(10000 + Math.random() * 89999)}`,
          email: insurer.email,
          phone: insurer.phone,
        },
      }
      cases.push(c)
    }

    // EXPENSE — clinics only
    if (!isBranch) {
      // Need EGP cash balance to deduct — case 2 added EGP 6200 → 100 EGP expense is fine
      expenses.push({
        id: makeId('ex'), clinicId: cfg.id,
        at: iso(13, 0), currency: 'EGP', amount: 100,
        category: 'Cleaning Supplies',
        note: 'DEMO / UAT expense — valid EGP cash spend',
        paidFrom: 'Physical Cash Balance',
      })
    }

    // NURSE SHIFT — start + closed shift example
    nurseShifts.push({
      id: makeId('sh'), clinicId: cfg.id,
      nurseId: defaultNurseFor(cfg.id), startedAt: iso(9, 0),
      endedAt: null, status: 'active',
    })
    nurseShifts.push({
      id: makeId('sh'), clinicId: cfg.id,
      nurseId: secondNurseFor(cfg.id), startedAt: iso(7, 0, -1),
      endedAt: iso(15, 0, -1), status: 'closed',
    })

    // DOCTOR ON DUTY for today
    doctorOnDuty[cfg.id] = { date: UAT_DATE, doctorId: defaultDoctorFor(cfg.id) }
  }

  // ── Transfers: one each from external clinics to Al-Kawther + Sheraton, received + roomed
  // Choose two source clinics
  const sourceClinicsForTransfer = ['tropitel', 'romance']
  const transferTargets = [
    { toBranchId: 'al_kawther', toBranchName: 'Al-Kawther Branch', room: 5 },
    { toBranchId: 'sheraton',   toBranchName: 'Sheraton Branch',   room: 8 },
  ]
  for (let i = 0; i < transferTargets.length; i++) {
    const src = sourceClinicsForTransfer[i]
    const cfg = clinicConfig(src)
    const target = transferTargets[i]
    const patient = pickPatient()
    // Branch transfers use the receiving branch's family
    const ref = emitRef('branch', target.toBranchId, 'HMC')
    const c = baseCase({
      id: makeId('uat'),
      ourRef: ref.ref,
      locId: cfg.id, locName: cfg.name, locKind: cfg.kind,
      patient: patientObj(patient, cfg.hotel),
      hour: 11 + i,
      encounterPattern: 'inpatient_admission',
      financialType: 'Insurance',
      billingFacility: 'HMC',
      insurance: {
        company: UAT_INSURERS[0].name,
        ref: `UAT-INS-TR-${Math.floor(10000 + Math.random() * 89999)}`,
        email: UAT_INSURERS[0].email,
        phone: UAT_INSURERS[0].phone,
        stage1: { company: UAT_INSURERS[0].name, ref: `UAT-INS-TR-${Math.floor(10000 + Math.random() * 89999)}`, email: UAT_INSURERS[0].email, phone: UAT_INSURERS[0].phone },
      },
      transfer: {
        toBranchId: target.toBranchId,
        toBranchName: target.toBranchName,
        reason: 'DEMO / UAT transfer — needs branch admission.',
        transport: 'Ambulance',
        referralNote: 'UAT scenario',
        sentAt: iso(10 + i, 0),
        receivedAt: iso(11 + i, 0),
        status: 'Received',
      },
      treatmentMode: 'conservative',
      centerRoomNumber: target.room,
      operationalStatus: 'Open',
    })
    cases.push(c)
    // Occupy the room
    const board = roomBoard[target.toBranchId]
    const slot = board.find((r) => r.number === target.room)
    if (slot) { slot.status = 'occupied'; slot.caseId = c.id }
  }

  return {
    cases,
    roomBoard,
    nurseShifts,
    doctorOnDuty,
    expenses,
    handovers,
    seedTreasury,
    seedVisaBank,
    pendingExpenses: [],
    runtimeFeedback: null,
    confirmedVisaLineIds,
    insurers: [
      { id: 'ins_demo_allianz',   name: 'Demo Allianz Worldwide Care', email: 'claims@demo-allianz.example',   phone: '+49 89 1234567' },
      { id: 'ins_demo_axa',       name: 'Demo AXA Assistance',         email: 'claims@demo-axa.example',       phone: '+33 1 2345 6789' },
      { id: 'ins_demo_roland',    name: 'Demo Roland Assistance',      email: 'roland@demo-roland.example',    phone: '+49 30 1234567' },
      { id: 'ins_demo_europcare', name: 'Demo Europ Care',             email: 'claims@demo-europcare.example', phone: '+33 4 1234567' },
      { id: 'ins_demo_globalmed', name: 'Demo GlobalMed Assist',       email: 'ops@demo-globalmed.example',    phone: '+44 20 12345678' },
    ],
    localAssistance: [
      { id: 'la_demo_egycare', name: 'Demo EgyCare Assistance Ltd' },
      { id: 'la_demo_pharaoh', name: 'Demo Pharaoh Assist' },
      { id: 'la_demo_redseaaid', name: 'Demo Red Sea Aid' },
    ],
    uatMode: 'uat-loaded',
    // P2C.R4 — Preserve the seeded Staff Directory and Portal Users so the
    // UAT cases (which reference these IDs in attendance & users) resolve.
    staff: SEED_STAFF.map((s) => ({ ...s })),
    users: SEED_USERS.map((u) => ({ ...u })),
  }
}

// Default nurse/doctor selectors per location ---------------------------
function defaultNurseFor(locId) {
  const map = {
    tropitel: 'n_trop_1', romance: 'n_rom_1', sahl_hasheesh: 'n_shc_1',
    mamsha: 'n_mam_1', pharaoh: 'n_pha_1', menamark: 'n_men_1',
    al_kawther: 'n_kaw_1', sheraton: 'n_sher_1',
  }
  return map[locId] || 'n_trop_1'
}
function secondNurseFor(locId) {
  const map = {
    tropitel: 'n_trop_2', romance: 'n_rom_2', sahl_hasheesh: 'n_shc_2',
    mamsha: 'n_mam_2', pharaoh: 'n_pha_1', menamark: 'n_men_2',
    al_kawther: 'n_kaw_2', sheraton: 'n_sher_2',
  }
  return map[locId] || 'n_trop_2'
}
function defaultDoctorFor(locId) {
  const map = {
    tropitel: 'd_trop_1', romance: 'd_rom_1', sahl_hasheesh: 'd_shc_1',
    mamsha: 'd_mam_1', pharaoh: 'd_pha_1', menamark: 'd_men_1',
    al_kawther: 'd_kaw_1', sheraton: 'd_sher_2',
  }
  return map[locId] || 'd_trop_1'
}
