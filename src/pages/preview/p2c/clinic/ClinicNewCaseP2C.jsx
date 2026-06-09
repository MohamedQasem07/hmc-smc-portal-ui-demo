import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, CheckCircle2, AlertTriangle, Info, Stethoscope,
  User, Banknote, ShieldCheck, Calendar, Repeat, BedDouble,
  Gift, Send, ArrowRight, Hotel, Plane, Lock, Pencil, X, RotateCcw,
} from 'lucide-react'
import { OperationalShell } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, FacilityBadge } from '../../../../premium/p2cPrimitives'
import { PaymentLinesPanel, blankLine, totalsByActualCurrency } from '../../../../premium/PaymentLines'
import { LockedRefField } from '../../../../premium/LockedRefField'
import { InsurerCombobox } from '../../../../premium/InsurerCombobox'
import { useUserMode } from '../../../../context/UserModeContext'
import { useDemoState, useNextOurRef } from '../../../../context/DemoStateContext'
import {
  getClinicName, P2C_BILLING_FACILITIES, P2C_ROUTES_EXTERNAL, ALL_CLINICS_AND_BRANCHES,
} from '../../../../data/p2c'
import {
  R1_FINANCIAL_TYPES, R1_CURRENCIES, R1_COUNTRY_CODES, R1_NATIONALITIES,
  R1_OTHER_TRANSFER_DESTINATIONS, R1_ENCOUNTER_PATTERNS,
} from '../../../../data/p2cR1'
import { fmtDMY, ageFromDob, ageLabel } from '../../../../lib/displayDate'
import { cn } from '../../../../lib/cn'
import { useNationalityOptions } from '../../../../lib/useNationalityOptions'
import { useLiveInsurers } from '../../../../lib/useLiveInsurers'
import { IS_SUPABASE } from '../../../../lib/api/config'
import { updateCaseRegistration, upsertCashInvoiceCharge, upsertExcessCharge, saveCaseCollections, fetchCaseFinancials, fetchLocations } from '../../../../lib/api/portalData'

/* =========================================================================
 * P2C.R2 — External Clinic Full New Case (with Encounter Pattern + demo state)
 * -----------------------------------------------------------------------
 * Adds the Encounter Pattern dimension and wires submit to the runtime
 * demo-state so registered cases immediately show up across My Cases,
 * Transfers, Treasury and (if transferred) the receiving branch.
 *
 * Encounter Pattern is INDEPENDENT of:
 *   - Route (direct vs transfer)
 *   - Financial Type (pending / cash / insurance / free)
 *   - Treatment Mode (conservative / surgical — branch-side classification)
 * ========================================================================= */

// Pilot (supabase): default to the real local date. Mock keeps the fixed demo date
// so the 5173 seed/UAT data stays consistent.
const TODAY_DATE = IS_SUPABASE ? new Date().toLocaleDateString('en-CA') : '2026-05-27'
const TODAY_TIME_DEFAULT = '10:00'

// P3I — guided stepper groups (map to the existing section blocks; no field moves).
const STEPS = [
  { id: 'patient',   label: 'Patient',       icon: User },
  { id: 'visit',     label: 'Visit & Route', icon: Stethoscope },
  { id: 'financial', label: 'Financial',     icon: Banknote },
  { id: 'review',    label: 'Review & Save', icon: CheckCircle2 },
]

// Phase B — which destination a transfer route targets (for location-aware filtering).
const ROUTE_TARGET = { to_al_kawther: 'al_kawther', to_sheraton: 'sheraton' }

// P3P — map a recorded collection into a PaymentLines row for the unified table.
// Carries hidden metadata so Save can diff: _collectionId, _status, _orig snapshot.
function collectionToLine(c, typeLabel) {
  const isVisa = c.payment_method === 'visa_card'
  const fxRefAmount = c.foreign_amount_covered != null ? String(c.foreign_amount_covered) : ''
  const actualAmount = c.actual_collected_amount != null ? Number(c.actual_collected_amount) : ''
  const line = {
    id: `pl_rec_${c.id}`,
    type: typeLabel,
    method: isVisa ? 'Visa / Card' : 'Cash',
    fxRefCurrency: c.invoice_currency || 'EUR',
    fxRefAmount,
    fxRate: c.fx_rate != null ? String(c.fx_rate) : '',
    actualCurrency: c.actual_currency || c.invoice_currency || 'EUR',
    actualAmount,
    amount: actualAmount, currency: c.actual_currency || c.invoice_currency || 'EUR',
    note: '',
    _collectionId: c.id, _status: 'recorded',
    _collectedBy: c.collected_by, _collectedAt: c.collected_at, _reason: '',
  }
  line._orig = { method: line.method, fxRefCurrency: line.fxRefCurrency, fxRefAmount: line.fxRefAmount, fxRate: line.fxRate, actualCurrency: line.actualCurrency }
  return line
}

