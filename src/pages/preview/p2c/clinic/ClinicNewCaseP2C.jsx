import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, CheckCircle2, AlertTriangle, Info, Stethoscope,
  User, Banknote, ShieldCheck, Calendar, Repeat, BedDouble,
  Gift, Send, ArrowRight, Hotel, Plane, Lock,
} from 'lucide-react'
import { OperationalShell } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, FacilityBadge } from '../../../../premium/p2cPrimitives'
import { PaymentLinesPanel, blankLine, totalsByActualCurrency } from '../../../../premium/PaymentLines'
import { LockedRefField } from '../../../../premium/LockedRefField'
import { InsurerCombobox } from '../../../../premium/InsurerCombobox'
import { useUserMode } from '../../../../context/UserModeContext'
import { useDemoState, useNextOurRef } from '../../../../context/DemoStateContext'
import {
  getClinicName, P2C_BILLING_FACILITIES, P2C_ROUTES_EXTERNAL,
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
import { updateCaseRegistration } from '../../../../lib/api/portalData'

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

export default function ClinicNewCaseP2C({ embedded = false, editCase = null, onDone } = {}) {
  const navigate = useNavigate()
  const { clinicId } = useUserMode()
  const isEdit = !!editCase
  // P3G — in edit mode the registering location/identity comes from the existing
  // case (it never changes on edit), not the logged-in clinic context.
  const regAtId = isEdit ? (editCase.registeredAtId || clinicId) : clinicId
  const clinicName = isEdit ? (editCase.registeredAtName || getClinicName(regAtId)) : getClinicName(clinicId)
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

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  const showCashBlock      = form.financialType === 'Cash'
  const showInsuranceBlock = form.financialType === 'Insurance'
  const showFreeBlock      = form.financialType === 'Free / Complimentary'
  const showTransferBlock  = form.route !== 'direct'
  const isOtherDestination = form.route === 'other'

  // Encounter visibility (independent)
  const isSingleVisit  = form.encounterPattern === 'outpatient_single'
  const isMultiSession = form.encounterPattern === 'outpatient_multi'
  const isInpatient    = form.encounterPattern === 'inpatient_admission'

  // ---- P2C.R3 — travel date validation ----
  // Egypt Arrival must not be AFTER today.
  // Egypt Departure must not be BEFORE today.
  const arrivalAfterToday  = form.arrivalDate   && form.arrivalDate   > TODAY_DATE
  const departureBeforeToday = form.departureDate && form.departureDate < TODAY_DATE

  // Keep the OUR Ref family in sync with the chosen billing facility.
  if (refContext.billingFacility !== (form.financialType === 'Insurance' ? (form.billingFacility || null) : null)) {
    setRefContext((p) => ({ ...p, billingFacility: form.financialType === 'Insurance' ? (form.billingFacility || null) : null }))
  }

  // Validation
  const needsFacility = showInsuranceBlock && !form.billingFacility
  const needsName = !form.firstName.trim() || !form.lastName.trim()
  const needsTransferDest = isOtherDestination && !form.transferDestination
  // Bundle 1 / Phase E — Free / Complimentary requires reason + approver before save.
  const needsFreeApproval = showFreeBlock && (!form.complimentaryReason.trim() || !form.complimentaryApprovedBy.trim())
  const canSubmit = !needsFacility && !needsName && !needsTransferDest && !arrivalAfterToday && !departureBeforeToday && !needsFreeApproval

  const cashTotals = useMemo(() => totalsByActualCurrency(paymentLines), [paymentLines])
  const excessTotals = useMemo(() => totalsByActualCurrency(excessLines), [excessLines])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

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
        visitDate: form.visitDate, visitTime: form.visitTime,
        insurance: { company: form.insuranceCompany, ref: form.insuranceRef, email: form.insuranceEmail, phone: form.insurancePhone },
        hasPatientExcess: form.financialType === 'Insurance' && form.hasExcess === 'Yes',
      }
      await updateCaseRegistration(editCase.id, editCase.patientId, patch)
      if (onDone) { onDone(); return }
      navigate(`/clinic/cases/${editCase.id}`)
      return
    }

    const nowIso = new Date().toISOString()
    const visitDateIso = new Date(`${form.visitDate}T${form.visitTime || '10:00'}:00`).toISOString()
    const checkInIso   = new Date(`${form.visitCheckInDate || form.visitDate}T${form.visitCheckInTime || form.visitTime || '10:00'}:00`).toISOString()

    const newCase = {
      id: `r3_${Date.now()}`,
      ourRef: nextRef.ref,
      registeredAtId: clinicId,
      registeredAtName: clinicName,
      registeredAtKind: 'external',
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
            <h1 className="p-h1 text-xl sm:text-2xl lg:text-3xl" style={{ color: 'var(--p-ink-900)' }}>{isEdit ? 'Edit Registration' : 'Register New Case'}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>
              <Stethoscope className="inline w-3.5 h-3.5 mr-1" style={{ color: 'var(--p-teal)' }} />
              {isEdit
                ? <>Editing <strong>{editCase.ourRef}</strong> · Registered at <strong>{clinicName}</strong> · open case</>
                : <>Registered at <strong>{clinicName}</strong> · {fmtDMY(TODAY_DATE)}</>}
            </p>
          </div>
        </header>

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

          {/* ── Row 1: Visit + Identity + Location ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            <section className="p-card p-5 lg:col-span-3 space-y-4">
              <SectionHead eyebrow="Section 1" title="Tourist Travel Dates — Egypt Arrival / Departure"
                description="These are the patient's travel dates to/from Egypt — NOT the medical visit check-in/out times." />
              <FieldGrid cols={1}>
                <Field label="Arrival to Egypt Date"
                  hint={form.arrivalDate ? fmtDMY(form.arrivalDate) : 'Pick the date the patient arrived in Egypt'}>
                  <input type="date" value={form.arrivalDate} max={TODAY_DATE}
                    onChange={(e) => update('arrivalDate', e.target.value)} className="p-input" />
                  {arrivalAfterToday && (
                    <span className="text-[11px] mt-1 font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-mixed)' }}>
                      <AlertTriangle className="w-3 h-3" /> Arrival to Egypt cannot be after today.
                    </span>
                  )}
                </Field>
                <Field label="Departure from Egypt Date"
                  hint={form.departureDate ? fmtDMY(form.departureDate) : 'Pick the date the patient will leave Egypt'}>
                  <input type="date" value={form.departureDate} min={TODAY_DATE}
                    onChange={(e) => update('departureDate', e.target.value)} className="p-input" />
                  {departureBeforeToday && (
                    <span className="text-[11px] mt-1 font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-mixed)' }}>
                      <AlertTriangle className="w-3 h-3" /> Departure from Egypt cannot be before today.
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
                <Field label="Last Name *">
                  <input required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Demo last name" className="p-input" />
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
                {[...P2C_ROUTES_EXTERNAL, { code: 'other', label: 'Transfer to Other Destination' }].map((r) => (
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
                <Field label={isInpatient ? 'Admission Date *' : 'Visit Check-In Date *'}>
                  <input type="date" value={form.visitCheckInDate} onChange={(e) => update('visitCheckInDate', e.target.value)} className="p-input" />
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
                        title="Excess Collection Lines"
                        helperText="Cash → any currency. Visa / Card → always EGP. FX rate is editable per line — there is no fixed rate."
                        invoiceCurrency={form.excessCurrency}
                      />

                      <TotalsCallout title="Excess collected" totals={excessTotals} dueAmount={form.excessAmount} dueCurrency={form.excessCurrency} />
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

                <PaymentLinesPanel
                  lines={paymentLines}
                  setLines={setPaymentLines}
                  typeLabel="Invoice Payment"
                  title="Payment Lines"
                  helperText="Cash → any currency · Visa / Card → always EGP (Bank Collection). FX rate is editable per line."
                  invoiceCurrency={form.invoiceCurrency}
                />

                <TotalsCallout title="Collected" totals={cashTotals} dueAmount={form.invoiceAmount} dueCurrency={form.invoiceCurrency} />
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

          {/* Submit bar */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-3 pb-4 bg-gradient-to-t from-[var(--p-canvas)] via-[var(--p-canvas)] to-transparent">
            <div className="p-card p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs flex items-center gap-2" style={{ color: 'var(--p-ink-500)' }}>
                <Info className="w-3.5 h-3.5" />
                <span>{isEdit ? 'Changes update this case in place — OUR Ref, room and visit status are preserved.' : 'The case will appear in My Cases right away. Reset clears this form.'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { if (isEdit) { if (onDone) onDone(); else navigate(`/clinic/cases/${editCase.id}`) } else { window.location.reload() } }}
                  className="h-11 px-5 rounded-full text-sm font-semibold p-btn-ghost">
                  {isEdit ? 'Cancel' : 'Reset'}
                </button>
                <button type="submit" disabled={!canSubmit}
                  className={cn('h-11 px-7 rounded-full text-sm font-bold p-btn-primary inline-flex items-center gap-2',
                    !canSubmit && 'opacity-40 cursor-not-allowed')}>
                  {isEdit ? 'Save Changes' : 'Register Case'} <ArrowRight className="w-4 h-4" />
                </button>
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
    invoiceNumber: '', invoiceAmount: '', invoiceCurrency: 'EUR',
    complimentaryReason: c.freeReason || '', complimentaryApprovedBy: c.freeApprovedBy || '',
    encounterPattern: c.encounterPattern || 'outpatient_single',
    visitCheckInDate: visitDate, visitCheckInTime: visitTime,
  }
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

function Inline({ tone = 'pending', icon: Icon, children }) {
  const tones = {
    pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A', border: '#F0C97A' },
    warn:    { bg: 'var(--p-mixed-soft)',   fg: '#B14242', border: '#F0B5B5' },
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
