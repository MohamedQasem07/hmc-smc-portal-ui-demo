import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown, CheckCircle2, AlertTriangle, Info, Building2,
  User, Banknote, ShieldCheck, Calendar, Repeat, BedDouble,
  Gift, ArrowRight, Heart, Scissors, Plane, Lock,
} from 'lucide-react'
import { OperationalShell, receptionRoute } from '../../../../premium/OperationalShell'
import { SectionHead, DemoBanner, FacilityBadge } from '../../../../premium/p2cPrimitives'
import { PaymentLinesPanel, blankLine, totalsByActualCurrency } from '../../../../premium/PaymentLines'
import { LockedRefField } from '../../../../premium/LockedRefField'
import { InsurerCombobox } from '../../../../premium/InsurerCombobox'
import { useLiveInsurers } from '../../../../lib/useLiveInsurers'
import { useDemoState, useRoomBoard, useNextOurRef } from '../../../../context/DemoStateContext'
import { P2C_BILLING_FACILITIES } from '../../../../data/p2c'
import {
  R1_FINANCIAL_TYPES, R1_CURRENCIES, R1_COUNTRY_CODES, R1_NATIONALITIES,
  R1_ENCOUNTER_PATTERNS, R1_TREATMENT_MODES,
} from '../../../../data/p2cR1'
import { fmtDMY, ageFromDob, ageLabel } from '../../../../lib/displayDate'
import { cn } from '../../../../lib/cn'
import { useNationalityOptions } from '../../../../lib/useNationalityOptions'
import { IS_SUPABASE } from '../../../../lib/api/config'

/* =========================================================================
 * P2C.R2 — Reception New Direct Case (Al-Kawther / Sheraton)
 * -----------------------------------------------------------------------
 * Same full intake architecture as the external clinic form, with the
 * additions Mohamed needs at the branch:
 *
 *   - Encounter Pattern includes Inpatient Admission (this is where it is
 *     actually managed; external clinics route to the branch).
 *   - Center Treatment Room selector (Room 1–15, only Available rooms).
 *   - Treatment Mode set up-front (Not Determined / Conservative / Surgical).
 *   - Submit creates the case in demo-state and immediately assigns the
 *     selected Room (occupies it on the Room Board).
 * ========================================================================= */

const TODAY_DATE = IS_SUPABASE ? new Date().toLocaleDateString('en-CA') : '2026-05-27'

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