export default function ClinicNewCaseP2C({ embedded = false, editCase = null, onDone, adminCorrection = false } = {}) {
  const navigate = useNavigate()
  const { clinicId, currentUser, operateAs } = useUserMode()
  const isEdit = !!editCase
  // P3J — ADMIN GLOBAL OPERATION: an admin holds no own-clinic scope, so they
  // register a case ON BEHALF of any active clinic/branch via a location picker.
  // Non-admins are ALWAYS locked to their own clinicId (the picker is hidden), so
  // their behaviour is unchanged. Edit mode never offers the picker.
  const isAdmin = currentUser?.role === 'admin'
  const adminPicker = isAdmin && !isEdit && !operateAs   // operate-as fixes the location → no picker
  const [adminLocations, setAdminLocations] = useState([])  // [{ code, name, kind }]
  const [adminLocId, setAdminLocId] = useState(null)        // a location CODE
  useEffect(() => {
    if (!adminPicker) return
    let alive = true
    if (IS_SUPABASE) {
      fetchLocations()
        .then((rows) => { if (alive) setAdminLocations((rows || [])
          .filter((r) => r.active !== false && r.code !== 'legacy_unspecified')
          .map((r) => ({ code: r.code, name: r.name, kind: r.type === 'main_branch' ? 'branch' : 'external' }))) })
        .catch(() => {})
    } else {
      setAdminLocations(ALL_CLINICS_AND_BRANCHES.map((l) => ({ code: l.id, name: l.name, kind: l.kind === 'branch' ? 'branch' : 'external' })))
    }
    return () => { alive = false }
  }, [adminPicker])
  const selAdminLoc = adminLocations.find((l) => l.code === adminLocId) || null

  // P3G/P3J — registering location/identity. Edit: from the existing case (never
  // changes). Create + admin: the picked location (code). Create + non-admin: own clinic.
  // P3K — Operate-As fixes the registration location to the operated clinic/branch
  // (no picker). Edit keeps the case's own location. Otherwise admin picks; a real
  // clinic user is always locked to their own clinicId.
  const regAtId = isEdit ? (editCase.registeredAtId || clinicId)
    : (operateAs ? operateAs.code : (isAdmin ? (adminLocId || '') : clinicId))
  const regAtKind = isEdit ? (editCase.registeredAtKind || 'external')
    : (operateAs ? operateAs.kind : (isAdmin ? (selAdminLoc?.kind || 'external') : 'external'))
  const clinicName = isEdit ? (editCase.registeredAtName || getClinicName(regAtId))
    : (operateAs ? operateAs.name : (isAdmin ? (selAdminLoc?.name || '—') : getClinicName(clinicId)))
  const { actions } = useDemoState()

  // P2C.R3 — live preview of the OUR Ref that will be assigned on submit.
  // Family follows the billingFacility once Insurance is selected; otherwise
  // external clinics default to SMC family.
  const [refContext, setRefContext] = useState({
    registeredAtKind: isEdit ? (editCase.registeredAtKind || 'external') : 'external',
    registeredAtId: regAtId,
    billingFacility: isEdit ? (editCase.billingFacility || null) : null,
  })
  const nextRef = useNextOurRef(refContext)
  // P3G — in edit mode the OUR Ref is the case's existing locked value (never recomputed).
  const refView = isEdit ? { ref: editCase.ourRef || '—', family: editCase.billingFacility || nextRef.family } : nextRef
  const nationalityOptions = useNationalityOptions()
  const liveInsurers = useLiveInsurers()   // live insurer master in supabase mode (mock list otherwise)

  const [form, setForm] = useState(() => editCase ? caseToForm(editCase) : {
    // Visit & Timing (tourist travel — separate from encounter check-in)
    visitDate: TODAY_DATE,
    visitTime: TODAY_TIME_DEFAULT,
    arrivalDate: TODAY_DATE,
    departureDate: '',
    // Identity
    firstName: '', lastName: '', dob: '', age: '', gender: 'Male', nationality: '',
    // Location + contact
    hotel: '', hotelRoom: '', postal: '',
    phoneCode: '+20', phone: '', email: '',
    // Case
    clinicalNote: '',
    route: 'direct',
    transferDestination: '',
    transferReason: '',
    transferNote: '',
    transferTransport: 'Ambulance',
    referralNote: '',
    financialType: 'Pending',
    billingFacility: '',
    insuranceCompany: '',
    insuranceRef: '',
    insuranceEmail: '',
    insurancePhone: '',
    hasExcess: 'No',
    excessAmount: '',
    excessCurrency: 'EUR',
    invoiceNumber: '',
    invoiceAmount: '',
    invoiceCurrency: 'EUR',
    complimentaryReason: '',
    complimentaryApprovedBy: '',
    // Encounter — independent of route/financial/treatment
    encounterPattern: 'outpatient_single',
    visitCheckInDate: TODAY_DATE,
    visitCheckInTime: TODAY_TIME_DEFAULT,
  })

  const [paymentLines, setPaymentLines] = useState([blankLine('Invoice Payment', 'EUR')])
  const [excessLines,  setExcessLines]  = useState([blankLine('Patient Excess',  'EUR')])
  const [step, setStep] = useState(1)   // P3I — guided stepper (1..4)
  const [submitting, setSubmitting] = useState(false)  // P3J — honest save state (no fake success)
  const [submitError, setSubmitError] = useState(null)

  // P3K — Full Case Editor is the SINGLE money place. In edit mode load the
  // already-recorded collections so they render READ-ONLY (the treasury ledger is
  // append-only); only NEW lines added below are persisted on Save → saving again
  // with no new line never duplicates. Also prefill the excess EXPECTED amount from
  // its charge so editing never loses it.
  const [existingFin, setExistingFin] = useState(null)
  useEffect(() => {
    if (!isEdit || !IS_SUPABASE || !editCase?.id) return
    let alive = true
    fetchCaseFinancials(editCase.id).then((f) => {
      if (!alive) return
      setExistingFin(f)
      // P3P — seed the ONE payment table with the recorded collections as rows
      // (editable for admin, read-only for others). New rows are added in the same
      // table. Blank initial row stays only when there are no recorded payments.
      const cashRec = (f?.collections || []).filter((c) => c.collection_purpose === 'cash_case_payment').map((c) => collectionToLine(c, 'Invoice Payment'))
      if (cashRec.length) setPaymentLines(cashRec)
      const exRec = (f?.collections || []).filter((c) => c.collection_purpose === 'patient_excess').map((c) => collectionToLine(c, 'Patient Excess'))
      if (exRec.length) setExcessLines(exRec)
      const exCharge = (f?.charges || []).find((c) => c.charge_type === 'patient_excess')
      if (exCharge) {
        setForm((p) => ({
          ...p,
          hasExcess: 'Yes',
          excessAmount: (p.excessAmount && Number(p.excessAmount) > 0) ? p.excessAmount : String(exCharge.amount ?? ''),
          excessCurrency: exCharge.currency || p.excessCurrency,
        }))
      }
    }).catch(() => { if (alive) setExistingFin(null) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editCase?.id])

  // P3J — keep blank/untouched cash payment lines aligned to the invoice currency
  // so a same-currency payment is the default (the cashier never has to switch the
  // line currency by hand). Lines that already carry an amount are left untouched.
  useEffect(() => {
    setPaymentLines((lines) => lines.map((l) =>
      (String(l.fxRefAmount ?? '') === '' && String(l.actualAmount ?? '') === '')
        ? { ...l, fxRefCurrency: form.invoiceCurrency, actualCurrency: form.invoiceCurrency, currency: form.invoiceCurrency }
        : l,
    ))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.invoiceCurrency])

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  const showCashBlock      = form.financialType === 'Cash'
  const showInsuranceBlock = form.financialType === 'Insurance'
  const showFreeBlock      = form.financialType === 'Free / Complimentary'
  const showTransferBlock  = form.route !== 'direct'
  const isOtherDestination = form.route === 'other'

  // Phase B — transfer routes follow the effective registration location; a
  // location can never transfer to itself (operating as Sheraton hides "Transfer
  // to Sheraton"; as Al-Kawther hides "Transfer to Al-Kawther"). External clinics
  // keep both branch options.
  const routeOptions = [...P2C_ROUTES_EXTERNAL, { code: 'other', label: 'Transfer to Other Destination' }]
    .filter((r) => ROUTE_TARGET[r.code] !== regAtId)
  useEffect(() => {
    // If the selected route just became a self-transfer (location changed), reset it.
    if (ROUTE_TARGET[form.route] && ROUTE_TARGET[form.route] === regAtId) update('route', 'direct')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regAtId])

  // Encounter visibility (independent)
  const isSingleVisit  = form.encounterPattern === 'outpatient_single'
  const isMultiSession = form.encounterPattern === 'outpatient_multi'
  const isInpatient    = form.encounterPattern === 'inpatient_admission'

  // ---- P2C.R3 — travel date validation (relative to the VISIT date) ----
  // P3R — Back-dated registration: a clinic that hasn't logged its cases yet may
  // register a case with a PAST visit date (yesterday / first-of-month). Travel
  // dates are therefore validated against the case's OWN visit date — not today —
  // so an already-departed patient's past departure does not wrongly block Save.
  // Arrival must not be after the visit; departure must not be before it.
  const travelRefDate = form.visitCheckInDate || TODAY_DATE
  const arrivalAfterVisit    = form.arrivalDate   && form.arrivalDate   > travelRefDate
  const departureBeforeVisit = form.departureDate && form.departureDate < travelRefDate

  // Keep the OUR Ref family in sync with the chosen billing facility.
  if (refContext.billingFacility !== (form.financialType === 'Insurance' ? (form.billingFacility || null) : null)) {
    setRefContext((p) => ({ ...p, billingFacility: form.financialType === 'Insurance' ? (form.billingFacility || null) : null }))
  }
  // P3J — keep the OUR Ref preview's location in sync with the admin's picked
  // clinic/branch (registeredAtId/Kind drive the ref family prefix).
  if (refContext.registeredAtId !== regAtId || refContext.registeredAtKind !== regAtKind) {
    setRefContext((p) => ({ ...p, registeredAtId: regAtId, registeredAtKind: regAtKind }))
  }

  // Validation
  const needsFacility = showInsuranceBlock && !form.billingFacility
  // P3Q — only a FIRST name is required. Single-name tourists (e.g. "Oksana") were
  // blocked because a last name was mandatory; the backend already fills last = first
  // for a single name, so requiring both silently disabled Save for legitimate cases.
  const needsName = !form.firstName.trim()
  const needsTransferDest = isOtherDestination && !form.transferDestination
  // Bundle 1 / Phase E — Free / Complimentary requires reason + approver before save.
  const needsFreeApproval = showFreeBlock && (!form.complimentaryReason.trim() || !form.complimentaryApprovedBy.trim())
  // P3J — an admin must pick the clinic/branch before the case can be created.
  const needsAdminLocation = adminPicker && !adminLocId
  const canSubmit = !needsFacility && !needsName && !needsTransferDest && !arrivalAfterVisit && !departureBeforeVisit && !needsFreeApproval && !needsAdminLocation
  // P3Q — tell the user EXACTLY what's blocking Save (the disabled button gave no reason).
  const missingToSave = [
    needsName && 'Patient name (a first name is enough)',
    needsFacility && 'Billing facility (HMC / SMC) for the insurance case',
    needsAdminLocation && 'Pick the clinic / branch to register for',
    needsTransferDest && 'Transfer destination',
    arrivalAfterVisit && 'Egypt arrival date cannot be after the visit date',
    departureBeforeVisit && 'Egypt departure date cannot be before the visit date',
    needsFreeApproval && 'Free / Complimentary reason + approved-by',
  ].filter(Boolean)

  // P3I — per-step completion (non-blocking; only drives the stepper's green check).
  const stepStatus = {
    1: !needsName,
    2: !needsTransferDest && !arrivalAfterVisit && !departureBeforeVisit,
    3: !needsFacility && !needsFreeApproval,
    4: canSubmit,
  }

  const cashTotals = useMemo(() => totalsByActualCurrency(paymentLines), [paymentLines])
  const excessTotals = useMemo(() => totalsByActualCurrency(excessLines), [excessLines])

  // P3P — corrected/voided collections (status='cancelled') for the admin-only
  // "Corrected history" strip. Active recorded payments now live IN the payment table.
  const cancelledCash = (existingFin?.cancelledCollections || []).filter((c) => c.collection_purpose === 'cash_case_payment')
  const cancelledExcess = (existingFin?.cancelledCollections || []).filter((c) => c.collection_purpose === 'patient_excess')

  async function handleSubmit(e) {
    e.preventDefault()
    // P3I — on any non-final step, "submit" (incl. Enter) just advances the stepper;
    // the real create/edit save only fires from the Review step.
    if (step < STEPS.length) { setStep((s) => Math.min(STEPS.length, s + 1)); return }
    if (!canSubmit) return

    // P3J — honest save: never navigate on failure, never fake success. Any error
    // (case/patient/charge/auth) surfaces in the banner below.
    setSubmitting(true); setSubmitError(null)
    try {
    // P3G — EDIT MODE: update the SAME case + patient in place (no duplicate,
    // OUR Ref / room / status preserved). Money lines keep their own flows.
    if (isEdit) {
      const patch = {
        patient: {
          firstName: form.firstName, lastName: form.lastName, dob: form.dob, gender: form.gender,
          nationality: form.nationality, phoneCode: form.phoneCode, phone: form.phone, email: form.email,
          postal: form.postal, hotel: form.hotel, hotelRoom: form.hotelRoom, note: form.clinicalNote,
        },
        route: form.route === 'other' ? 'transfer_other' : form.route,
        financialType: form.financialType,
        billingFacility: form.financialType === 'Insurance' ? form.billingFacility : null,
        encounterPattern: form.encounterPattern,
        // Phase A — the case visit date/time is the Visit Check-In the user actually
        // edits (form.visitDate has no UI input). Without this, editing the check-in
        // date silently did nothing.
        visitDate: form.visitCheckInDate || form.visitDate, visitTime: form.visitCheckInTime || form.visitTime,
        insurance: { company: form.insuranceCompany, ref: form.insuranceRef, email: form.insuranceEmail, phone: form.insurancePhone },
        hasPatientExcess: form.financialType === 'Insurance' && form.hasExcess === 'Yes',
        // P3K — Free reason/approver now persists on edit (was create-only).
        complimentary: form.financialType === 'Free / Complimentary'
          ? { reason: form.complimentaryReason, approvedBy: form.complimentaryApprovedBy } : null,
      }
      await updateCaseRegistration(editCase.id, editCase.patientId, patch)

      // P3K — the Full Case Editor is the SINGLE place money is recorded. All money
      // persists from here via the existing collection model (no separate card).
      // Charges (expected) are idempotent upserts; collections (actual money) are
      // NEW lines only — blank rows skip, so re-saving never duplicates the ledger.
      const locCode = editCase.currentLocationCode || editCase.registeredAtId || null
      if (form.financialType === 'Cash') {
        if (Number(form.invoiceAmount) > 0) {
          await upsertCashInvoiceCharge(editCase.id, Number(form.invoiceAmount), form.invoiceCurrency || 'EUR')
        }
        await saveCaseCollections(editCase.id, paymentLines, { locationCode: locCode, purpose: 'cash_case_payment' })
      }
      if (form.financialType === 'Insurance' && form.hasExcess === 'Yes') {
        if (Number(form.excessAmount) > 0) {
          await upsertExcessCharge(editCase.id, Number(form.excessAmount), form.excessCurrency || 'EUR')
        }
        await saveCaseCollections(editCase.id, excessLines, { locationCode: locCode, purpose: 'patient_excess' })
      }

      if (onDone) { onDone(); return }
      navigate(`/clinic/cases/${editCase.id}`)
      return
    }

    const nowIso = new Date().toISOString()
    // Phase A — the case visit date/time IS the Visit Check-In the user entered
    // (form.visitDate has no input of its own). Keeps Case Detail "Check-In" correct.
    const visitDateIso = new Date(`${form.visitCheckInDate || form.visitDate}T${form.visitCheckInTime || form.visitTime || '10:00'}:00`).toISOString()
    const checkInIso   = visitDateIso

    const newCase = {
      id: `r3_${Date.now()}`,
      ourRef: nextRef.ref,
      registeredAtId: regAtId,
      registeredAtName: clinicName,
      registeredAtKind: regAtKind,
      visitDate: visitDateIso,
      patient: {
        firstName: form.firstName, lastName: form.lastName,
        name: `${form.firstName} ${form.lastName}`.trim(),
        gender: form.gender, dob: form.dob, nationality: form.nationality,
        // P2C.R3.1 — age is derived from DOB at display time; not stored on the case.
        hotel: form.hotel, hotelRoom: form.hotelRoom,
        address: form.hotel ? `${form.hotel}${form.hotelRoom ? ` — Room ${form.hotelRoom}` : ''}` : '',
        postal: form.postal, phoneCode: form.phoneCode, phone: form.phone, email: form.email,
        note: form.clinicalNote,
      },
      route: form.route,
      routeLabel: form.route === 'direct' ? `Direct at ${clinicName}`
        : form.route === 'to_al_kawther' ? 'Transfer to Al-Kawther Branch'
        : form.route === 'to_sheraton'    ? 'Transfer to Sheraton Branch'
        : `Transfer to ${form.transferDestination || 'Other Destination'}`,
      financialType: form.financialType,
      billingFacility: form.financialType === 'Insurance' ? form.billingFacility : null,
      insurance: form.financialType === 'Insurance' ? {
        company: form.insuranceCompany, ref: form.insuranceRef, email: form.insuranceEmail, phone: form.insurancePhone,
        // R3.1 — Stage 1 (clinic-visible) intake fields
        stage1: {
          company: form.insuranceCompany,
          ref: form.insuranceRef,
          email: form.insuranceEmail,
          phone: form.insurancePhone,
        },
      } : null,
      // R3.1 — Stage 2 (admin completion) starts empty; admin fills later
      insuranceCompletion: form.financialType === 'Insurance' ? {
        invoiceCurrency: null,
        serviceChargePct: null,
        localAssistanceId: null,
        localAssistanceRef: null,
        billingPrepStatus: 'awaiting_admin_completion',
        adminNotes: '',
        completedAt: null,
      } : null,
      hasPatientExcess: form.financialType === 'Insurance' && form.hasExcess === 'Yes',
      excessAmount:   form.financialType === 'Insurance' && form.hasExcess === 'Yes' ? Number(form.excessAmount) || null : null,
      excessCurrency: form.financialType === 'Insurance' && form.hasExcess === 'Yes' ? form.excessCurrency : null,
      excessLines:    form.financialType === 'Insurance' && form.hasExcess === 'Yes' ? excessLines : [],
      invoice: form.financialType === 'Cash' ? {
        // P2C.R3 — invoice reference is the OUR Ref. No manually typed
        // invoice number from reception/nurse. A formal invoice sequence
        // remains a future admin/billing decision.
        number: nextRef.ref,
        amount: Number(form.invoiceAmount) || 0,
        currency: form.invoiceCurrency,
      } : null,
      paymentLines: form.financialType === 'Cash' ? paymentLines : [],
      settlement: form.financialType === 'Cash' ? settlementOf(form.invoiceAmount, form.invoiceCurrency, cashTotals) : null,
      complimentary: form.financialType === 'Free / Complimentary' ? {
        reason: form.complimentaryReason, approvedBy: form.complimentaryApprovedBy,
        approvedAt: new Date().toISOString(),
      } : null,
      transfer: form.route !== 'direct' ? {
        toBranchId:   form.route === 'to_al_kawther' ? 'al_kawther' : form.route === 'to_sheraton' ? 'sheraton' : null,
        toBranchName: form.route === 'to_al_kawther' ? 'Al-Kawther Branch' : form.route === 'to_sheraton' ? 'Sheraton Branch' : form.transferDestination,
        reason: form.transferReason,
        transport: form.transferTransport,
        referralNote: form.referralNote,
        sentAt: nowIso,
        receivedAt: null,
        status: 'Sent',
      } : null,
      treatmentMode: null,
      centerRoomNumber: null,
      operationalStatus: 'Open',
      notes: form.transferNote || '',
      encounterPattern: form.encounterPattern,
      visit: isSingleVisit ? { checkInAt: checkInIso, checkOutAt: null, status: 'active' } : null,
      sessions: isMultiSession ? [{
        id: `ses_init_${Date.now()}`, date: checkInIso, checkInAt: checkInIso, checkOutAt: null, status: 'active', note: 'Session 1',
      }] : [],
      admission: isInpatient ? { admittedAt: checkInIso, dischargedAt: null, status: 'admitted' } : null,
    }

    const newId = await actions.addCase(newCase)
    navigate(`/clinic/cases/${newId || newCase.id}`)
    } catch (err) {
      setSubmitError(err?.message || 'Could not save. Please check your session / connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const body = (
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        {!isEdit && (
          <DemoBanner>
            <strong>Interactive Demo</strong> — registered cases appear in My Cases, Transfers and Treasury during this session. Entries are saved in this browser (local preview — not yet on the server).
          </DemoBanner>
        )}

        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="p-eyebrow mb-1">{isEdit ? 'Edit Full Registration' : 'External Clinic Workspace'}</div>
            <h1 className="p-h1 text-xl sm:text-2xl lg:text-3xl" style={{ color: 'var(--p-ink-900)' }}>{isEdit ? 'Edit Full Registration' : 'Register New Case'}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>
              <Stethoscope className="inline w-3.5 h-3.5 mr-1" style={{ color: 'var(--p-teal)' }} />
              {isEdit
                ? <>Editing <strong>{editCase.ourRef}</strong> · Registered at <strong>{clinicName}</strong> · open case</>
                : <>Registered at <strong>{clinicName}</strong> · {fmtDMY(TODAY_DATE)}</>}
            </p>
          </div>
        </header>

        {/* P3J — ADMIN GLOBAL OPERATION: choose the clinic/branch this case is filed under. */}
        {adminPicker && (
          <section className="p-card p-card-top-navy p-4 sm:p-5 space-y-3" style={{ background: 'var(--p-brand-pale)' }}>
            <div className="flex items-start gap-3 flex-wrap">
              <span className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: 'var(--p-brand-mid)', color: 'white' }}>
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>Admin — operate on behalf of a clinic / branch</div>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-600)' }}>
                  You have no fixed clinic, so choose where this case is registered. The case is filed under the selected location — not your account.
                </p>
              </div>
            </div>
            <FieldGrid cols={2}>
              <Field label="Register case for clinic / branch *">
                <SelectInput value={adminLocId || ''} onChange={(v) => setAdminLocId(v || null)}
                  options={[{ value: '', label: '— Select clinic / branch —' },
                    ...adminLocations.map((l) => ({ value: l.code, label: `${l.name}${l.kind === 'branch' ? ' (Main Branch)' : ''}` }))]} />
              </Field>
              <div className="flex items-end">
                {selAdminLoc ? (
                  <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-bold" style={{ background: 'var(--p-teal-soft)', color: '#0A6E63', border: '1px solid var(--p-teal)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Admin operating for: {selAdminLoc.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold" style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Pick a location to continue
                  </span>
                )}
              </div>
            </FieldGrid>
          </section>
        )}

        {/* P3K — Admin Correction Mode banner (admin editing a CLOSED case). */}
        {isEdit && adminCorrection && (
          <div className="p-card p-3.5 flex items-start gap-2.5 p-rise" style={{ background: 'var(--p-mixed-soft)', border: '1px solid #F0B5B5' }}>
            <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: '#B14242', color: 'white' }}>
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: '#B14242' }}>Admin Correction Mode</div>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-700)' }}>
                This case is <strong>closed</strong>. Changes are admin-only and are recorded. The case stays closed unless you reopen it.
              </p>
            </div>
          </div>
        )}

        {/* P3H — clear EDIT-MODE banner so the user knows they edit the same case (no duplicate). */}
        {isEdit && (
          <div className="p-card p-card-top-navy p-3.5 flex items-start gap-2.5 p-rise" style={{ background: 'var(--p-brand-pale)' }}>
            <span className="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: 'var(--p-brand-mid)', color: 'white' }}>
              <Info className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>Editing an existing case</div>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-600)' }}>
                You are updating <strong>{editCase.ourRef}</strong> in place. Saving changes this same case &amp; patient — it does <strong>not</strong> create a duplicate, and the OUR Ref, room and visit status are preserved.
              </p>
            </div>
          </div>
        )}

        {/* P2C.R3 — locked OUR Ref shown immediately at the top */}
        <section className="p-card p-5">
          <SectionHead eyebrow="Case Identity" title="OUR Ref — auto-generated · locked"
            description="Every case gets a unique non-editable OUR Ref at registration. This identity is later used by Claude Code to build the invoice." />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-5">
              <LockedRefField value={refView.ref} family={refView.family}
                hint="The Insurance choice (HMC/SMC) below adjusts the prefix automatically." />
            </div>
            <div className="lg:col-span-7 rounded-xl p-3 text-[11px] flex items-start gap-2"
                 style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-700)', border: '1px solid #BCCDE8' }}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                OUR Ref is auto-generated and locked. Selecting Cash / Insurance HMC / Insurance SMC updates the family prefix
                (e.g. <code>HMC2026…</code> vs <code>SHMC-DDMYYYY.NNN</code>) but the value is never typed manually.
              </span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* P3I — guided step navigator */}
          <FormStepper steps={STEPS} current={step} status={stepStatus} onJump={setStep} />

          {/* ===== STEP 1 — Patient details (travel + identity + contact) ===== */}
          <div className={cn('space-y-5', step !== 1 && 'hidden')}>
          {/* ── Row 1: Visit + Identity + Location ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            <section className="p-card p-5 lg:col-span-3 space-y-4">
              <SectionHead eyebrow="Section 1" title="Tourist Travel Dates — Egypt Arrival / Departure"
                description="These are the patient's travel dates to/from Egypt — NOT the medical visit check-in/out times." />
              <FieldGrid cols={1}>
                <Field label="Arrival to Egypt Date"
                  hint={form.arrivalDate ? fmtDMY(form.arrivalDate) : 'Pick the date the patient arrived in Egypt'}>
                  <input type="date" value={form.arrivalDate} max={travelRefDate}
                    onChange={(e) => update('arrivalDate', e.target.value)} className="p-input" />
                  {arrivalAfterVisit && (
                    <span className="text-[11px] mt-1 font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-mixed)' }}>
                      <AlertTriangle className="w-3 h-3" /> Arrival to Egypt cannot be after the visit date.
                    </span>
                  )}
                </Field>
                <Field label="Departure from Egypt Date"
                  hint={form.departureDate ? fmtDMY(form.departureDate) : 'Pick the date the patient will leave Egypt'}>
                  <input type="date" value={form.departureDate} min={travelRefDate}
                    onChange={(e) => update('departureDate', e.target.value)} className="p-input" />
                  {departureBeforeVisit && (
                    <span className="text-[11px] mt-1 font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-mixed)' }}>
                      <AlertTriangle className="w-3 h-3" /> Departure from Egypt cannot be before the visit date.
                    </span>
                  )}
                </Field>
              </FieldGrid>
              <div className="rounded-xl p-2.5 text-[11px] flex items-start gap-1.5"
                style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-600)', border: '1px solid var(--p-border)' }}>
                <Plane className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Medical Visit / Admission times are captured in <strong>Encounter</strong> below.</span>
              </div>
            </section>

            <section className="p-card p-5 lg:col-span-5 space-y-4">
              <SectionHead eyebrow="Section 2" title="Patient Identity" />
              <FieldGrid cols={2}>
                <Field label="First Name *">
                  <input required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="Demo first name" className="p-input" />
                </Field>
                <Field label="Last Name">
                  <input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="(optional — leave blank for single-name patients)" className="p-input" />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} className="p-input" />
                </Field>
                <Field label="Age (auto-calculated)" hint="Locked — calculated from Date of Birth using the visit date.">
                  <div className="p-input h-11 inline-flex items-center justify-between gap-2 font-bold"
                       style={{
                         background: form.dob ? '#F1FBF6' : 'var(--p-surface-deep)',
                         color: form.dob ? '#0A8F62' : 'var(--p-ink-400)',
                         border: '1px solid ' + (form.dob ? '#A8E6C7' : 'var(--p-border)'),
                       }}>
                    <Lock className="w-3 h-3 shrink-0" />
                    <span className="flex-1 text-right">
                      {form.dob ? ageLabel(ageFromDob(form.dob, form.visitCheckInDate || form.visitDate || TODAY_DATE)) : '—'}
                    </span>
                  </div>
                </Field>
                <Field label="Gender">
                  <div className="flex gap-2">
                    {['Male', 'Female'].map((g) => (
                      <button key={g} type="button" onClick={() => update('gender', g)}
                        className={cn('flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition-colors')}
                        style={form.gender === g
                          ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
                          : { background: 'white', borderColor: 'var(--p-border-strong)', color: 'var(--p-ink-700)' }}>{g}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Nationality">
                  <SelectInput value={form.nationality} onChange={(v) => update('nationality', v)}
                    options={['', ...nationalityOptions].map((n) => ({ value: n, label: n || 'Select…' }))} />
                </Field>
              </FieldGrid>
              {(form.firstName || form.lastName) && (
                <div className="rounded-xl px-3 py-2 text-xs flex items-center gap-2" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-600)' }}>
                  <User className="w-3.5 h-3.5" />
                  Full Name: <strong style={{ color: 'var(--p-ink-900)' }}>{`${form.firstName} ${form.lastName}`.trim()}</strong>
                </div>
              )}
            </section>

            <section className="p-card p-5 lg:col-span-4 space-y-4">
              <SectionHead eyebrow="Section 3" title="Location & Contact" />
              <FieldGrid cols={2}>
                <Field label="Hotel / Resort or Address" full>
                  <input value={form.hotel} onChange={(e) => update('hotel', e.target.value)} placeholder="e.g. Tropitel Sahl Hasheesh" className="p-input" />
                </Field>
                <Field label="Hotel Room No.">
                  <input value={form.hotelRoom} onChange={(e) => update('hotelRoom', e.target.value)} placeholder="e.g. 317" className="p-input" />
                </Field>
                <Field label="Postal Code">
                  <input value={form.postal} onChange={(e) => update('postal', e.target.value)} placeholder="Postal" className="p-input" />
                </Field>
                <Field label="Country Code">
                  <SelectInput value={form.phoneCode} onChange={(v) => update('phoneCode', v)}
                    options={R1_COUNTRY_CODES.map((c) => ({ value: c.code, label: c.label }))} />
                </Field>
                <Field label="Phone Number">
                  <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Demo phone" className="p-input" />
                </Field>
                <Field label="Patient Email" full>
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="demo@example.com" className="p-input" />
                </Field>
              </FieldGrid>
            </section>
          </div>

          </div>

          {/* ===== STEP 2 — Visit & Route (clinical, route, encounter) ===== */}
          <div className={cn('space-y-5', step !== 2 && 'hidden')}>
          {/* ── Row 2: Clinical note + Route ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="p-card p-5 lg:col-span-7 space-y-4">
              <SectionHead eyebrow="Section 4" title="Presenting Complaint / Clinical Note"
                description="Short summary of the patient's complaint or condition." />
              <textarea rows={3} value={form.clinicalNote} onChange={(e) => update('clinicalNote', e.target.value)}
                placeholder="e.g. Acute gastroenteritis with mild dehydration. Needs IV + labs."
                className="p-input resize-y w-full" style={{ minHeight: 100 }} />
            </section>

            <section className="p-card p-5 lg:col-span-5 space-y-4">
              <SectionHead eyebrow="Section 5" title="Patient Route"
                description="Where the patient goes — separate from how they pay." />
              <div className="space-y-2">
                {routeOptions.map((r) => (
                  <RadioRow key={r.code} label={r.label}
                    active={form.route === r.code} onClick={() => update('route', r.code)}
                    badge={r.code !== 'direct' ? 'Transfer' : null} />
                ))}
              </div>
              {showTransferBlock && (
                <div className="rounded-xl p-3.5 space-y-3" style={{ background: 'var(--p-transfer-soft)', border: '1px solid #D7CFF2' }}>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#5443A8' }}>
                    <Send className="w-3.5 h-3.5" /> Transfer Details
                  </div>
                  {isOtherDestination && (
                    <Field label="Other Destination *" hint="Admin-configurable list (demo).">
                      <SelectInput value={form.transferDestination} onChange={(v) => update('transferDestination', v)}
                        options={[{ value: '', label: 'Select…' }, ...R1_OTHER_TRANSFER_DESTINATIONS.map((d) => ({ value: d, label: d }))]} />
                    </Field>
                  )}
                  <Field label="Reason for Transfer">
                    <textarea rows={2} value={form.transferReason} onChange={(e) => update('transferReason', e.target.value)}
                      placeholder="Clinical reason for transfer" className="p-input resize-none" />
                  </Field>
                  <Field label="Transfer Note (optional)">
                    <textarea rows={1} value={form.transferNote} onChange={(e) => update('transferNote', e.target.value)}
                      placeholder="Any operational note for receiving branch" className="p-input resize-none" />
                  </Field>
                  <FieldGrid cols={2}>
                    <Field label="Transport Method">
                      <SelectInput value={form.transferTransport} onChange={(v) => update('transferTransport', v)}
                        options={['Ambulance', 'Patient Own Transport', 'Taxi / Private Car'].map((t) => ({ value: t, label: t }))} />
                    </Field>
                    <Field label="Referral Note (optional)">
                      <input value={form.referralNote} onChange={(e) => update('referralNote', e.target.value)}
                        placeholder="e.g. Suspected surgery — please assess" className="p-input" />
                    </Field>
                  </FieldGrid>
                  <p className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                    External clinic does not need to set Treatment Mode. The receiving branch will assign Conservative or Surgical after intake.
                  </p>
                  {IS_SUPABASE && (
                    <p className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                      The OUR Ref above travels with the patient — the case identity does not change on transfer.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ── Row 3: Encounter Pattern ─────────────────────────────────── */}
          <section className="p-card p-5 space-y-5">
            <SectionHead eyebrow="Section 6" title="Encounter Pattern / Care Setting"
              description="Independent of Route, Financial Type and Treatment Mode." />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {R1_ENCOUNTER_PATTERNS.map((p) => (
                <EncounterCard key={p.code} p={p} active={form.encounterPattern === p.code}
                  onClick={() => update('encounterPattern', p.code)} />
              ))}
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <FieldGrid cols={2}>
                <Field label={isInpatient ? 'Admission Date *' : 'Visit Check-In Date *'}
                  hint="You can pick a past date to register a late / back-dated case (e.g. yesterday or the 1st of the month).">
                  <input type="date" value={form.visitCheckInDate} max={TODAY_DATE} onChange={(e) => update('visitCheckInDate', e.target.value)} className="p-input" />
                </Field>
                <Field label={isInpatient ? 'Admission Time *' : 'Visit Check-In Time *'}>
                  <input type="time" value={form.visitCheckInTime} onChange={(e) => update('visitCheckInTime', e.target.value)} className="p-input" />
                </Field>
              </FieldGrid>
              {isSingleVisit && (
                <Inline tone="info" icon={Calendar}>
                  Single Visit — Visit Check-Out time is recorded later from the Case Detail page using <strong>Close Visit</strong>.
                </Inline>
              )}
              {isMultiSession && (
                <Inline tone="info" icon={Repeat}>
                  Multiple Sessions — Session 1 is opened automatically with this Check-In. Additional sessions are added later from the Case Detail page (e.g., repeat IV).
                </Inline>
              )}
              {isInpatient && (
                <Inline tone="info" icon={BedDouble}>
                  Inpatient Admission — formal admission/Center Room assignment happens at the receiving branch (Al-Kawther or Sheraton) after receipt. External clinics do not manage internal admission rooms.
                </Inline>
              )}
            </div>
          </section>

          </div>

          {/* ===== STEP 3 — Financial classification (+ conditional details) ===== */}
          <div className={cn('space-y-5', step !== 3 && 'hidden')}>
          {/* ── Row 4: Financial Type ────────────────────────────────────── */}
          <section className="p-card p-5 space-y-5">
            <SectionHead eyebrow="Section 7" title="Financial Classification"
              description="Pick now or leave Pending if not yet known. HMC/SMC selection only applies to Insurance." />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {R1_FINANCIAL_TYPES.map((t) => (
                <FinTypeCard key={t} type={t} active={form.financialType === t} onClick={() => update('financialType', t)} />
              ))}
            </div>

            {showInsuranceBlock && (
              <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--p-brand-mid)', color: 'white' }}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
                      Open Insurance Case Under * — Mohamed's Instruction Required
                    </div>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--p-ink-700)' }}>
                      For every Insurance case, Mohamed instructs whether to bill under HMC or SMC.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {P2C_BILLING_FACILITIES.map((f) => (
                    <button key={f.code} type="button" onClick={() => update('billingFacility', f.code)}
                      className="rounded-xl p-4 text-left transition-all border-2 flex items-start gap-3"
                      style={{
                        background: form.billingFacility === f.code ? 'var(--p-teal-soft)' : 'white',
                        borderColor: form.billingFacility === f.code ? 'var(--p-teal)' : 'var(--p-border)',
                      }}>
                      <FacilityBadge code={f.code} size="lg" />
                      <span className="text-[12px] leading-snug" style={{ color: 'var(--p-ink-700)' }}>
                        {f.code === 'HMC' ? 'Hurghada Medical Center (HMC) — bill under HMC.' : 'Sahl Hasheesh Medical Centre (SMC) — bill under SMC.'}
                      </span>
                    </button>
                  ))}
                </div>

                {!form.billingFacility && (
                  <Inline tone="warn" icon={AlertTriangle}>Select HMC or SMC to continue — required for Insurance cases.</Inline>
                )}

                {/* R3.1 — Stage 1 insurance intake. Clinic-visible fields only. */}
                <div className="rounded-xl p-3 text-[11px] flex items-start gap-2"
                     style={{ background: 'var(--p-teal-soft)', color: '#0A8F87', border: '1px solid #A6E2DC' }}>
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Stage 1 — Operational intake.</strong> Enter the insurer's contact and the case's operational
                    insurance reference. Service Charge, Invoice Currency, Local Assistance and the final invoice value
                    are <strong>completed by Admin later</strong> (Stage 2), before Claude Code generates the invoice.
                  </span>
                </div>

                <FieldGrid cols={2}>
                  <Field label="Insurance Company Name *" full hint="Pick from the demo catalogue or add a new one — added insurers persist for the rest of this session.">
                    <InsurerCombobox
                      value={form.insuranceCompany}
                      insurers={IS_SUPABASE ? liveInsurers : undefined}
                      onChange={(v) => update('insuranceCompany', v)}
                      autoFillContacts={({ email, phone }) => setForm((p) => ({ ...p, insuranceEmail: email || p.insuranceEmail, insurancePhone: phone || p.insurancePhone }))} />
                  </Field>
                  <Field label="Insurance Reference Number"
                    hint={IS_SUPABASE && form.insuranceCompany && !String(form.insuranceRef || '').trim()
                      ? 'Insurance Reference is recommended — saved as (pending) and completed by Admin later if not yet issued.'
                      : undefined}>
                    <input value={form.insuranceRef} onChange={(e) => update('insuranceRef', e.target.value)} placeholder="e.g. ALZ-DEMO-R3-1234" className="p-input" />
                  </Field>
                  <Field label="Insurance Company Email">
                    <input type="email" value={form.insuranceEmail} onChange={(e) => update('insuranceEmail', e.target.value)} placeholder="claims@demo.example" className="p-input" />
                  </Field>
                  <Field label="Insurance Company Phone">
                    <input value={form.insurancePhone || ''} onChange={(e) => update('insurancePhone', e.target.value)} placeholder="+49 89 1234567" className="p-input" />
                  </Field>
                </FieldGrid>

                <div className="rounded-xl p-4 space-y-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{IS_SUPABASE ? 'Insurance Excess?' : 'Patient Excess?'}</div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{IS_SUPABASE ? "The patient's share of an insurance case — collected now and still treasury money, kept separate from cash-case revenue." : 'If the patient pays an excess, collect it as Patient Excess.'}</p>
                    </div>
                    <div className="flex gap-2">
                      {['No', 'Yes'].map((opt) => (
                        <button key={opt} type="button" onClick={() => update('hasExcess', opt)}
                          className="h-9 px-4 rounded-full text-xs font-semibold border-2 transition-colors"
                          style={form.hasExcess === opt
                            ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
                            : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-600)' }}>{opt}</button>
                      ))}
                    </div>
                  </div>

                  {form.hasExcess === 'Yes' && (
                    <div className="space-y-3">
                      <FieldGrid cols={2}>
                        <Field label="Excess Amount *">
                          <input type="number" value={form.excessAmount} onChange={(e) => update('excessAmount', e.target.value)} placeholder="0" className="p-input" />
                        </Field>
                        <Field label="Excess Currency *">
                          <SelectInput value={form.excessCurrency} onChange={(v) => update('excessCurrency', v)}
                            options={R1_CURRENCIES.map((c) => ({ value: c, label: c }))} />
                        </Field>
                      </FieldGrid>

                      <PaymentLinesPanel
                        lines={excessLines}
                        setLines={setExcessLines}
                        typeLabel="Patient Excess"
                        title={isEdit ? 'Excess Payments' : 'Excess Collection Lines'}
                        helperText={isEdit
                          ? (isAdmin
                            ? 'Recorded excess loads here. Edit a row to correct it (reason required) or add a new line. Recorded rows can’t be deleted.'
                            : 'Recorded excess is read-only. You can add new excess lines below.')
                          : 'Cash → any currency. Visa / Card → always EGP. FX rate is editable per line — there is no fixed rate.'}
                        invoiceCurrency={form.excessCurrency}
                        canEditRecorded={isEdit && isAdmin}
                      />
                      {isEdit && isAdmin && cancelledExcess.length > 0 && (
                        <CancelledHistoryList collections={cancelledExcess} collectorNames={existingFin?.collectorNames} />
                      )}

                      {isEdit ? (
                        <p className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Excess collected / outstanding totals update on the case summary after you save.</p>
                      ) : (
                        <TotalsCallout title="Excess collected" totals={excessTotals} dueAmount={form.excessAmount} dueCurrency={form.excessCurrency} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showCashBlock && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--p-cash-soft)', border: '1px solid #A8E6C7' }}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#18A877', color: 'white' }}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#0A8F62' }}>Cash Invoice Collection</div>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--p-ink-700)' }}>
                      One invoice can be paid in multiple lines. FX rate is editable per line — no fixed defaults.
                    </p>
                  </div>
                </div>

                <FieldGrid cols={3}>
                  <div className="sm:col-span-3">
                    <LockedRefField size="md" label="Case / Invoice Reference"
                      value={refView.ref} family={refView.family}
                      hint="Generated from the case identity. Reception/nurse cannot type a separate invoice number — a formal invoice sequence is a future admin/billing decision." />
                  </div>
                  <Field label="Invoice Amount *">
                    <input type="number" value={form.invoiceAmount} onChange={(e) => update('invoiceAmount', e.target.value)} placeholder="0" className="p-input" />
                  </Field>
                  <Field label="Invoice Currency *">
                    <SelectInput value={form.invoiceCurrency} onChange={(v) => update('invoiceCurrency', v)}
                      options={R1_CURRENCIES.map((c) => ({ value: c, label: c }))} />
                  </Field>
                </FieldGrid>

                {isEdit ? (
                  <>
                    <PaymentLinesPanel
                      lines={paymentLines}
                      setLines={setPaymentLines}
                      typeLabel="Invoice Payment"
                      title="Payments"
                      helperText={isAdmin
                        ? 'The nurse-recorded payments load here. Edit a row to correct it (a reason is required), or add a new line below. Recorded rows can’t be deleted.'
                        : 'Recorded payments are read-only. You can add new payment lines below.'}
                      invoiceCurrency={form.invoiceCurrency}
                      canEditRecorded={isAdmin}
                    />
                    {isAdmin && cancelledCash.length > 0 && (
                      <CancelledHistoryList collections={cancelledCash} collectorNames={existingFin?.collectorNames} />
                    )}
                    <p className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Collected / outstanding totals update on the case summary after you save.</p>
                  </>
                ) : (
                  <>
                    <PaymentLinesPanel
                      lines={paymentLines}
                      setLines={setPaymentLines}
                      typeLabel="Invoice Payment"
                      title="Payment Lines"
                      helperText="Cash → any currency · Visa / Card → always EGP (Bank Collection). FX rate is editable per line."
                      invoiceCurrency={form.invoiceCurrency}
                    />
                    <TotalsCallout title="Collected" totals={cashTotals} dueAmount={form.invoiceAmount} dueCurrency={form.invoiceCurrency} />
                  </>
                )}
              </div>
            )}

            {showFreeBlock && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--p-gold-soft)', border: '1px solid #F1E2C9' }}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#D9A574', color: 'white' }}>
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#7A4F1F' }}>Free / Complimentary</div>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--p-ink-700)' }}>
                      No payment required. Will appear in reports as Free / Complimentary, not as unpaid Cash.
                    </p>
                  </div>
                </div>
                <FieldGrid cols={2}>
                  <Field label="Complimentary Reason">
                    <input value={form.complimentaryReason} onChange={(e) => update('complimentaryReason', e.target.value)} placeholder="e.g. Staff family member courtesy" className="p-input" />
                  </Field>
                  <Field label="Approved By">
                    <input value={form.complimentaryApprovedBy} onChange={(e) => update('complimentaryApprovedBy', e.target.value)} placeholder="e.g. Mohamed (verbal)" className="p-input" />
                  </Field>
                </FieldGrid>
                {IS_SUPABASE && <p className="text-[11px]" style={{ color: '#7A4F1F' }}>The approval date &amp; time is recorded automatically on save.</p>}
              </div>
            )}

            {form.financialType === 'Pending' && (
              <Inline tone="pending" icon={Info}>
                Financial classification will be done later (typically at the receiving branch or once insurance is confirmed by Mohamed).
              </Inline>
            )}
          </section>

          </div>

          {/* ===== STEP 4 — Review & Save ===== */}
          <div className={cn('space-y-4', step !== 4 && 'hidden')}>
            <ReviewPanel form={form} clinicName={clinicName} isEdit={isEdit} ourRef={refView.ref} cashTotals={cashTotals} />
          </div>

          {/* P3I — stepper action bar (Back / Next / Save) */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-3 pb-4 bg-gradient-to-t from-[var(--p-canvas)] via-[var(--p-canvas)] to-transparent">
            <div className="p-card p-card-top p-3 space-y-2">
              {submitError && (
                <div role="alert" className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
                  style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}
              {step === STEPS.length && !canSubmit && missingToSave.length > 0 && (
                <div className="rounded-xl px-3 py-2 text-[12px]"
                  style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Before you can {isEdit ? 'save' : 'register'}, complete:</div>
                  <ul className="mt-1 ml-5 list-disc space-y-0.5">{missingToSave.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs flex items-center gap-2 min-w-0" style={{ color: 'var(--p-ink-500)' }}>
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Step {step} of {STEPS.length} · <strong style={{ color: 'var(--p-ink-700)' }}>{STEPS[step - 1].label}</strong>{isEdit ? ' · editing existing case' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => { if (step > 1) setStep(step - 1); else if (isEdit) { if (onDone) onDone(); else navigate(`/clinic/cases/${editCase.id}`) } else { window.location.reload() } }}
                    className="h-11 px-5 rounded-full text-sm font-semibold p-btn-ghost">
                    {step > 1 ? 'Back' : (isEdit ? 'Cancel' : 'Reset')}
                  </button>
                  {step < STEPS.length ? (
                    <button type="button" onClick={() => setStep(step + 1)}
                      className="h-11 px-7 rounded-full text-sm font-bold p-btn-primary inline-flex items-center gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button type="submit" disabled={!canSubmit || submitting}
                      className={cn('h-11 px-7 rounded-full text-sm font-bold p-btn-primary inline-flex items-center gap-2',
                        (!canSubmit || submitting) && 'opacity-40 cursor-not-allowed')}>
                      {submitting ? (isEdit ? 'Saving…' : 'Registering…') : (isEdit ? 'Save Changes' : 'Register Case')} <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>
  )

  // P3G — embedded edit mode renders only the form body; the parent Case Detail
  // already supplies the role-correct shell (Admin / Operational). Create mode
  // keeps its own OperationalShell wrapper (unchanged).
  return embedded ? body : (
    <OperationalShell role="clinic_nurse" active="new-case"
      identityName={clinicName} identitySub="External Clinic Workspace">
      {body}
    </OperationalShell>
  )
}

// =====================================================================
// Local helpers + sub-components
// =====================================================================

// P3G — map an existing (mock-shaped) case object to the registration form state
// for EDIT mode. Mirrors the create defaults so every section pre-loads.
function caseToForm(c) {
  const p = c.patient || {}
  const visitDate = (c.visitDate || '').slice(0, 10) || TODAY_DATE
  const visitTime = c.visitTime ? String(c.visitTime).slice(0, 5) : TODAY_TIME_DEFAULT
  const route = c.route === 'transfer_other' ? 'other' : (c.route || 'direct')
  return {
    visitDate, visitTime,
    arrivalDate: '', departureDate: '',
    firstName: p.firstName || (p.name || '').trim().split(/\s+/)[0] || '',
    lastName: p.lastName || (p.name || '').trim().split(/\s+/).slice(1).join(' ') || '',
    dob: p.dob || '', age: '', gender: p.gender === 'Female' ? 'Female' : 'Male',
    nationality: p.nationality || '',
    hotel: p.hotel || '', hotelRoom: p.hotelRoom || '', postal: p.postal || '',
    phoneCode: p.phoneCode || '+20', phone: p.phone || '', email: p.email || '',
    clinicalNote: p.note || '',
    route,
    transferDestination: route === 'other' ? (c.transfer?.toBranchName || '') : '',
    transferReason: c.transfer?.reason || '', transferNote: '', transferTransport: 'Ambulance', referralNote: '',
    financialType: c.financialType || 'Pending',
    billingFacility: c.billingFacility || '',
    insuranceCompany: c.insurance?.company || '', insuranceRef: c.insurance?.ref || '',
    insuranceEmail: c.insurance?.email || '', insurancePhone: c.insurance?.phone || '',
    hasExcess: c.hasPatientExcess ? 'Yes' : 'No',
    excessAmount: c.excessAmount != null ? String(c.excessAmount) : '',
    excessCurrency: c.excessCurrency || 'EUR',
    // P3J — prefill the cash invoice from the stored amount/currency (passed in
    // by the Case Detail workspace as c.cashInvoice). Was hardcoded blank/EUR,
    // which made editing a Cash case look like the saved 600 EGP had vanished.
    invoiceNumber: '',
    invoiceAmount: c.cashInvoice && c.cashInvoice.amount != null ? String(c.cashInvoice.amount) : '',
    invoiceCurrency: (c.cashInvoice && c.cashInvoice.currency) || 'EUR',
    complimentaryReason: c.freeReason || '', complimentaryApprovedBy: c.freeApprovedBy || '',
    encounterPattern: c.encounterPattern || 'outpatient_single',
    visitCheckInDate: visitDate, visitCheckInTime: visitTime,
  }
}

// P3I — guided step navigator (clickable; mobile-scrollable; green check when a
// step's required fields are satisfied). Pure presentation — never blocks.
function FormStepper({ steps, current, status, onJump }) {
  return (
    <div className="p-card p-card-top p-2 sm:p-2.5">
      <ol className="flex items-stretch gap-1.5 overflow-x-auto scrollbar-hide">
        {steps.map((s, i) => {
          const n = i + 1
          const active = current === n
          const ok = !!status[n]
          const Icon = s.icon
          return (
            <li key={s.id} className="flex-1 min-w-[64px] sm:min-w-[120px]">
              <button type="button" onClick={() => onJump(n)}
                className="w-full h-full rounded-xl px-2 sm:px-2.5 py-2 flex items-center gap-2 transition-all border"
                style={{
                  background: active ? 'var(--p-teal-soft)' : 'white',
                  borderColor: active ? 'var(--p-teal)' : 'var(--p-border)',
                  boxShadow: active ? 'var(--p-shadow-soft)' : 'none',
                }}>
                <span className="w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 text-[12px] font-bold"
                  style={{
                    background: active ? 'var(--p-teal)' : ok ? 'var(--p-finalized-soft)' : 'var(--p-surface-tint)',
                    color: active ? 'white' : ok ? '#076D4A' : 'var(--p-ink-400)',
                    border: ok && !active ? '1px solid #9FD4BB' : '1px solid transparent',
                  }}>
                  {ok && !active ? <CheckCircle2 className="w-4 h-4" /> : (Icon ? <Icon className="w-3.5 h-3.5" /> : n)}
                </span>
                <span className="min-w-0 text-left hidden sm:block">
                  <span className="block text-[9px] uppercase tracking-[0.1em] font-bold" style={{ color: 'var(--p-ink-400)' }}>Step {n}</span>
                  <span className="block text-[12px] font-bold truncate" style={{ color: active ? 'var(--p-ink-900)' : 'var(--p-ink-600)' }}>{s.label}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// P3I — final review/summary before save. Read-only display of the form values.
function ReviewPanel({ form, clinicName, isEdit, ourRef, cashTotals = {} }) {
  const routeLabel = form.route === 'direct' ? 'Direct' : form.route === 'to_al_kawther' ? 'Transfer → Al-Kawther' : form.route === 'to_sheraton' ? 'Transfer → Sheraton' : `Transfer → ${form.transferDestination || 'Other'}`
  const rows = [
    ['Patient', `${form.firstName} ${form.lastName}`.trim() || '—'],
    ['Registered at', clinicName],
    ['Route', routeLabel],
    ['Encounter', String(form.encounterPattern || '').replace(/_/g, ' ')],
    ['Financial', form.financialType],
  ]
  if (form.financialType === 'Insurance') {
    rows.push(['Insurance', [form.billingFacility, form.insuranceCompany].filter(Boolean).join(' · ') || '—'])
    if (form.insuranceRef) rows.push(['Ins. Ref', form.insuranceRef])
    if (form.hasExcess === 'Yes') rows.push(['Excess', `${form.excessAmount || 0} ${form.excessCurrency}`])
  }
  if (form.financialType === 'Cash') {
    rows.push(['Cash invoice', `${form.invoiceAmount || 0} ${form.invoiceCurrency}`])
    // P3J — show live collected / outstanding from the payment lines on the Review
    // step (create mode only; edit mode records money via Case Detail, not here).
    if (!isEdit) {
      const collected = Number(cashTotals[form.invoiceCurrency] || 0)
      const outstanding = Math.max(0, (Number(form.invoiceAmount) || 0) - collected)
      rows.push(['Collected', `${collected.toFixed(2)} ${form.invoiceCurrency}`])
      rows.push(['Outstanding', `${outstanding.toFixed(2)} ${form.invoiceCurrency}`])
    }
  }
  if (form.financialType === 'Free / Complimentary') rows.push(['Free reason', form.complimentaryReason || '—'])
  if (form.hotel) rows.push(['Hotel', [form.hotel, form.hotelRoom && `Rm ${form.hotelRoom}`].filter(Boolean).join(' · ')])
  return (
    <section className="p-card p-card-top p-5 space-y-4">
      <SectionHead icon={CheckCircle2} eyebrow="Final step" title="Review & Save"
        description="Check the details before saving." />
      <div className="rounded-2xl p-4" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b" style={{ borderColor: 'var(--p-border)' }}>
          <span className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>OUR Ref {isEdit ? '(locked)' : ''}</span>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{ourRef}</span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-[11px] uppercase tracking-[0.1em] font-bold shrink-0" style={{ color: 'var(--p-ink-400)' }}>{k}</dt>
              <dd className="text-[13px] font-semibold text-right truncate" style={{ color: 'var(--p-ink-900)' }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-xl px-3 py-2.5 text-[12px] flex items-start gap-2"
        style={{ background: isEdit ? 'var(--p-brand-pale)' : 'var(--p-cash-soft)', border: `1px solid ${isEdit ? '#BCCDE8' : '#A8E6C7'}`, color: 'var(--p-ink-700)' }}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{isEdit
          ? <>Saving will <strong>update the existing case {ourRef}</strong> and its patient — it will <strong>not</strong> create a duplicate.</>
          : <>Tap <strong>Register Case</strong> to create this case — it appears in My Cases immediately.</>}</span>
      </div>
    </section>
  )
}

function settlementOf(invoiceAmt, invoiceCur, totalsByCur) {
  const due = Number(invoiceAmt) || 0
  if (!due) return 'Pending'
  const collected = totalsByCur[invoiceCur] || 0
  if (collected >= due) return 'Paid'
  if (collected > 0)    return 'Partially Paid'
  return 'Pending'
}

function Field({ label, hint, children, full }) {
  return (
    <div className={cn('flex flex-col gap-1.5', full && 'col-span-full')}>
      <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: 'var(--p-ink-400)' }}>{hint}</p>}
    </div>
  )
}
function FieldGrid({ cols = 2, children }) {
  const colsClass = cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'
  return <div className={cn('grid grid-cols-1 gap-3', colsClass)}>{children}</div>
}
function SelectInput({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="p-input appearance-none w-full pr-8">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

function RadioRow({ label, active, onClick, badge }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full rounded-xl p-3 text-left border-2 transition-all flex items-center gap-3"
      style={{
        background: active ? 'var(--p-teal-soft)' : 'white',
        borderColor: active ? 'var(--p-teal)' : 'var(--p-border)',
      }}>
      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
        style={{ borderColor: active ? 'var(--p-teal)' : 'var(--p-border)', background: active ? 'var(--p-teal)' : 'white' }}>
        {active && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <span className="flex-1 text-sm font-semibold" style={{ color: active ? 'var(--p-ink-900)' : 'var(--p-ink-700)' }}>{label}</span>
      {badge && (
        <span className="text-[10px] font-bold px-2 h-5 rounded-full inline-flex items-center shrink-0"
          style={{ background: 'var(--p-transfer-soft)', color: '#5443A8' }}>{badge}</span>
      )}
    </button>
  )
}

function EncounterCard({ p, active, onClick }) {
  const map = {
    outpatient_single: { icon: Calendar, sub: 'One check-in + one check-out — typical outpatient consult.' },
    outpatient_multi:  { icon: Repeat,   sub: 'Same case stays open for repeat sessions (e.g., IV course).' },
    inpatient_admission: { icon: BedDouble, sub: 'Admission → Discharge with length-of-stay. Room assigned at the branch.' },
  }
  const cfg = map[p.code] || map.outpatient_single
  const Icon = cfg.icon
  const tones = {
    navy:  { bg: 'var(--p-brand-pale)', fg: '#1E4180', border: '#BCCDE8' },
    teal:  { bg: 'var(--p-teal-soft)',  fg: '#0A8F87', border: '#A6E2DC' },
    mixed: { bg: 'var(--p-mixed-soft)', fg: '#B14242', border: '#F0B5B5' },
  }
  const t = tones[p.tone] || tones.navy
  return (
    <button type="button" onClick={onClick}
      className="rounded-2xl p-4 text-left border-2 transition-all flex items-start gap-3"
      style={{ background: active ? t.bg : 'white', borderColor: active ? t.fg : 'var(--p-border)' }}>
      <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
        style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{p.label}</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{cfg.sub}</div>
      </div>
      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: active ? t.fg : 'var(--p-border)', background: active ? t.fg : 'white' }}>
        {active && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
    </button>
  )
}

function FinTypeCard({ type, active, onClick }) {
  const map = {
    'Pending':              { icon: Info,        tone: 'pending', sub: 'Decide later' },
    'Cash':                 { icon: Banknote,    tone: 'cash',    sub: 'Original currency · multi-line' },
    'Insurance':            { icon: ShieldCheck, tone: 'teal',    sub: 'HMC / SMC · excess optional' },
    'Free / Complimentary': { icon: Gift,        tone: 'gold',    sub: 'No payment required' },
  }
  const cfg = map[type]
  const Icon = cfg.icon
  const tones = {
    pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A', border: '#F0C97A' },
    cash:    { bg: 'var(--p-cash-soft)',    fg: '#0A8F62', border: '#A8E6C7' },
    teal:    { bg: 'var(--p-teal-soft)',    fg: '#0A8F87', border: '#A6E2DC' },
    gold:    { bg: 'var(--p-gold-soft)',    fg: '#9A6E36', border: '#F1E2C9' },
  }
  const t = tones[cfg.tone]
  return (
    <button type="button" onClick={onClick}
      className="rounded-2xl p-4 text-left border-2 transition-all"
      style={{ background: active ? t.bg : 'white', borderColor: active ? t.fg : 'var(--p-border)' }}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{type}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{cfg.sub}</div>
        </div>
        <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: active ? t.fg : 'var(--p-border)', background: active ? t.fg : 'white' }}>
          {active && <span className="w-2 h-2 rounded-full bg-white" />}
        </span>
      </div>
    </button>
  )
}

function TotalsCallout({ title, totals, dueAmount, dueCurrency }) {
  const entries = Object.entries(totals)
  const due = Number(dueAmount) || 0
  const sameCurrencyCollected = totals[dueCurrency] || 0
  const outstanding = Math.max(0, due - sameCurrencyCollected)
  const status = due === 0 ? 'Pending Collection' : outstanding === 0 ? 'Paid' : 'Partially Paid'
  const statusTone = status === 'Paid' ? { bg: 'var(--p-finalized-soft)', fg: '#076D4A' }
    : status === 'Partially Paid' ? { bg: 'var(--p-pending-soft)', fg: '#A1672A' }
    : { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-500)' }
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{title}</div>
        <div className="mt-1 flex flex-wrap gap-2">
          {entries.length === 0 ? <span className="text-sm" style={{ color: 'var(--p-ink-400)' }}>No lines yet</span>
            : entries.map(([cur, val]) => (
              <span key={cur} className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-bold"
                style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-900)', border: '1px solid var(--p-border)' }}>
                {fmt(val)} <span style={{ color: 'var(--p-ink-500)' }}>{cur}</span>
              </span>))}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Status</div>
        <span className="mt-1 inline-flex items-center h-7 px-2.5 rounded-full text-xs font-bold"
          style={{ background: statusTone.bg, color: statusTone.fg }}>{status}</span>
        {due > 0 && outstanding > 0 && (
          <div className="text-[11px] mt-1" style={{ color: 'var(--p-ink-500)' }}>
            Outstanding in {dueCurrency}: <strong style={{ color: 'var(--p-ink-900)' }}>{fmt(outstanding)} {dueCurrency}</strong>
          </div>
        )}
      </div>
    </div>
  )
}

// P3K — read-only list of already-recorded collections (the treasury ledger is
// append-only, so past money is shown locked; only NEW lines below are saved).
function ExistingCollectionsList({ collections, title, collectorNames = {}, chargeCurrency = null, canCorrect = false, onCorrect = null }) {
  const totals = {}
  for (const c of collections) {
    const cur = c.actual_currency || c.invoice_currency || 'EGP'
    totals[cur] = (totals[cur] || 0) + (Number(c.actual_collected_amount ?? c.foreign_amount_covered) || 0)
  }
  const totalChips = Object.entries(totals)
  const crossCurrency = chargeCurrency && totalChips.some(([cur]) => cur !== chargeCurrency)
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-600)' }}>
        <Lock className="w-3 h-3" /> {title}
      </div>
      <ul className="space-y-1.5">
        {collections.map((c, i) => {
          const cur = c.actual_currency || c.invoice_currency || ''
          const name = collectorNames[c.collected_by] || null
          return (
            <li key={i} className="rounded-lg px-2.5 py-2 flex items-start justify-between gap-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold" style={{ color: 'var(--p-ink-900)' }}>
                  {(c.payment_method || 'cash').replace(/_/g, ' ')}
                  {c.treasury_channel ? <span className="font-normal" style={{ color: 'var(--p-ink-500)' }}> · {String(c.treasury_channel).replace(/_/g, ' ')}</span> : null}
                </div>
                <div className="text-[10.5px]" style={{ color: 'var(--p-ink-500)' }}>
                  {c.collected_at ? new Date(c.collected_at).toLocaleString('en-GB') : '—'}{name ? ` · by ${name}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[13px] font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>
                  {fmt(Number(c.actual_collected_amount ?? c.foreign_amount_covered) || 0)} {cur}
                </div>
                {canCorrect && onCorrect && (
                  <button type="button" onClick={() => onCorrect(c)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold"
                    style={{ background: 'var(--p-ink-900)', color: 'white' }}>
                    <Pencil className="w-3 h-3" /> Correct
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 border-t" style={{ borderColor: 'var(--p-border)' }}>
        {totalChips.map(([cur, val]) => (
          <span key={cur} className="text-[11px] font-bold" style={{ color: 'var(--p-ink-700)' }}>Recorded: {fmt(val)} {cur}</span>
        ))}
        {crossCurrency && (
          <span className="text-[10.5px]" style={{ color: '#A1672A' }}>Collected in a different currency than the invoice ({chargeCurrency}) — verify FX / method.</span>
        )}
      </div>
    </div>
  )
}

// P3O — ADMIN-ONLY corrected/voided history. Active totals exclude these; shown only
// so an admin can see what was reversed. Normal users never receive this block.
function CancelledHistoryList({ collections, collectorNames = {} }) {
  if (!collections || collections.length === 0) return null
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--p-surface-tint)', border: '1px dashed var(--p-border-strong)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-500)' }}>
        <RotateCcw className="w-3 h-3" /> Corrected history — reversed (admin only)
      </div>
      <ul className="space-y-1.5">
        {collections.map((c, i) => {
          const cur = c.actual_currency || c.invoice_currency || ''
          const name = collectorNames[c.collected_by] || null
          return (
            <li key={i} className="rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-3" style={{ background: 'white', border: '1px solid var(--p-border)', opacity: 0.72 }}>
              <span className="text-[11.5px] truncate" style={{ color: 'var(--p-ink-500)', textDecoration: 'line-through' }}>
                {(c.payment_method || 'cash').replace(/_/g, ' ')}{c.treasury_channel ? ` · ${String(c.treasury_channel).replace(/_/g, ' ')}` : ''}
                {c.collected_at ? ` · ${new Date(c.collected_at).toLocaleDateString('en-GB')}` : ''}{name ? ` · ${name}` : ''}
              </span>
              <span className="text-[12px] font-bold p-numeric shrink-0" style={{ color: 'var(--p-ink-400)', textDecoration: 'line-through' }}>
                {fmt(Number(c.actual_collected_amount ?? c.foreign_amount_covered) || 0)} {cur}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="text-[10.5px]" style={{ color: 'var(--p-ink-500)' }}>Reversed &amp; excluded from every active total. Replaced by the active row(s) above.</div>
    </div>
  )
}

// P3O — admin reverse-and-replace correction modal. Settled-amount-centric: defaults
// to the real paid amount + the old method; admin typically just switches the method
// (e.g. Physical Cash → Visa/Card). Reason is required (audited). Calls the RPC.
function CollectionCorrectModal({ collection, busy, error, onCancel, onSubmit }) {
  const oldMethod = collection.payment_method === 'visa_card' ? 'visa_card' : 'cash'
  const oldAmt = Number(collection.actual_collected_amount ?? collection.foreign_amount_covered) || 0
  const oldCur = collection.actual_currency || collection.invoice_currency || 'EGP'
  const oldChannel = collection.treasury_channel || (oldMethod === 'visa_card' ? 'visa_bank' : 'physical_cash')
  const [method, setMethod] = useState(oldMethod)
  const [amount, setAmount] = useState(String(oldAmt))
  const [currency, setCurrency] = useState(oldCur)
  const [reason, setReason] = useState('')
  const isVisa = method === 'visa_card'
  useEffect(() => { if (isVisa && currency !== 'EGP') setCurrency('EGP') }, [isVisa, currency])
  const newChannel = isVisa ? 'visa_bank' : 'physical_cash'
  const canSubmit = reason.trim().length > 0 && Number(amount) > 0 && !busy
  const ch = (s) => String(s).replace(/_/g, ' ')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(20,28,46,0.55)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ background: 'white', boxShadow: 'var(--p-shadow-card)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-900)' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--p-teal)' }} /> Correct collection — Admin
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" style={{ color: 'var(--p-ink-400)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="rounded-xl px-3 py-2 text-[12px] leading-relaxed" style={{ background: 'var(--p-pending-soft)', color: '#A1672A', border: '1px solid #F0C97A' }}>
          This <strong>reverses</strong> the original {ch(oldMethod)} · {fmt(oldAmt)} {oldCur} ({ch(oldChannel)}) and <strong>replaces</strong> it with the values below. Treasury moves from <strong>{ch(oldChannel)}</strong> to <strong>{ch(newChannel)}</strong>. The original is kept as reversed history.
        </div>

        <Field label="Corrected method">
          <div className="flex gap-2">
            {[['cash', 'Physical Cash'], ['visa_card', 'Visa / Card']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMethod(v)}
                className="flex-1 h-10 rounded-xl text-xs font-bold border-2"
                style={method === v ? { background: 'var(--p-teal)', color: 'white', borderColor: 'var(--p-teal)' } : { background: 'white', color: 'var(--p-ink-700)', borderColor: 'var(--p-border)' }}>{l}</button>
            ))}
          </div>
        </Field>
        <FieldGrid cols={2}>
          <Field label="Settled amount">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="p-input" />
          </Field>
          <Field label="Currency" hint={isVisa ? 'Visa / Card settles in EGP.' : undefined}>
            <SelectInput value={currency} onChange={setCurrency} options={R1_CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
        </FieldGrid>
        <Field label="Correction reason *">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="p-input"
            placeholder="Why is this being corrected? (required — stored in the audit log)" />
        </Field>

        {error && <Inline tone="reject" icon={AlertTriangle}>{error}</Inline>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="h-10 px-4 rounded-full text-xs font-bold"
            style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>Cancel</button>
          <button type="button" disabled={!canSubmit} onClick={() => onSubmit({ method, amount, currency }, reason)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-xs font-bold"
            style={{ background: canSubmit ? '#B14242' : 'var(--p-ink-300)', color: 'white', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <RotateCcw className="w-3.5 h-3.5" /> {busy ? 'Correcting…' : 'Reverse & Replace'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Inline({ tone = 'pending', icon: Icon, children }) {
  const tones = {
    pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A', border: '#F0C97A' },
    warn:    { bg: 'var(--p-mixed-soft)',   fg: '#B14242', border: '#F0B5B5' },
    reject:  { bg: 'var(--p-mixed-soft)',   fg: '#B14242', border: '#F0B5B5' },
    ok:      { bg: 'var(--p-finalized-soft)', fg: '#076D4A', border: '#9FD4BB' },
    info:    { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-700)', border: 'var(--p-border)' },
  }[tone] || { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-700)', border: 'var(--p-border)' }
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
      style={{ background: tones.bg, color: tones.fg, border: `1px solid ${tones.border}` }}>
      {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
