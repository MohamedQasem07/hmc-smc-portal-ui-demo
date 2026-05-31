import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Building2, Hotel, MapPin,
  BedDouble, Heart, Scissors, Clock, Send, Banknote, ShieldCheck, Info,
} from 'lucide-react'
import { OperationalShell, receptionRoute } from '../../../../premium/OperationalShell'
import {
  FacilityBadge, FinTypePill, RoutePill, DemoBanner, SectionHead,
} from '../../../../premium/p2cPrimitives'
import { StatusPill, Avatar } from '../../../../premium/primitives'
import { PaymentLinesPanel, blankLine, totalsByActualCurrency } from '../../../../premium/PaymentLines'
import { P2C_BILLING_FACILITIES } from '../../../../data/p2c'
import { R1_TREATMENT_MODES, R1_FINANCIAL_TYPES, R1_CURRENCIES } from '../../../../data/p2cR1'
import { useDemoState, useFindCase } from '../../../../context/DemoStateContext'
import { fetchRooms } from '../../../../lib/api/portalData'
import { fmtDate } from '../../../../lib/format'
import { cn } from '../../../../lib/cn'

/* =========================================================================
 * Phase 4 — LIVE Reception Received Transfer Detail (supabase mode only).
 * Mirrors the mock receive flow but writes to portal_* via:
 *   - actions.receiveTransfer  -> portal_receive_transfer RPC (atomic)
 *   - actions.classifyReceived -> classifyReceivedCase (fin type / treatment /
 *     insurance intake / REAL collections via recordCollection / room)
 * Same OUR ref + one case row are preserved (no duplicate). Receive-as-Cash
 * shows the full multi-line cash form (Visa -> EGP bank, FX per line) — the
 * exact same PaymentLinesPanel used by direct intake.
 * ========================================================================= */

function branchConfig(slug) {
  if (slug === 'al-kawther') return { id: 'al_kawther', name: 'Al-Kawther Branch', role: 'reception_kawther' }
  return { id: 'sheraton', name: 'Sheraton Branch', role: 'reception_sheraton' }
}

