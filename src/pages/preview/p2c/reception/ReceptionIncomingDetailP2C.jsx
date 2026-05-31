import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Building2, Hotel, MapPin,
  ShieldCheck, BedDouble, Heart, Scissors, Clock, ChevronDown, Send,
  User, Phone, Mail, Info, Banknote, Plus, Trash2, CreditCard, Wallet,
  Calendar,
} from 'lucide-react'
import { OperationalShell, receptionRoute } from '../../../../premium/OperationalShell'
import {
  FacilityBadge, FinTypePill, RoutePill, P2CTimeline, DemoBanner, SectionHead,
} from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { P2C_BILLING_FACILITIES } from '../../../../data/p2c'
import { useDemoState, useFindCase, useRoomBoard } from '../../../../context/DemoStateContext'
import {
  R1_TREATMENT_MODES, R1_FINANCIAL_TYPES,
  R1_PAYMENT_METHODS, R1_CURRENCIES,
} from '../../../../data/p2cR1'
import { fmtDate, fmtRelative } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'
import { IS_SUPABASE } from '../../../../lib/api/config'
import LiveReceptionIncomingDetail from './LiveReceptionIncomingDetail'

/* =========================================================================
 * P2C.R1 — Reception Received Transfer Detail / Assignment
 * -----------------------------------------------------------------------
 * Top: "Original Registration" panel preserves everything captured by the
 * sending external clinic (registered at, hotel + hotel room, original
 * financial type / billing facility if already set, transfer reason / note).
 *
 * Bottom: "Receiving Details" panel where the branch performs:
 *   - Mark Patient as Received
 *   - Assign Center Treatment Room (Room 1 – 15)
 *   - Set / Confirm Financial Type (Pending / Cash / Insurance / Free)
 *   - If Insurance: HMC / SMC + insurer details + Patient Excess (multi-line)
 *   - Set Treatment Mode (Not Determined / Conservative / Surgical)
 *
 * All actions stay in local state — no backend.
 * ========================================================================= */

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

