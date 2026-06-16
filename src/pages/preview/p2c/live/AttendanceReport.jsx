import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, CalendarRange, Users, Clock, AlertTriangle } from 'lucide-react'
import { fetchAttendanceRange } from '../../../../lib/api/portalData'

/* =========================================================================
 * AttendanceReport — per-person, date-range attendance + Excel/CSV export.
 * -----------------------------------------------------------------------
 * The daily attendance overview answers "who is on shift today". This answers
 * "show me one person's attendance over a period, and let me export it." Admin
 * sees every location (RLS); a clinic user would see only its own. Read-only.
 * ========================================================================= */

const TODAY = new Date().toLocaleDateString('en-CA')          // YYYY-MM-DD (local)
const MONTH_START = TODAY.slice(0, 8) + '01'                  // first of this month

function hoursLabel(min) {
  const m = Math.max(0, Math.round(min || 0))
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}
function fmtTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
}

export default function AttendanceReport() {
  const [from, setFrom] = useState(MONTH_START)
  const [to, setTo] = useState(TODAY)
  const [person, setPerson] = useState('all')
  const [data, setData] = useState({ shifts: [], duties: [] })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  // Refetch on date-range change only; the person filter is applied client-side
  // so switching people is instant and populates the dropdown from real data.
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    fetchAttendanceRange(from, to)
      .then((d) => { if (alive) setData(d) })
      .catch((e) => { if (alive) setErr(e?.message || 'Failed to load attendance') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [from, to])

  const rows = useMemo(() => {
    const shiftRows = (data.shifts || []).map((s) => ({
      key: 's_' + s.id, date: s.workDate, staffId: s.staffId, person: s.staffName || '—', role: 'Nurse',
      location: s.locationName || s.locationCode || '—', start: s.startAt, end: s.endAt,
      workedMin: s.workedMinutes || 0, status: s.status === 'active' ? 'On shift' : 'Closed', note: '',
    }))
    const dutyRows = (data.duties || []).map((d) => ({
      key: 'd_' + d.id, date: d.workDate, staffId: d.staffId, person: d.staffName || '—', role: 'Doctor',
      location: d.locationName || d.locationCode || '—', start: null, end: null,
      workedMin: 0, status: 'On duty', note: d.note || '',
    }))
    return [...shiftRows, ...dutyRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data])

  const people = useMemo(() => {
    const m = new Map()
    for (const r of rows) if (r.staffId) m.set(r.staffId, r.person)
    return [...m.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }, [rows])

  const shown = useMemo(() => (person === 'all' ? rows : rows.filter((r) => r.staffId === person)), [rows, person])

  const summary = useMemo(() => {
    const nurseRows = shown.filter((r) => r.role === 'Nurse')
    const totalMin = nurseRows.reduce((a, r) => a + (r.workedMin || 0), 0)
    const dayKeys = new Set(shown.map((r) => r.date + '|' + r.staffId))
    return { records: shown.length, days: dayKeys.size, nurseShifts: nurseRows.length, dutyDays: shown.length - nurseRows.length, totalMin }
  }, [shown])

  function exportCsv() {
    const head = ['Date', 'Person', 'Role', 'Location', 'Start', 'End', 'Worked (hours)', 'Status / Note']
    const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
    const lines = shown.map((r) => [
      r.date, r.person, r.role, r.location, fmtTime(r.start), fmtTime(r.end),
      r.role === 'Nurse' ? (r.workedMin / 60).toFixed(2) : '', r.role === 'Nurse' ? r.status : r.note,
    ].map(esc).join(','))
    // Leading BOM so Excel opens it as UTF-8 (Arabic names render correctly).
    const csv = '﻿' + [head.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const who = person === 'all' ? 'all' : String(people.find((p) => p.id === person)?.name || 'person').replace(/\s+/g, '_')
    const a = document.createElement('a')
    a.href = url; a.download = `attendance_${who}_${from}_to_${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    const who = person === 'all' ? 'All people' : (people.find((p) => p.id === person)?.name || '')
    const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
    const body = shown.map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.person)}</td><td>${esc(r.role)}</td><td>${esc(r.location)}</td><td>${esc(fmtTime(r.start))}</td><td>${esc(r.end ? fmtTime(r.end) : (r.role === 'Nurse' ? '—' : ''))}</td><td>${r.role === 'Nurse' ? esc(hoursLabel(r.workedMin)) : '—'}</td><td>${esc(r.role === 'Nurse' ? r.status : (r.note || 'On duty'))}</td></tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Attendance Report</title><style>
      *{font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:24px;color:#0A1B3D} h1{font-size:18px;margin:0 0 2px} .sub{color:#555;font-size:12px;margin:0 0 12px}
      .meta{font-size:12px;margin:0 0 14px;display:flex;gap:18px;flex-wrap:wrap}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #cdd6e6;padding:5px 8px;text-align:left} tr:nth-child(even) td{background:#f7f9fc}
      th{background:#eef2f8;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
      .gen{margin-top:12px;font-size:11px;color:#777}
      @media print{body{margin:8px}}</style></head><body>
      <h1>HMC / SMC — Attendance Report</h1>
      <p class="sub"><strong>${esc(who)}</strong> &nbsp;·&nbsp; ${esc(from)} → ${esc(to)}</p>
      <div class="meta"><span><strong>${summary.records}</strong> records</span><span><strong>${summary.days}</strong> person-days</span>${summary.nurseShifts ? `<span><strong>${hoursLabel(summary.totalMin)}</strong> nurse hours (${summary.nurseShifts} shifts)</span>` : ''}${summary.dutyDays ? `<span><strong>${summary.dutyDays}</strong> doctor on-duty days</span>` : ''}</div>
      <table><thead><tr><th>Date</th><th>Person</th><th>Role</th><th>Location</th><th>Start</th><th>End</th><th>Worked</th><th>Status / Note</th></tr></thead><tbody>${body}</tbody></table>
      <p class="gen">Generated ${esc(new Date().toLocaleString('en-GB'))}</p>
      <scr` + `ipt>window.onload=function(){window.focus();window.print()}</scr` + `ipt></body></html>`
    const w = window.open('', '_blank')
    if (!w) { setErr('Allow pop-ups to print the report.'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  return (
    <section className="p-card p-5 mt-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] inline-flex items-center gap-1.5" style={{ color: 'var(--p-teal)' }}>
            <CalendarRange className="w-3.5 h-3.5" /> Attendance Report
          </div>
          <h3 className="text-lg font-bold mt-0.5" style={{ color: 'var(--p-ink-900)' }}>By person &amp; period · Export</h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--p-ink-500)' }}>
            Pick a date range and (optionally) one person, then export to Excel (CSV).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={printReport} disabled={!shown.length}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold p-btn-ghost"
            style={{ opacity: shown.length ? 1 : 0.45, cursor: shown.length ? 'pointer' : 'not-allowed' }}>
            <Printer className="w-4 h-4" /> Print
          </button>
          <button type="button" onClick={exportCsv} disabled={!shown.length}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-bold p-btn-primary"
            style={{ opacity: shown.length ? 1 : 0.45, cursor: shown.length ? 'pointer' : 'not-allowed' }}>
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>From</label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="p-input h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ color: 'var(--p-ink-500)' }}>To</label>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="p-input h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.12em] font-bold inline-flex items-center gap-1" style={{ color: 'var(--p-ink-500)' }}>
            <Users className="w-3 h-3" /> Person
          </label>
          <select value={person} onChange={(e) => setPerson(e.target.value)} className="p-input h-10">
            <option value="all">All people ({people.length})</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap text-[12px]">
        <Chip><Clock className="w-3 h-3" /> {summary.records} record(s)</Chip>
        <Chip>{summary.days} person-day(s)</Chip>
        {summary.nurseShifts > 0 && <Chip>{summary.nurseShifts} nurse shift(s) · {hoursLabel(summary.totalMin)} worked</Chip>}
        {summary.dutyDays > 0 && <Chip>{summary.dutyDays} doctor on-duty day(s)</Chip>}
      </div>

      {err && (
        <div className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]" style={{ background: 'var(--p-mixed-soft)', color: '#B14242', border: '1px solid #F0B5B5' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{err}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--p-border)' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'var(--p-surface-tint)', borderBottom: '1px solid var(--p-border)' }}>
              {['Date', 'Person', 'Role', 'Location', 'Start', 'End', 'Worked', 'Status / Note'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold uppercase tracking-[0.08em] text-[10px]" style={{ color: 'var(--p-ink-500)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--p-ink-400)' }}>No attendance in this range.</td></tr>
            ) : shown.map((r, i) => (
              <tr key={r.key} style={{ borderTop: i ? '1px solid var(--p-border)' : 'none' }}>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{r.date}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-semibold" style={{ color: 'var(--p-ink-900)' }}>{r.person}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-600)' }}>{r.role}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{r.location}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{fmtTime(r.start)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--p-ink-700)' }}>{r.end ? fmtTime(r.end) : (r.role === 'Nurse' ? '—' : '')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-bold p-numeric" style={{ color: 'var(--p-ink-900)' }}>{r.role === 'Nurse' ? hoursLabel(r.workedMin) : '—'}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--p-ink-600)' }}>{r.role === 'Nurse' ? r.status : (r.note || 'On duty')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full font-bold"
      style={{ background: 'var(--p-surface-tint)', color: 'var(--p-ink-700)', border: '1px solid var(--p-border)' }}>
      {children}
    </span>
  )
}