export default function ReceptionNewCaseP2C() {
  const navigate = useNavigate()
  const { branchSlug } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)
  const { actions } = useDemoState()
  const board = useRoomBoard(branchId)

  // P2C.R3 — locked OUR Ref. Branches default to HMC family; Insurance/SMC
  // flips it to SMC mid-form.
  const [refContext, setRefContext] = useState({
    registeredAtKind: 'branch',
    registeredAtId: branchId,
    billingFacility: null,
  })
  const nextRef = useNextOurRef(refContext)
  const nationalityOptions = useNationalityOptions()
  const liveInsurers = useLiveInsurers()   // live insurer master in supabase mode (mock list otherwise)

  const availableRooms = useMemo(() => board.filter((r) => r.status === 'available'), [board])

  const [form, setForm] = useState({
    visitDate: TODAY_DATE,
    visitTime: '10:00',
    arrivalDate: TODAY_DATE,
    departureDate: '',
    firstName: '', lastName: '', dob: '', age: '', gender: 'Male', nationality: '',
    hotel: '', hotelRoom: '', postal: '',
    phoneCode: '+20', phone: '', email: '',
    clinicalNote: '',
    financialType: 'Pending',
    billingFacility: '',
    insuranceCompany: '', insuranceRef: '', insuranceEmail: '', insurancePhone: '',
    hasExcess: 'No', excessAmount: '', excessCurrency: 'EUR',
    invoiceNumber: '', invoiceAmount: '', invoiceCurrency: 'EUR',
    complimentaryReason: '', complimentaryApprovedBy: '',
    encounterPattern: 'outpatient_single',
    visitCheckInDate: TODAY_DATE, visitCheckInTime: '10:00',
    centerRoomNumber: '',
    treatmentMode: 'pending',
  })

  const [paymentLines, setPaymentLines] = useState([blankLine('Invoice Payment', 'EUR')])
  const [excessLines,  setExcessLines]  = useState([blankLine('Patient Excess',  'EUR')])

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  const showCashBlock      = form.financialType === 'Cash'
  const showInsuranceBlock = form.financialType === 'Insurance'
  const showFreeBlock      = form.financialType === 'Free / Complimentary'
  const isInpatient        = form.encounterPattern === 'inpatient_admission'

  const cashTotals   = useMemo(() => totalsByActualCurrency(paymentLines), [paymentLines])
  const excessTotals = useMemo(() => totalsByActualCurrency(excessLines), [excessLines])

  // P2C.R3 / P3R — travel date validation relative to the VISIT date (not today),
  // so a back-dated case (past visit) with an already-departed patient still saves.
  const travelRefDate = form.visitCheckInDate || TODAY_DATE
  const arrivalAfterVisit    = form.arrivalDate   && form.arrivalDate   > travelRefDate
  const departureBeforeVisit = form.departureDate && form.departureDate < travelRefDate

  // Keep OUR Ref family in sync with Insurance facility selection.
  if (refContext.billingFacility !== (form.financialType === 'Insurance' ? (form.billingFacility || null) : null)) {
    setRefContext((p) => ({ ...p, billingFacility: form.financialType === 'Insurance' ? (form.billingFacility || null) : null }))
  }

  const needsFacility = showInsuranceBlock && !form.billingFacility
  // P3Q — only a FIRST name is required; single-name tourists (e.g. "Oksana") were
  // wrongly blocked. Backend fills last = first for a single name.
  const needsName     = !form.firstName.trim()
  const needsRoom     = isInpatient && !form.centerRoomNumber
  // Bundle 1 / Phase E — Free / Complimentary requires reason + approver before save.
  const needsFreeApproval = form.financialType === 'Free / Complimentary'
    && (!form.complimentaryReason.trim() || !form.complimentaryApprovedBy.trim())
  const canSubmit = !needsFacility && !needsName && !needsRoom && !arrivalAfterVisit && !departureBeforeVisit && !needsFreeApproval

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    const nowIso = new Date().toISOString()
    // Phase A — the case visit date/time IS the Visit Check-In / Admission date the
    // user entered (form.visitDate has no input of its own).
    const visitDateIso = new Date(`${form.visitCheckInDate || form.visitDate}T${form.visitCheckInTime || form.visitTime || '10:00'}:00`).toISOString()
    const checkInIso = visitDateIso
    const newId = `r2_${Date.now()}`

    const newCase = {
      id: newId,
      ourRef: nextRef.ref,
      registeredAtId: branchId,
      registeredAtName: branchName,
      registeredAtKind: 'branch',
      visitDate: visitDateIso,
      patient: {
        firstName: form.firstName, lastName: form.lastName,
        name: `${form.firstName} ${form.lastName}`.trim(),
        gender: form.gender, dob: form.dob, nationality: form.nationality,
        // R3.1 — age is derived from DOB at display time
        hotel: form.hotel, hotelRoom: form.hotelRoom,
        address: form.hotel ? `${form.hotel}${form.hotelRoom ? ` — Room ${form.hotelRoom}` : ''}` : '',
        postal: form.postal, phoneCode: form.phoneCode, phone: form.phone, email: form.email,
        note: form.clinicalNote,
      },
      route: 'direct',
      routeLabel: `Direct at ${branchName}`,
      financialType: form.financialType,
      billingFacility: form.financialType === 'Insurance' ? form.billingFacility : null,
      insurance: form.financialType === 'Insurance' ? {
        company: form.insuranceCompany, ref: form.insuranceRef, email: form.insuranceEmail, phone: form.insurancePhone,
        stage1: {
          company: form.insuranceCompany, ref: form.insuranceRef, email: form.insuranceEmail, phone: form.insurancePhone,
        },
      } : null,
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
        // P2C.R3 — invoice number is the OUR Ref. No manual editable field.
        number: nextRef.ref,
        amount: Number(form.invoiceAmount) || 0, currency: form.invoiceCurrency,
      } : null,
      paymentLines: form.financialType === 'Cash' ? paymentLines : [],
      settlement: form.financialType === 'Cash' ? settlementOf(form.invoiceAmount, form.invoiceCurrency, cashTotals) : null,
      complimentary: form.financialType === 'Free / Complimentary' ? {
        reason: form.complimentaryReason, approvedBy: form.complimentaryApprovedBy,
        approvedAt: new Date().toISOString(),
      } : null,
      transfer: null,
      treatmentMode: form.treatmentMode || 'pending',
      centerRoomNumber: form.centerRoomNumber ? Number(form.centerRoomNumber) : null,
      operationalStatus: 'Open',
      notes: '',
      encounterPattern: form.encounterPattern,
      visit: form.encounterPattern === 'outpatient_single'
        ? { checkInAt: checkInIso, checkOutAt: null, status: 'active' } : null,
      sessions: form.encounterPattern === 'outpatient_multi'
        ? [{ id: `ses_init_${Date.now()}`, date: checkInIso, checkInAt: checkInIso, checkOutAt: null, status: 'active', note: 'Session 1' }] : [],
      admission: isInpatient
        ? { admittedAt: checkInIso, dischargedAt: null, status: 'admitted' } : null,
    }

    const realId = await actions.addCase(newCase)
    const goId = realId || newId
    if (form.centerRoomNumber) {
      actions.assignRoom(goId, Number(form.centerRoomNumber), branchId)
    }
    navigate(`${receptionRoute(role, 'cases')}/${goId}`)
  }

  return (
    <OperationalShell role={role} active="new-case"
      identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          <strong>Interactive Demo</strong> — registering this case will add it to Branch Cases, the Room Board (if a room is chosen), Treasury, and the Daily Report.
        </DemoBanner>

        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="p-eyebrow mb-1">Reception & Rooms Workspace</div>
            <h1 className="p-h1 text-xl sm:text-2xl lg:text-3xl" style={{ color: 'var(--p-ink-900)' }}>Register New Direct Case</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--p-ink-500)' }}>
              <Building2 className="inline w-3.5 h-3.5 mr-1" style={{ color: 'var(--p-teal)' }} />
              Registered at <strong>{branchName}</strong> · {fmtDMY(TODAY_DATE)}
            </p>
          </div>
        </header>

        {/* P2C.R3 — locked OUR Ref */}
        <section className="p-card p-5">
          <SectionHead eyebrow="Case Identity" title="OUR Ref — auto-generated · locked"
            description="Every case gets a unique non-editable OUR Ref at registration. This identity is later used by Claude Code to build the invoice." />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-5">
              <LockedRefField value={nextRef.ref} family={nextRef.family}
                hint="Branch direct cases default to HMC family; selecting Insurance/SMC switches it to SMC." />
            </div>
            <div className="lg:col-span-7 rounded-xl p-3 text-[11px] flex items-start gap-2"
                 style={{ background: 'var(--p-brand-pale)', color: 'var(--p-ink-700)', border: '1px solid #BCCDE8' }}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                OUR Ref is auto-generated and locked. If this patient is later transferred between branches the same OUR Ref
                follows them — the case identity does not change on transfer.
              </span>
            </div>
          </div>
        </section>

        {/* noValidate: multi-STEP wizard in one <form>. Native HTML5 validation would
            try to focus an invalid control in a HIDDEN step on submit, fail ("not
            focusable"), and SILENTLY block Register Case. JS validation = canSubmit. */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Row 1: Travel + Identity + Location */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            <section className="p-card p-5 lg:col-span-3 space-y-4">
              <SectionHead eyebrow="Section 1" title="Tourist Travel Dates — Egypt Arrival / Departure"
                description="These are the patient's travel dates to/from Egypt — NOT the medical visit times." />
              <FieldGrid cols={1}>
                <Field label="Arrival to Egypt Date"
                  hint={form.arrivalDate ? fmtDMY(form.arrivalDate) : 'Pick the date the patient arrived in Egypt'}>
                  <input type="date" value={form.arrivalDate} max={travelRefDate} onChange={(e) => update('arrivalDate', e.target.value)} className="p-input" />
                  {arrivalAfterVisit && (
                    <span className="text-[11px] mt-1 font-semibold inline-flex items-center gap-1" style={{ color: 'var(--p-mixed)' }}>
                      <AlertTriangle className="w-3 h-3" /> Arrival to Egypt cannot be after the visit date.
                    </span>
                  )}
                </Field>
                <Field label="Departure from Egypt Date"
                  hint={form.departureDate ? fmtDMY(form.departureDate) : 'Pick the date the patient will leave Egypt'}>
                  <input type="date" value={form.departureDate} min={travelRefDate} onChange={(e) => update('departureDate', e.target.value)} className="p-input" />
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
                <span>Medical encounter timing (admission / visit check-in) is recorded in Encounter below.</span>
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
                <Field label="Age (auto-calculated)" hint="Locked — calculated from DOB using the visit/admission date.">
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
            </section>

            <section className="p-card p-5 lg:col-span-4 space-y-4">
              <SectionHead eyebrow="Section 3" title="Location & Contact" />
              <FieldGrid cols={2}>
                <Field label="Hotel / Address" full>
                  <input value={form.hotel} onChange={(e) => update('hotel', e.target.value)} placeholder="Hotel or street address" className="p-input" />
                </Field>
                <Field label="Hotel Room No.">
                  <input value={form.hotelRoom} onChange={(e) => update('hotelRoom', e.target.value)} placeholder="e.g. 317" className="p-input" />
                </Field>
                <Field label="Postal">
                  <input value={form.postal} onChange={(e) => update('postal', e.target.value)} placeholder="Postal" className="p-input" />
                </Field>
                <Field label="Country Code">
                  <SelectInput value={form.phoneCode} onChange={(v) => update('phoneCode', v)}
                    options={R1_COUNTRY_CODES.map((c) => ({ value: c.code, label: c.label }))} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Demo phone" className="p-input" />
                </Field>
                <Field label="Email" full>
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="demo@example.com" className="p-input" />
                </Field>
              </FieldGrid>
            </section>
          </div>

          {/* Row 2: Clinical Note + Encounter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="p-card p-5 lg:col-span-5 space-y-4">
              <SectionHead eyebrow="Section 4" title="Presenting Complaint / Clinical Note" />
              <textarea rows={3} value={form.clinicalNote} onChange={(e) => update('clinicalNote', e.target.value)}
                placeholder="Brief summary of complaint or condition." className="p-input resize-y w-full" style={{ minHeight: 100 }} />
            </section>

            <section className="p-card p-5 lg:col-span-7 space-y-4">
              <SectionHead eyebrow="Section 5" title="Encounter Pattern / Care Setting"
                description="Independent of Financial Type and Treatment Mode." />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {R1_ENCOUNTER_PATTERNS.map((p) => (
                  <EncounterCard key={p.code} p={p} active={form.encounterPattern === p.code}
                    onClick={() => update('encounterPattern', p.code)} />
                ))}
              </div>
              <FieldGrid cols={2}>
                <Field label={isInpatient ? 'Admission Date *' : 'Visit Check-In Date *'}
                  hint="You can pick a past date to register a late / back-dated case (e.g. yesterday or the 1st of the month).">
                  <input type="date" value={form.visitCheckInDate} onChange={(e) => update('visitCheckInDate', e.target.value)} className="p-input" />
                </Field>
                <Field label={isInpatient ? 'Admission Time *' : 'Visit Check-In Time *'}>
                  <input type="time" value={form.visitCheckInTime} onChange={(e) => update('visitCheckInTime', e.target.value)} className="p-input" />
                </Field>
              </FieldGrid>
            </section>
          </div>

          {/* Row 3: Center Room (inpatient) + Treatment Mode */}
          <section className="p-card p-5 space-y-4">
            <SectionHead eyebrow="Section 6" title="Internal Center Room + Treatment Mode"
              description={isInpatient ? 'Inpatient: room is required.' : 'Room is optional for outpatient cases.'} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>
                  Assign Center Room (Available only) {isInpatient && <span style={{ color: '#B14242' }}>*</span>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
                  {board.map((r) => {
                    const taken = r.status === 'occupied'
                    const mine = String(r.number) === String(form.centerRoomNumber)
                    return (
                      <button key={r.number} type="button"
                        disabled={taken}
                        onClick={() => update('centerRoomNumber', String(r.number))}
                        className={cn('h-12 rounded-xl text-xs font-bold border-2 transition-colors', taken && 'opacity-30 cursor-not-allowed')}
                        style={mine ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
                          : taken ? { background: 'var(--p-surface-tint)', borderColor: 'var(--p-border)', color: 'var(--p-ink-400)' }
                          : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
                        {String(r.number).padStart(2, '0')}
                      </button>
                    )
                  })}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>
                  {availableRooms.length} available · {15 - availableRooms.length} occupied
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>Treatment Mode</div>
                <div className="space-y-2">
                  {R1_TREATMENT_MODES.map((m) => {
                    const active = form.treatmentMode === m.code
                    const tones = {
                      pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A' },
                      teal:    { bg: 'var(--p-teal-soft)',    fg: '#0A8F87' },
                      mixed:   { bg: 'var(--p-mixed-soft)',   fg: '#B14242' },
                    }[m.tone]
                    return (
                      <button key={m.code} type="button" onClick={() => update('treatmentMode', m.code)}
                        className="w-full rounded-xl p-3 text-left border-2 transition-colors flex items-center gap-3"
                        style={active
                          ? { background: tones.bg, borderColor: tones.fg, color: tones.fg }
                          : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
                        {m.code === 'surgical' ? <Scissors className="w-4 h-4" />
                          : m.code === 'conservative' ? <Heart className="w-4 h-4" />
                          : <Calendar className="w-4 h-4" />}
                        <span className="text-sm font-bold">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Row 4: Financial */}
          <section className="p-card p-5 space-y-5">
            <SectionHead eyebrow="Section 7" title="Financial Classification" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {R1_FINANCIAL_TYPES.map((t) => (
                <FinTypeCard key={t} type={t} active={form.financialType === t} onClick={() => update('financialType', t)} />
              ))}
            </div>

            {showInsuranceBlock && (
              <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
                  Open Insurance Case Under * — Mohamed's Instruction
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
                        {f.code === 'HMC' ? 'Hurghada Medical Center' : 'Sahl Hasheesh Medical Centre'}
                      </span>
                    </button>
                  ))}
                </div>
                {needsFacility && <Inline tone="warn" icon={AlertTriangle}>Select HMC or SMC.</Inline>}

                {/* R3.1 — Stage 1 (intake) only; Stage 2 happens in Admin */}
                <div className="rounded-xl p-3 text-[11px] flex items-start gap-2"
                     style={{ background: 'var(--p-teal-soft)', color: '#0A8F87', border: '1px solid #A6E2DC' }}>
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Stage 1 — Operational intake.</strong> Reception captures insurer contact + operational reference. Admin completes invoice currency, service charge and local assistance later (Stage 2).
                  </span>
                </div>

                <FieldGrid cols={2}>
                  <Field label="Insurance Company Name *" full hint="Pick from demo catalogue or add new — runtime-only.">
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
                    <input value={form.insurancePhone} onChange={(e) => update('insurancePhone', e.target.value)} placeholder="+49 89 1234567" className="p-input" />
                  </Field>
                </FieldGrid>

                <div className="rounded-xl p-4 space-y-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>{IS_SUPABASE ? 'Insurance Excess?' : 'Patient Excess?'}</div>
                    <div className="flex gap-2">
                      {['No', 'Yes'].map((opt) => (
                        <button key={opt} type="button" onClick={() => update('hasExcess', opt)}
                          className="h-9 px-4 rounded-full text-xs font-semibold border-2 transition-colors"
                          style={form.hasExcess === opt
                            ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
                            : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  {IS_SUPABASE && <div className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>The patient's share of an insurance case — collected now and still treasury money (kept separate from cash-case revenue).</div>}
                  {form.hasExcess === 'Yes' && (
                    <div className="space-y-3">
                      <FieldGrid cols={2}>
                        <Field label="Excess Amount">
                          <input type="number" value={form.excessAmount} onChange={(e) => update('excessAmount', e.target.value)} className="p-input" />
                        </Field>
                        <Field label="Currency">
                          <SelectInput value={form.excessCurrency} onChange={(v) => update('excessCurrency', v)}
                            options={R1_CURRENCIES.map((c) => ({ value: c, label: c }))} />
                        </Field>
                      </FieldGrid>
                      <PaymentLinesPanel lines={excessLines} setLines={setExcessLines}
                        typeLabel="Patient Excess" title="Excess Collection Lines"
                        helperText="Cash → any currency. Visa / Card → always EGP. FX rate is editable per line."
                        invoiceCurrency={form.excessCurrency} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {showCashBlock && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--p-cash-soft)', border: '1px solid #A8E6C7' }}>
                <FieldGrid cols={3}>
                  <div className="sm:col-span-3">
                    <LockedRefField size="md" label="Case / Invoice Reference"
                      value={nextRef.ref} family={nextRef.family}
                      hint="Generated from the case identity. Reception cannot type a separate invoice number — a formal invoice sequence is a future admin/billing decision." />
                  </div>
                  <Field label="Invoice Amount *">
                    <input type="number" value={form.invoiceAmount} onChange={(e) => update('invoiceAmount', e.target.value)} className="p-input" />
                  </Field>
                  <Field label="Invoice Currency *">
                    <SelectInput value={form.invoiceCurrency} onChange={(v) => update('invoiceCurrency', v)}
                      options={R1_CURRENCIES.map((c) => ({ value: c, label: c }))} />
                  </Field>
                </FieldGrid>
                <PaymentLinesPanel lines={paymentLines} setLines={setPaymentLines}
                  typeLabel="Invoice Payment" title="Payment Lines"
                  helperText="Cash → any currency · Visa / Card → always EGP. FX rate is editable per line."
                  invoiceCurrency={form.invoiceCurrency} />
                {IS_SUPABASE && Number(form.invoiceAmount) > 0 && (() => {
                  const due = Number(form.invoiceAmount) || 0
                  const got = Number(cashTotals[form.invoiceCurrency]) || 0
                  const out = Math.round((due - got) * 100) / 100
                  return out > 0.005
                    ? <Inline tone="pending">Under-collected: <strong>{out.toFixed(2)} {form.invoiceCurrency}</strong> still due against the {due.toFixed(2)} {form.invoiceCurrency} invoice. You can still save — the balance stays outstanding.</Inline>
                    : <Inline tone="info">Fully collected in {form.invoiceCurrency}.{got > due ? ` Overpaid by ${(got - due).toFixed(2)}.` : ''}</Inline>
                })()}
              </div>
            )}

            {showFreeBlock && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--p-gold-soft)', border: '1px solid #F1E2C9' }}>
                <FieldGrid cols={2}>
                  <Field label="Reason">
                    <input value={form.complimentaryReason} onChange={(e) => update('complimentaryReason', e.target.value)} className="p-input" />
                  </Field>
                  <Field label="Approved By">
                    <input value={form.complimentaryApprovedBy} onChange={(e) => update('complimentaryApprovedBy', e.target.value)} className="p-input" />
                  </Field>
                </FieldGrid>
                {IS_SUPABASE && <div className="text-[11px]" style={{ color: '#7A4F1F' }}>Reason and approver are required. The approval date &amp; time is recorded automatically on save. This case appears in reports as Free / Complimentary — never as unpaid Cash.</div>}
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-3 pb-4 bg-gradient-to-t from-[var(--p-canvas)] via-[var(--p-canvas)] to-transparent">
            <div className="p-card p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs flex items-center gap-2" style={{ color: 'var(--p-ink-500)' }}>
                <Info className="w-3.5 h-3.5" />
                <span>Case + room assignment add to demo state immediately. No persistence.</span>
              </div>
              <button type="submit" disabled={!canSubmit}
                className={cn('h-11 px-7 rounded-full text-sm font-bold p-btn-primary inline-flex items-center gap-2',
                  !canSubmit && 'opacity-40 cursor-not-allowed')}>
                Register Direct Case <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </OperationalShell>
  )
}

// =====================================================================
// Helpers (mirror NewCase clinic helpers)
// =====================================================================
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
function EncounterCard({ p, active, onClick }) {
  const map = {
    outpatient_single: { icon: Calendar, sub: 'One check-in + one check-out.' },
    outpatient_multi:  { icon: Repeat,   sub: 'Multiple sessions in the same case.' },
    inpatient_admission: { icon: BedDouble, sub: 'Admission → Discharge · room required.' },
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
      className="rounded-2xl p-3 text-left border-2 transition-all flex items-start gap-2.5"
      style={{ background: active ? t.bg : 'white', borderColor: active ? t.fg : 'var(--p-border)' }}>
      <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
        style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{p.label}</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>{cfg.sub}</div>
      </div>
    </button>
  )
}
function FinTypeCard({ type, active, onClick }) {
  const map = {
    'Pending':              { icon: Info, tone: 'pending' },
    'Cash':                 { icon: Banknote, tone: 'cash' },
    'Insurance':            { icon: ShieldCheck, tone: 'teal' },
    'Free / Complimentary': { icon: Gift, tone: 'gold' },
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
        </div>
        <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: active ? t.fg : 'var(--p-border)', background: active ? t.fg : 'white' }}>
          {active && <span className="w-2 h-2 rounded-full bg-white" />}
        </span>
      </div>
    </button>
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