export default function ReceptionIncomingDetailP2C() {
  // Pilot (supabase mode): use the live receive flow (RPC + real collections).
  // Mock mode (5173) keeps the original demo body below, byte-identical.
  if (IS_SUPABASE) return <LiveReceptionIncomingDetail />
  const { branchSlug, caseId } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)
  const original = useFindCase(caseId)
  const { actions, state } = useDemoState()
  const board = useRoomBoard(branchId)

  // Local overlay state — seeded from current demo state, then either dispatched or kept local
  const [localReceived,  setLocalReceived]  = useState(!!original?.transfer?.receivedAt)
  const [centerRoom,     setCenterRoom]     = useState(original?.centerRoomNumber || '')
  const [finType,        setFinType]        = useState(original?.financialType || 'Pending')
  const [facility,       setFacility]       = useState(original?.billingFacility || '')
  const [insCompany,     setInsCompany]     = useState(original?.insurance?.company || '')
  const [insRef,         setInsRef]         = useState(original?.insurance?.ref || '')
  const [insEmail,       setInsEmail]       = useState(original?.insurance?.email || '')
  const [hasExcess,      setHasExcess]      = useState(original?.hasPatientExcess ? 'Yes' : 'No')
  const [excessAmount,   setExcessAmount]   = useState(original?.excessAmount || '')
  const [excessCurrency, setExcessCurrency] = useState(original?.excessCurrency || 'EUR')
  const [excessLines,    setExcessLines]    = useState(original?.excessLines?.length ? original.excessLines : [blankLine('Patient Excess')])
  const [treatmentMode,  setTreatmentMode]  = useState(original?.treatmentMode || 'pending')
  const [confirmStep,    setConfirmStep]    = useState(null)

  const myRoom = original?.centerRoomNumber
  const availableRooms = useMemo(() => {
    return board.filter((r) => r.status === 'available' || r.number === myRoom)
  }, [board, myRoom])

  if (!original) {
    return (
      <OperationalShell role={role} active="transfers" identityName={branchName} identitySub="Reception & Rooms Workspace">
        <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
          <div className="p-card p-8 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto" style={{ color: '#A1672A' }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>Case not found</div>
            <Link to={receptionRoute(role, 'incoming-transfers')} className="text-xs text-[var(--p-teal)] font-semibold">← Back</Link>
          </div>
        </div>
      </OperationalShell>
    )
  }

  const c = original
  const facilityRequired = finType === 'Insurance' && !facility
  const roomRequired = localReceived && !centerRoom && finType !== 'Pending'
  const canConfirm = !facilityRequired && !roomRequired

  function handleConfirm() {
    if (!canConfirm) return
    // Persist into demo state
    if (!original?.transfer?.receivedAt && localReceived) actions.receiveTransfer(caseId)
    const patch = {
      financialType: finType,
      billingFacility: finType === 'Insurance' ? facility : null,
      insurance: finType === 'Insurance' ? { company: insCompany, ref: insRef, email: insEmail } : null,
      hasPatientExcess: finType === 'Insurance' && hasExcess === 'Yes',
      excessAmount:   finType === 'Insurance' && hasExcess === 'Yes' ? Number(excessAmount) || null : null,
      excessCurrency: finType === 'Insurance' && hasExcess === 'Yes' ? excessCurrency : null,
      excessLines:    finType === 'Insurance' && hasExcess === 'Yes' ? excessLines : [],
      treatmentMode,
    }
    actions.updateCase(caseId, patch)
    if (centerRoom && Number(centerRoom) !== original?.centerRoomNumber) {
      actions.assignRoom(caseId, Number(centerRoom), branchId)
    }
    setConfirmStep('done')
  }

  const treatmentTone = treatmentMode === 'surgical' ? 'mixed'
    : treatmentMode === 'conservative' ? 'teal'
    : 'pending'

  return (
    <OperationalShell role={role} active="transfers" identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner>
          UI Concept — all classification actions update local state only. No backend connected, no record is persisted.
        </DemoBanner>

        <Link to={receptionRoute(role, 'incoming-transfers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Incoming Transfers
        </Link>

        {/* Patient header card */}
        <div className="p-card p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar name={c.patient.name} size={56} tone="navy" />
            <div className="flex-1 min-w-0">
              <h1 className="p-h1 text-xl sm:text-2xl">{c.patient.name}</h1>
              <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--p-ink-400)' }}>{c.ourRef}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <FinTypePill type={finType} />
                <RoutePill route={c.route} routeLabel={c.routeLabel} />
                {facility && <FacilityBadge code={facility} size="md" />}
                {treatmentMode && treatmentMode !== 'pending' && (
                  <StatusPill tone={treatmentTone}
                    icon={treatmentMode === 'surgical' ? Scissors : Heart}>
                    {treatmentMode === 'surgical' ? 'Surgical Treatment' : 'Conservative Treatment'}
                  </StatusPill>
                )}
                {centerRoom && (
                  <StatusPill tone="navy" icon={BedDouble}>Room {String(centerRoom).padStart(2, '0')}</StatusPill>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoItem label="Nationality" value={c.patient.nationality} />
                <InfoItem label="Age / Gender" value={`${c.patient.age || '—'} / ${c.patient.gender || '—'}`} />
                <InfoItem label="Phone" value={[c.patient.phoneCode, c.patient.phone].filter(Boolean).join(' ')} icon={Phone} />
                <InfoItem label="Email" value={c.patient.email} icon={Mail} />
              </div>
            </div>
          </div>
        </div>

        {/* TWO PANELS: Original Registration | Receiving Details */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* ── Original Registration ──────────────────────────────────── */}
          <section className="p-card p-5 xl:col-span-5 space-y-4">
            <SectionHead eyebrow="Captured by sending clinic" title="Original Registration"
              description="These fields stay frozen — the patient's hotel and room are preserved through the transfer." />

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <PairRow icon={Building2} label="Registered At" value={c.registeredAtName} />
              <PairRow icon={Hotel} label="Hotel / Resort" value={c.patient.hotel} />
              <PairRow icon={MapPin} label="Hotel Room No." value={c.patient.hotelRoom || '—'} highlight />
              <PairRow icon={Calendar} label="Visit Date" value={fmtDate(c.visitDate, { withTime: true })} />
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-transfer-soft)', border: '1px solid #D7CFF2' }}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#5443A8' }}>
                <Send className="w-3.5 h-3.5" /> Transfer Details
              </div>
              <PairRow icon={MapPin} label="Destination" value={c.transfer?.toBranchName} />
              <PairRow icon={Info}   label="Transport"   value={c.transfer?.transport} />
              <PairRow icon={Clock}  label="Sent"        value={fmtDate(c.transfer?.sentAt, { withTime: true })} />
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] font-bold mb-1" style={{ color: '#5443A8' }}>Reason</div>
                <div className="text-[13px]" style={{ color: 'var(--p-ink-800)' }}>{c.transfer?.reason || '—'}</div>
              </div>
              {c.transfer?.referralNote && (
                <div className="rounded-xl px-3 py-2 text-[12px]" style={{ background: 'white', color: 'var(--p-ink-700)' }}>
                  <strong>Referral Note: </strong>{c.transfer.referralNote}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>Original Financial Snapshot</div>
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <strong style={{ color: 'var(--p-ink-900)' }}>{c.financialType || 'Pending'}</strong>
                {c.billingFacility && (
                  <>
                    <span style={{ color: 'var(--p-ink-400)' }}>·</span>
                    Pre-selected facility: <FacilityBadge code={c.billingFacility} size="sm" />
                  </>
                )}
                {!c.billingFacility && c.financialType === 'Insurance' && (
                  <span className="text-[11px]" style={{ color: '#A1672A' }}>(no facility selected by sending clinic)</span>
                )}
              </div>
              {c.patient.note && (
                <div className="rounded-xl px-3 py-2 text-[12px] mt-2" style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)' }}>
                  <strong>Clinical Note: </strong>{c.patient.note}
                </div>
              )}
            </div>
          </section>

          {/* ── Receiving Details ──────────────────────────────────────── */}
          <section className="p-card p-5 xl:col-span-7 space-y-5">
            <SectionHead eyebrow="Branch actions" title={`Receiving at ${branchName}`}
              description="Mark patient received, assign a Center Room, classify financially and set Treatment Mode." />

            {/* Step 1: Mark Received */}
            <StepBlock n={1} title="Confirm Receipt"
              done={localReceived}
              right={localReceived ? <StatusPill tone="cash" icon={CheckCircle2}>Received</StatusPill> : null}>
              {localReceived ? (
                <div className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>
                  Patient physically arrived at {branchName}. You can now assign a room and classify the case.
                </div>
              ) : (
                <button onClick={() => { setLocalReceived(true); actions.receiveTransfer(caseId) }}
                  className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold p-btn-primary">
                  <CheckCircle2 className="w-4 h-4" /> Mark as Received
                </button>
              )}
            </StepBlock>

            {/* Step 2: Center Treatment Room */}
            {localReceived && (
              <StepBlock n={2} title="Assign Center Treatment Room"
                done={!!centerRoom}
                right={centerRoom
                  ? <StatusPill tone="navy" icon={BedDouble}>Room {String(centerRoom).padStart(2, '0')}</StatusPill>
                  : <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Required to continue</span>}>
                <p className="text-[12px]" style={{ color: 'var(--p-ink-600)' }}>
                  Rooms 1–15 (admin-configurable concept). The hotel room above remains visible — center room is in addition, not a replacement.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2 mt-2">
                  {board.map((r) => {
                    const isMine = r.number === Number(centerRoom)
                    const isOccByOther = r.status === 'occupied' && r.caseId !== c.id
                    const disabled = isOccByOther
                    return (
                      <button key={r.number} type="button" disabled={disabled}
                        onClick={() => setCenterRoom(r.number)}
                        className={cn('h-12 rounded-xl text-xs font-bold border-2 transition-colors', disabled && 'opacity-30 cursor-not-allowed')}
                        style={
                          isMine
                            ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
                            : isOccByOther
                              ? { background: 'var(--p-surface-tint)', borderColor: 'var(--p-border)', color: 'var(--p-ink-400)' }
                              : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }
                        }>
                        {String(r.number).padStart(2, '0')}
                      </button>
                    )
                  })}
                </div>
              </StepBlock>
            )}

            {/* Step 3: Financial Type */}
            {localReceived && (
              <StepBlock n={3} title="Set / Confirm Financial Type"
                done={finType !== 'Pending' && (finType !== 'Insurance' || !!facility)}
                right={finType !== 'Pending'
                  ? <FinTypePill type={finType} />
                  : <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Still pending</span>}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {R1_FINANCIAL_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setFinType(t)}
                      className="rounded-xl px-3 py-2.5 text-xs font-semibold border-2 transition-colors"
                      style={
                        finType === t
                          ? { background: 'var(--p-teal-soft)', borderColor: 'var(--p-teal)', color: 'var(--p-ink-900)' }
                          : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }
                      }>
                      {t}
                    </button>
                  ))}
                </div>

                {finType === 'Insurance' && (
                  <div className="rounded-2xl p-4 mt-3 space-y-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                    <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
                      Open Insurance Case Under *
                    </div>
                    {c.billingFacility && (
                      <div className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--p-ink-700)' }}>
                        Pre-selected by sending clinic: <FacilityBadge code={c.billingFacility} size="sm" />
                        <span>— confirm or override per Mohamed's instruction.</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {P2C_BILLING_FACILITIES.map((f) => (
                        <button key={f.code} type="button" onClick={() => setFacility(f.code)}
                          className="rounded-xl p-3 text-left border-2 transition-all flex items-center gap-2"
                          style={{
                            background: facility === f.code ? 'var(--p-teal-soft)' : 'white',
                            borderColor: facility === f.code ? 'var(--p-teal)' : 'var(--p-border)',
                          }}>
                          <FacilityBadge code={f.code} size="md" />
                          <span className="text-[11px]" style={{ color: 'var(--p-ink-700)' }}>
                            {f.code === 'HMC' ? 'Hurghada Medical Center' : 'Sahl Hasheesh Medical Centre'}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Insurance Company">
                        <input className="p-input" value={insCompany} onChange={(e) => setInsCompany(e.target.value)} placeholder="e.g. Demo Allianz" />
                      </Field>
                      <Field label="Reference Number">
                        <input className="p-input" value={insRef} onChange={(e) => setInsRef(e.target.value)} placeholder="e.g. ALZ-DEMO-R1-7741" />
                      </Field>
                      <Field label="Insurer Email">
                        <input type="email" className="p-input" value={insEmail} onChange={(e) => setInsEmail(e.target.value)} placeholder="claims@…" />
                      </Field>
                    </div>

                    {/* Excess */}
                    <div className="rounded-xl p-3 space-y-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>Patient Excess?</div>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>If yes, collect as Patient Excess — Visa/Card stays EGP only.</p>
                        </div>
                        <div className="flex gap-2">
                          {['No', 'Yes'].map((opt) => (
                            <button key={opt} type="button" onClick={() => setHasExcess(opt)}
                              className="h-9 px-4 rounded-full text-xs font-semibold border-2 transition-colors"
                              style={hasExcess === opt
                                ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' }
                                : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {hasExcess === 'Yes' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Excess Amount"><input type="number" className="p-input" value={excessAmount} onChange={(e) => setExcessAmount(e.target.value)} placeholder="0" /></Field>
                            <Field label="Currency">
                              <SelectInput value={excessCurrency} onChange={setExcessCurrency} options={R1_CURRENCIES} />
                            </Field>
                          </div>
                          <ExcessLines lines={excessLines} setLines={setExcessLines} />
                        </div>
                      )}
                    </div>

                    {facilityRequired && (
                      <Inline tone="warn" icon={AlertTriangle}>Select HMC or SMC to confirm the Insurance case.</Inline>
                    )}
                  </div>
                )}
              </StepBlock>
            )}

            {/* Step 4: Treatment Mode */}
            {localReceived && finType !== 'Pending' && (
              <StepBlock n={4} title="Set Treatment Mode"
                done={treatmentMode === 'conservative' || treatmentMode === 'surgical'}
                right={
                  treatmentMode === 'conservative' ? <StatusPill tone="teal" icon={Heart}>Conservative</StatusPill>
                    : treatmentMode === 'surgical' ? <StatusPill tone="mixed" icon={Scissors}>Surgical</StatusPill>
                    : <StatusPill tone="pending" icon={Clock}>Not Determined</StatusPill>
                }>
                <p className="text-[12px]" style={{ color: 'var(--p-ink-600)' }}>
                  Treatment Mode is independent of Route and Financial Type. It is only an operational classification — no billing impact in this demo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {R1_TREATMENT_MODES.map((m) => {
                    const active = treatmentMode === m.code
                    const tones = {
                      pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A' },
                      teal:    { bg: 'var(--p-teal-soft)',    fg: '#0A8F87' },
                      mixed:   { bg: 'var(--p-mixed-soft)',   fg: '#B14242' },
                    }
                    const t = tones[m.tone] || tones.pending
                    return (
                      <button key={m.code} type="button" onClick={() => setTreatmentMode(m.code)}
                        className="rounded-xl p-3 text-left border-2 transition-colors flex items-center gap-2.5"
                        style={{
                          background: active ? t.bg : 'white',
                          borderColor: active ? t.fg : 'var(--p-border)',
                          color: active ? t.fg : 'var(--p-ink-700)',
                        }}>
                        {m.code === 'surgical' ? <Scissors className="w-4 h-4" />
                          : m.code === 'conservative' ? <Heart className="w-4 h-4" />
                          : <Clock className="w-4 h-4" />}
                        <span className="text-sm font-bold">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </StepBlock>
            )}

            {/* Submit bar */}
            {localReceived && (
              <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-1 bg-gradient-to-t from-white via-white to-transparent">
                <div className="rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap"
                  style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                  <div className="text-xs" style={{ color: 'var(--p-ink-500)' }}>
                    {roomRequired && '· Assign a Center Room '}
                    {facilityRequired && '· Select HMC or SMC '}
                    {!roomRequired && !facilityRequired && 'All required fields complete.'}
                  </div>
                  <button onClick={handleConfirm} disabled={!canConfirm}
                    className={cn('inline-flex items-center gap-1.5 h-11 px-6 rounded-full text-sm font-bold p-btn-primary',
                      !canConfirm && 'opacity-40 cursor-not-allowed')}>
                    <CheckCircle2 className="w-4 h-4" /> Confirm Receiving (Demo)
                  </button>
                </div>
                {confirmStep === 'done' && (
                  <div className="mt-3 rounded-xl p-3 flex items-start gap-2 text-[12px]"
                    style={{ background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5" />
                    <div>
                      <strong>Demo confirmation:</strong> case classified as <strong>{finType}</strong>
                      {finType === 'Insurance' && facility && <> under <strong>{facility}</strong></>}
                      {centerRoom && <> · Room {String(centerRoom).padStart(2, '0')} assigned</>}
                      {treatmentMode && treatmentMode !== 'pending' && <> · {treatmentMode === 'surgical' ? 'Surgical' : 'Conservative'} Treatment</>}.
                    </div>
                  </div>
                )}
              </div>
            )}

          </section>
        </div>
      </div>
    </OperationalShell>
  )
}

// =====================================================================
// Sub-components
// =====================================================================

function StepBlock({ n, title, children, done, right }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: done ? 'var(--p-surface)' : 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold"
            style={{ background: done ? 'var(--p-teal)' : 'white', color: done ? 'white' : 'var(--p-ink-500)', border: '1px solid var(--p-border)' }}>
            {done ? <CheckCircle2 className="w-4 h-4" /> : n}
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--p-ink-900)' }}>{title}</span>
        </div>
        {right}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function PairRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <span className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: highlight ? 'var(--p-brand-pale)' : 'white', color: highlight ? 'var(--p-brand-mid)' : 'var(--p-ink-500)', border: '1px solid var(--p-border)' }}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
        <div className={cn('text-sm font-semibold mt-0.5 truncate')} style={{ color: highlight ? 'var(--p-brand-mid)' : 'var(--p-ink-900)' }}>{value || '—'}</div>
      </div>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5" style={{ color: 'var(--p-ink-500)' }}>
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: 'var(--p-ink-800)' }}>{value || '—'}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</label>
      {children}
    </div>
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="p-input appearance-none w-full pr-8">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
    </div>
  )
}

function Inline({ tone = 'pending', icon: Icon, children }) {
  const tones = {
    pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A', border: '#F0C97A' },
    warn:    { bg: 'var(--p-mixed-soft)',   fg: '#B14242', border: '#F0B5B5' },
  }[tone] || { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-700)', border: 'var(--p-border)' }
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
      style={{ background: tones.bg, color: tones.fg, border: `1px solid ${tones.border}` }}>
      {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function blankLine(type) {
  return {
    id: `el_${Math.random().toString(36).slice(2, 9)}`,
    type, method: 'Cash', currency: 'EUR', amount: '',
    fxRefAmount: '', fxRefCurrency: 'EUR', fxRate: '', note: '',
  }
}

function ExcessLines({ lines, setLines }) {
  function update(idx, patch) {
    setLines((p) => p.map((l, i) => {
      if (i !== idx) return l
      const next = { ...l, ...patch }
      if (next.method === 'Visa / Card' && next.currency !== 'EGP') next.currency = 'EGP'
      return next
    }))
  }
  function add() { setLines((p) => [...p, blankLine('Patient Excess')]) }
  function remove(idx) { setLines((p) => p.length === 1 ? [blankLine('Patient Excess')] : p.filter((_, i) => i !== idx)) }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>Excess Collection Lines</div>
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold p-btn-ghost">
          <Plus className="w-3 h-3" /> Add Line
        </button>
      </div>
      {lines.map((l, i) => {
        const isVisa = l.method === 'Visa / Card'
        return (
          <div key={l.id} className="rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
            style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
            <Field label="Method">
              <div className="relative">
                <select value={l.method} onChange={(e) => update(i, { method: e.target.value })} className="p-input appearance-none w-full pr-8 h-10">
                  {R1_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
              </div>
            </Field>
            <Field label={isVisa ? 'Currency (locked)' : 'Currency'}>
              <div className="relative">
                <select value={l.currency} disabled={isVisa} onChange={(e) => update(i, { currency: e.target.value })} className="p-input appearance-none w-full pr-8 h-10"
                  style={isVisa ? { background: 'var(--p-surface-deep)' } : {}}>
                  {R1_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--p-ink-400)' }} />
              </div>
            </Field>
            <Field label="Amount">
              <input type="number" value={l.amount} onChange={(e) => update(i, { amount: e.target.value })} placeholder="0" className="p-input h-10" />
            </Field>
            <Field label="Foreign Amt.">
              <input type="number" value={l.fxRefAmount} disabled={!isVisa} onChange={(e) => update(i, { fxRefAmount: e.target.value })} placeholder="0" className="p-input h-10"
                style={!isVisa ? { background: 'var(--p-surface-deep)' } : {}} />
            </Field>
            <Field label="FX Rate">
              <input type="number" value={l.fxRate} disabled={!isVisa} onChange={(e) => update(i, { fxRate: e.target.value })} placeholder="62.00" className="p-input h-10"
                style={!isVisa ? { background: 'var(--p-surface-deep)' } : {}} />
            </Field>
            <Field label="Note">
              <input value={l.note} onChange={(e) => update(i, { note: e.target.value })} placeholder="(optional)" className="p-input h-10" />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <button type="button" onClick={() => remove(i)} aria-label="Remove line"
                className="w-10 h-10 rounded-md inline-flex items-center justify-center"
                style={{ background: 'white', border: '1px solid var(--p-border)', color: 'var(--p-mixed)' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="sm:col-span-12 text-[10px] inline-flex items-center gap-1" style={{ color: 'var(--p-ink-500)' }}>
              {isVisa
                ? <><CreditCard className="w-3 h-3" /> Visa / Card collection is always EGP (Bank Collection).</>
                : <><Wallet className="w-3 h-3" /> Cash collected in {l.currency || '—'} — added to {l.currency || '—'} physical cash treasury.</>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