export default function LiveReceptionIncomingDetail() {
  const { branchSlug, caseId } = useParams()
  const { id: branchId, name: branchName, role } = branchConfig(branchSlug)
  const navigate = useNavigate()
  const c = useFindCase(caseId)
  const { actions } = useDemoState()

  const received = !!c?.transfer?.receivedAt

  const [finType, setFinType] = useState('Pending')
  const [facility, setFacility] = useState('')
  const [insCompany, setInsCompany] = useState('')
  const [insRef, setInsRef] = useState('')
  const [insEmail, setInsEmail] = useState('')
  const [hasExcess, setHasExcess] = useState('No')
  const [excessAmount, setExcessAmount] = useState('')
  const [excessCurrency, setExcessCurrency] = useState('EUR')
  const [excessLines, setExcessLines] = useState([blankLine('Patient Excess', 'EUR')])
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceCurrency, setInvoiceCurrency] = useState('EUR')
  const [paymentLines, setPaymentLines] = useState([blankLine('Invoice Payment', 'EUR')])
  const [treatmentMode, setTreatmentMode] = useState('pending')
  const [roomId, setRoomId] = useState('')
  const [rooms, setRooms] = useState([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  // Seed classification from whatever the case already carries (idempotent re-open).
  useEffect(() => {
    if (!c) return
    setFinType(c.financialType || 'Pending')
    setFacility(c.billingFacility || '')
    setTreatmentMode(c.treatmentMode || 'pending')
  }, [c?.id])

  // Live rooms for this branch (optional center-room assignment).
  useEffect(() => {
    let alive = true
    fetchRooms().then((rs) => { if (alive) setRooms(rs.filter((r) => r.locationCode === branchId && r.active)) })
      .catch(() => {})
    return () => { alive = false }
  }, [branchId])

  const cashTotals = useMemo(() => totalsByActualCurrency(paymentLines), [paymentLines])

  if (!c) {
    return (
      <OperationalShell role={role} active="transfers" identityName={branchName} identitySub="Reception & Rooms Workspace">
        <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
          <div className="p-card p-8 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto" style={{ color: '#A1672A' }} />
            <div className="text-sm font-semibold" style={{ color: 'var(--p-ink-700)' }}>Case not found or not visible to this branch.</div>
            <Link to={receptionRoute(role, 'incoming-transfers')} className="text-xs text-[var(--p-teal)] font-semibold">← Back to Incoming Transfers</Link>
          </div>
        </div>
      </OperationalShell>
    )
  }

  const facilityRequired = finType === 'Insurance' && !facility
  const canConfirm = received && finType !== 'Pending' && !facilityRequired && !busy

  async function markReceived() {
    setBusy(true); setError(null)
    try { await actions.receiveTransfer(caseId) }
    catch (e) { setError(e?.message || 'Receive failed') }
    finally { setBusy(false) }
  }

  async function confirm() {
    if (!canConfirm) return
    setBusy(true); setError(null)
    try {
      await actions.classifyReceived(caseId, {
        financialType: finType,
        billingFacility: finType === 'Insurance' ? facility : null,
        treatmentMode,
        insurance: finType === 'Insurance' ? { company: insCompany, ref: insRef, email: insEmail } : null,
        hasPatientExcess: finType === 'Insurance' && hasExcess === 'Yes',
        excessAmount: finType === 'Insurance' && hasExcess === 'Yes' ? Number(excessAmount) || null : null,
        excessCurrency,
        excessLines: finType === 'Insurance' && hasExcess === 'Yes' ? excessLines : [],
        paymentLines: finType === 'Cash' ? paymentLines : [],
        roomId: roomId || null,
      })
      setDone(true)
    } catch (e) { setError(e?.message || 'Classification failed') }
    finally { setBusy(false) }
  }

  const treatmentTone = treatmentMode === 'surgical' ? 'mixed' : treatmentMode === 'conservative' ? 'teal' : 'pending'

  return (
    <OperationalShell role={role} active="transfers" identityName={branchName} identitySub="Reception & Rooms Workspace">
      <div className="w-full px-4 sm:px-6 lg:px-10 pt-5 pb-12 max-w-[1400px] mx-auto space-y-5">

        <DemoBanner tone="live">
          Live — receiving writes to the server (transfer status, case classification, real collections). Same OUR Ref is preserved.
        </DemoBanner>

        <Link to={receptionRoute(role, 'incoming-transfers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--p-teal)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Incoming Transfers
        </Link>

        {/* Patient header */}
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
                {received ? <StatusPill tone="cash" icon={CheckCircle2}>Received</StatusPill>
                          : <StatusPill tone="pending" icon={Clock}>Awaiting receipt</StatusPill>}
                {treatmentMode !== 'pending' && (
                  <StatusPill tone={treatmentTone} icon={treatmentMode === 'surgical' ? Scissors : Heart}>
                    {treatmentMode === 'surgical' ? 'Surgical' : 'Conservative'}
                  </StatusPill>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Original registration / route history */}
          <section className="p-card p-5 xl:col-span-5 space-y-4">
            <SectionHead eyebrow="Captured by sending clinic" title="Original Registration"
              description="Route history is preserved — same case, same OUR Ref." />
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
              <PairRow icon={Building2} label="Registered At" value={c.registeredAtName} />
              <PairRow icon={Hotel} label="Hotel / Resort" value={c.patient.hotel} />
              <PairRow icon={MapPin} label="From" value={c.transfer?.fromName} />
            </div>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--p-transfer-soft)', border: '1px solid #D7CFF2' }}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#5443A8' }}>
                <Send className="w-3.5 h-3.5" /> Transfer
              </div>
              <PairRow icon={MapPin} label="Destination" value={c.transfer?.toBranchName} />
              <PairRow icon={Clock} label="Sent" value={c.transfer?.sentAt ? fmtDate(c.transfer.sentAt, { withTime: true }) : '—'} />
              <PairRow icon={CheckCircle2} label="Received" value={c.transfer?.receivedAt ? fmtDate(c.transfer.receivedAt, { withTime: true }) : 'Not yet'} />
              {c.transfer?.reason && (
                <div className="rounded-xl px-3 py-2 text-[12px]" style={{ background: 'white', color: 'var(--p-ink-700)' }}>
                  <strong>Reason: </strong>{c.transfer.reason}
                </div>
              )}
            </div>
          </section>

          {/* Receiving actions */}
          <section className="p-card p-5 xl:col-span-7 space-y-5">
            <SectionHead eyebrow="Branch actions" title={`Receiving at ${branchName}`}
              description="Accept the transfer, classify financially (operational), set Treatment Mode, optionally assign a room." />

            {error && <Inline tone="warn" icon={AlertTriangle}>{error}</Inline>}

            {/* Step 1 — Receive */}
            <StepBlock n={1} title="Confirm Receipt" done={received}
              right={received ? <StatusPill tone="cash" icon={CheckCircle2}>Received</StatusPill> : null}>
              {received ? (
                <div className="text-[12px]" style={{ color: 'var(--p-ink-700)' }}>Patient received at {branchName}. Classify the case below.</div>
              ) : (
                <button onClick={markReceived} disabled={busy}
                  className={cn('inline-flex items-center gap-1.5 h-11 px-5 rounded-full text-sm font-bold p-btn-primary', busy && 'opacity-50')}>
                  <CheckCircle2 className="w-4 h-4" /> {busy ? 'Receiving…' : 'Mark as Received'}
                </button>
              )}
            </StepBlock>

            {received && !done && (
              <>
                {/* Step 2 — Financial classification */}
                <StepBlock n={2} title="Set Financial Type"
                  done={finType !== 'Pending' && (finType !== 'Insurance' || !!facility)}
                  right={finType !== 'Pending' ? <FinTypePill type={finType} /> : <span className="text-[11px]" style={{ color: 'var(--p-ink-500)' }}>Still pending</span>}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {R1_FINANCIAL_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => setFinType(t)}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold border-2 transition-colors"
                        style={finType === t
                          ? { background: 'var(--p-teal-soft)', borderColor: 'var(--p-teal)', color: 'var(--p-ink-900)' }
                          : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* CASH — full multi-line collection form (Visa -> EGP bank, FX per line) */}
                  {finType === 'Cash' && (
                    <div className="rounded-2xl p-4 mt-3 space-y-3" style={{ background: 'var(--p-cash-soft)', border: '1px solid #A8E6C7' }}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#0A8F62' }}>
                        <Banknote className="w-4 h-4" /> Cash Invoice Collection
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Invoice Amount">
                          <input type="number" className="p-input" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="0" />
                        </Field>
                        <Field label="Invoice Currency">
                          <SelectInput value={invoiceCurrency} onChange={setInvoiceCurrency} options={R1_CURRENCIES} />
                        </Field>
                      </div>
                      <PaymentLinesPanel
                        lines={paymentLines} setLines={setPaymentLines}
                        typeLabel="Invoice Payment" title="Payment Lines"
                        helperText="Cash → any currency · Visa / Card → always EGP (Bank Collection). FX rate editable per line."
                        invoiceCurrency={invoiceCurrency} />
                      <div className="text-[11px]" style={{ color: 'var(--p-ink-600)' }}>
                        Collected: {Object.entries(cashTotals).map(([cur, v]) => `${v.toFixed(2)} ${cur}`).join(' · ') || 'no lines yet'}
                      </div>
                    </div>
                  )}

                  {/* INSURANCE */}
                  {finType === 'Insurance' && (
                    <div className="rounded-2xl p-4 mt-3 space-y-3" style={{ background: 'var(--p-brand-pale)', border: '1px solid #BCCDE8' }}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-brand-mid)' }}>
                        <ShieldCheck className="w-4 h-4" /> Open Insurance Case Under *
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {P2C_BILLING_FACILITIES.map((f) => (
                          <button key={f.code} type="button" onClick={() => setFacility(f.code)}
                            className="rounded-xl p-3 text-left border-2 transition-all flex items-center gap-2"
                            style={{ background: facility === f.code ? 'var(--p-teal-soft)' : 'white', borderColor: facility === f.code ? 'var(--p-teal)' : 'var(--p-border)' }}>
                            <FacilityBadge code={f.code} size="md" />
                            <span className="text-[11px]" style={{ color: 'var(--p-ink-700)' }}>{f.code === 'HMC' ? 'Hurghada Medical Center' : 'Sahl Hasheesh Medical Centre'}</span>
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Insurance Company"><input className="p-input" value={insCompany} onChange={(e) => setInsCompany(e.target.value)} placeholder="e.g. Allianz" /></Field>
                        <Field label="Reference Number"><input className="p-input" value={insRef} onChange={(e) => setInsRef(e.target.value)} placeholder="e.g. ALZ-1234" /></Field>
                        <Field label="Insurer Email"><input type="email" className="p-input" value={insEmail} onChange={(e) => setInsEmail(e.target.value)} placeholder="claims@…" /></Field>
                      </div>
                      <div className="rounded-xl p-3 space-y-3" style={{ background: 'white', border: '1px solid var(--p-border)' }}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-ink-700)' }}>Patient Excess?</div>
                          <div className="flex gap-2">
                            {['No', 'Yes'].map((opt) => (
                              <button key={opt} type="button" onClick={() => setHasExcess(opt)}
                                className="h-9 px-4 rounded-full text-xs font-semibold border-2 transition-colors"
                                style={hasExcess === opt ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' } : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        {hasExcess === 'Yes' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="Excess Amount"><input type="number" className="p-input" value={excessAmount} onChange={(e) => setExcessAmount(e.target.value)} placeholder="0" /></Field>
                              <Field label="Currency"><SelectInput value={excessCurrency} onChange={setExcessCurrency} options={R1_CURRENCIES} /></Field>
                            </div>
                            <PaymentLinesPanel
                              lines={excessLines} setLines={setExcessLines}
                              typeLabel="Patient Excess" title="Excess Collection Lines"
                              helperText="Cash → any currency · Visa / Card → always EGP. FX editable per line."
                              invoiceCurrency={excessCurrency} />
                          </div>
                        )}
                      </div>
                      {facilityRequired && <Inline tone="warn" icon={AlertTriangle}>Select HMC or SMC to confirm the Insurance case.</Inline>}
                    </div>
                  )}
                </StepBlock>

                {/* Step 3 — Treatment mode */}
                {finType !== 'Pending' && (
                  <StepBlock n={3} title="Set Treatment Mode (operational only)"
                    done={treatmentMode === 'conservative' || treatmentMode === 'surgical'}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {R1_TREATMENT_MODES.map((m) => {
                        const active = treatmentMode === m.code
                        const tones = { pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A' }, teal: { bg: 'var(--p-teal-soft)', fg: '#0A8F87' }, mixed: { bg: 'var(--p-mixed-soft)', fg: '#B14242' } }
                        const t = tones[m.tone] || tones.pending
                        return (
                          <button key={m.code} type="button" onClick={() => setTreatmentMode(m.code)}
                            className="rounded-xl p-3 text-left border-2 transition-colors flex items-center gap-2.5"
                            style={{ background: active ? t.bg : 'white', borderColor: active ? t.fg : 'var(--p-border)', color: active ? t.fg : 'var(--p-ink-700)' }}>
                            {m.code === 'surgical' ? <Scissors className="w-4 h-4" /> : m.code === 'conservative' ? <Heart className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            <span className="text-sm font-bold">{m.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </StepBlock>
                )}

                {/* Step 4 — optional room */}
                {finType !== 'Pending' && rooms.length > 0 && (
                  <StepBlock n={4} title="Assign Center Room (optional)"
                    done={!!roomId} right={roomId ? <StatusPill tone="navy" icon={BedDouble}>{rooms.find((r) => r.id === roomId)?.roomCode}</StatusPill> : null}>
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
                      {rooms.map((r) => (
                        <button key={r.id} type="button" onClick={() => setRoomId(roomId === r.id ? '' : r.id)}
                          className="h-12 rounded-xl text-xs font-bold border-2 transition-colors"
                          style={roomId === r.id ? { background: 'var(--p-teal)', borderColor: 'var(--p-teal)', color: 'white' } : { background: 'white', borderColor: 'var(--p-border)', color: 'var(--p-ink-700)' }}>
                          {r.roomCode}
                        </button>
                      ))}
                    </div>
                  </StepBlock>
                )}

                {/* Confirm */}
                <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-1 bg-gradient-to-t from-white via-white to-transparent">
                  <div className="rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--p-surface-tint)', border: '1px solid var(--p-border)' }}>
                    <div className="text-xs" style={{ color: 'var(--p-ink-500)' }}>
                      {finType === 'Pending' ? 'Pick a financial type' : facilityRequired ? 'Select HMC or SMC' : 'Ready to confirm'}
                    </div>
                    <button onClick={confirm} disabled={!canConfirm}
                      className={cn('inline-flex items-center gap-1.5 h-11 px-6 rounded-full text-sm font-bold p-btn-primary', !canConfirm && 'opacity-40 cursor-not-allowed')}>
                      <CheckCircle2 className="w-4 h-4" /> {busy ? 'Saving…' : 'Confirm Receiving'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {done && (
              <div className="rounded-xl p-4 flex items-start gap-2 text-[13px]"
                style={{ background: 'var(--p-finalized-soft)', color: '#076D4A', border: '1px solid #9FD4BB' }}>
                <CheckCircle2 className="w-5 h-5 mt-0.5" />
                <div>
                  <strong>Saved.</strong> Case classified as <strong>{finType}</strong>
                  {finType === 'Insurance' && facility && <> under <strong>{facility}</strong></>} and recorded on the server.
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => navigate(receptionRoute(role, 'cases'))} className="text-xs font-bold underline">View Branch Cases →</button>
                    <button onClick={() => navigate(receptionRoute(role, 'incoming-transfers'))} className="text-xs font-bold underline">Back to Incoming →</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </OperationalShell>
  )
}

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

function PairRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <span className="w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'white', color: 'var(--p-ink-500)', border: '1px solid var(--p-border)' }}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>{label}</div>
        <div className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--p-ink-900)' }}>{value || '—'}</div>
      </div>
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className="p-input appearance-none w-full">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Inline({ tone = 'pending', icon: Icon, children }) {
  const tones = {
    pending: { bg: 'var(--p-pending-soft)', fg: '#A1672A', border: '#F0C97A' },
    warn: { bg: 'var(--p-mixed-soft)', fg: '#B14242', border: '#F0B5B5' },
  }[tone] || { bg: 'var(--p-surface-tint)', fg: 'var(--p-ink-700)', border: 'var(--p-border)' }
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2" style={{ background: tones.bg, color: tones.fg, border: `1px solid ${tones.border}` }}>
      {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}
