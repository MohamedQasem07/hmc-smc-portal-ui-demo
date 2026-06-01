import { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback } from 'react'
import {
  R1_CASES, R1_ROOM_BOARD, R1_NURSE_SHIFTS, R1_DOCTOR_ON_DUTY,
  R1_EXPENSE_ENTRIES, R1_HANDOVERS, R1_CASH_TREASURY, R1_VISA_BANK,
  R1_TODAY,
} from '../data/p2cR1'
import { SEED_STAFF, SEED_USERS, nextStaffCode } from '../data/staffUsers'
import { generateOurRef } from '../lib/ourRef'
import { IS_SUPABASE } from '../lib/api/config'
import { useUserMode } from './UserModeContext'
import { fetchCases, insertCase, upsertBillingPrep, receiveTransfer as sbReceiveTransfer, classifyReceivedCase } from '../lib/api/portalData'
import { escalateIfAuthError } from '../lib/api/auth'

/* =========================================================================
 * DemoStateContext (P2C.R2)
 * -----------------------------------------------------------------------
 * Pure in-memory runtime state that seeds from R1 mocks and lets the user
 * test workflows interactively in the local preview:
 *
 *   - Register new cases that appear in My Cases / Transfers / Room Board.
 *   - Close visits, add/close sessions, admit/discharge inpatients.
 *   - Receive transfers and assign Center Rooms (rooms become Occupied;
 *     discharging releases them).
 *   - Record expenses against same-currency physical cash; treasury balances
 *     update; handover Net Book / Actual Delivered / Difference behave like
 *     a real reconciliation (Match / Over / Shortage).
 *   - Start/end nurse shifts and pick Doctor on Duty.
 *
 * PERSISTENCE (P3-prep): a whitelist of plain-data slices (cases, users,
 * staff, rooms, expenses, handovers, insurers, ...) is saved to localStorage
 * and restored on load, so entries survive a browser refresh. Browser-local
 * ONLY — no backend, no server call, no PHI leaves the machine. Getter-bearing
 * seeds (seedTreasury/seedVisaBank) are rebuilt fresh from emptyState() on
 * load. RESET_DEMO / RESET_EMPTY clear back to an empty state.
 * ========================================================================= */

const DemoStateContext = createContext(null)

// ----------------------------------------------------------------------
// Initial state
// ----------------------------------------------------------------------
/** R3.1 — Empty operational state (no cases, no demo collections). */
function emptyState() {
  // Zero treasury for every clinic/branch
  const zeroBalances = () => ({
    EGP: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    EUR: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    USD: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
    GBP: { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0, get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver } },
  })
  const seedTreasury = {}
  for (const loc of ['tropitel', 'romance', 'sahl_hasheesh', 'mamsha', 'pharaoh', 'menamark', 'al_kawther', 'sheraton']) {
    seedTreasury[loc] = zeroBalances()
  }
  const seedVisaBank = {}
  for (const loc of Object.keys(seedTreasury)) {
    seedVisaBank[loc] = { totalMovements: 0, movementsCount: 0, confirmedInHandover: 0, get pending() { return this.totalMovements - this.confirmedInHandover } }
  }
  return {
    cases: [],
    roomBoard: {
      al_kawther: Array.from({ length: 15 }, (_, i) => ({ branchId: 'al_kawther', number: i + 1, label: `Room ${String(i + 1).padStart(2, '0')}`, caseId: null, occupant: null, status: 'available' })),
      sheraton:   Array.from({ length: 15 }, (_, i) => ({ branchId: 'sheraton',   number: i + 1, label: `Room ${String(i + 1).padStart(2, '0')}`, caseId: null, occupant: null, status: 'available' })),
    },
    nurseShifts:  [],
    doctorOnDuty: {},
    expenses:     [],
    handovers:    [],
    seedTreasury,
    seedVisaBank,
    pendingExpenses: [],
    runtimeFeedback: null,
    confirmedVisaLineIds: {},
    // R3.1 — Insurer runtime catalogue. Pre-seeded with a small set of common
    // demo insurers; users can add new ones during intake and they persist
    // for the rest of the demo session.
    insurers: [
      { id: 'ins_demo_allianz',   name: 'Demo Allianz Worldwide Care', email: 'claims@demo-allianz.example',   phone: '+49 89 1234567' },
      { id: 'ins_demo_axa',       name: 'Demo AXA Assistance',         email: 'claims@demo-axa.example',       phone: '+33 1 2345 6789' },
      { id: 'ins_demo_roland',    name: 'Demo Roland Assistance',      email: 'roland@demo-roland.example',    phone: '+49 30 1234567' },
      { id: 'ins_demo_europcare', name: 'Demo Europ Care',             email: 'claims@demo-europcare.example', phone: '+33 4 1234567' },
      { id: 'ins_demo_globalmed', name: 'Demo GlobalMed Assist',       email: 'ops@demo-globalmed.example',    phone: '+44 20 12345678' },
    ],
    // R3.1 — Egyptian / Local assistance catalogue (Admin-only field)
    localAssistance: [
      { id: 'la_demo_egycare',    name: 'Demo EgyCare Assistance Ltd' },
      { id: 'la_demo_pharaoh',    name: 'Demo Pharaoh Assist' },
      { id: 'la_demo_redseaaid',  name: 'Demo Red Sea Aid' },
    ],
    // R3.1 — UAT mode flag: 'empty' (default) or 'uat-loaded'
    uatMode: 'empty',
    // P2C.R4 — Staff Directory + Portal Users (seeded; mutated by Admin Users & Staff)
    staff: SEED_STAFF.map((s) => ({ ...s })),
    users: SEED_USERS.map((u) => ({ ...u })),
  }
}

/** Legacy R1-seeded state — preserved for reference. R3.1 default = empty. */
function legacyR1State() {
  return {
    cases: R1_CASES.map((c) => ({
      ...c,
      paymentLines: [...(c.paymentLines || [])],
      excessLines:  [...(c.excessLines  || [])],
      sessions:     [...(c.sessions     || [])],
      visit:        c.visit ? { ...c.visit } : null,
      admission:    c.admission ? { ...c.admission } : null,
      transfer:     c.transfer ? { ...c.transfer } : null,
    })),
    roomBoard: {
      al_kawther: R1_ROOM_BOARD.al_kawther.map((r) => ({ ...r })),
      sheraton:   R1_ROOM_BOARD.sheraton.map((r) => ({ ...r })),
    },
    nurseShifts:  R1_NURSE_SHIFTS.map((s) => ({ ...s })),
    doctorOnDuty: { ...R1_DOCTOR_ON_DUTY },
    expenses:     R1_EXPENSE_ENTRIES.map((e) => ({ ...e })),
    handovers:    R1_HANDOVERS.map((h) => ({
      ...h,
      rows: h.rows.map((r) => ({
        ...r,
        actualDelivered: h.status === 'Closed' ? r.actualDelivered : null,
        difference: h.status === 'Closed' ? r.difference : null,
      })),
    })),
    seedTreasury: R1_CASH_TREASURY,
    seedVisaBank: R1_VISA_BANK,
    pendingExpenses: [],
    runtimeFeedback: null,
    confirmedVisaLineIds: {},
    insurers: [
      { id: 'ins_demo_allianz',   name: 'Demo Allianz Worldwide Care', email: 'claims@demo-allianz.example',   phone: '+49 89 1234567' },
      { id: 'ins_demo_axa',       name: 'Demo AXA Assistance',         email: 'claims@demo-axa.example',       phone: '+33 1 2345 6789' },
    ],
    localAssistance: [
      { id: 'la_demo_egycare', name: 'Demo EgyCare Assistance Ltd' },
    ],
    uatMode: 'legacy',
    staff: SEED_STAFF.map((s) => ({ ...s })),
    users: SEED_USERS.map((u) => ({ ...u })),
  }
}

/** R3.1 default — empty operational state. */
function initialState() {
  return emptyState()
}

// ----------------------------------------------------------------------
// P3-prep — local persistence (survives browser refresh; browser-local
// ONLY — no backend, no PHI leaves the machine). We persist a whitelist of
// plain-data slices. The getter-bearing seeds (seedTreasury / seedVisaBank)
// are deliberately NOT persisted — they are always rebuilt fresh from
// emptyState() so their computed `net` getters are never lost to JSON
// serialization. Treasury is derived from cases at render time anyway.
// ----------------------------------------------------------------------
const PERSIST_KEY = 'aegis_portal_state_v1'
const PERSIST_KEYS = [
  'cases', 'roomBoard', 'nurseShifts', 'doctorOnDuty', 'expenses', 'handovers',
  'pendingExpenses', 'confirmedVisaLineIds', 'insurers', 'localAssistance',
  'uatMode', 'staff', 'users',
]

function readPersisted() {
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}

/** Provider init: merge any persisted slices over a fresh emptyState(). */
function loadInitialState() {
  if (IS_SUPABASE) return emptyState()   // supabase mode: the server is the source of truth
  const base = emptyState()
  const saved = readPersisted()
  if (!saved) return base
  const merged = { ...base }
  for (const k of PERSIST_KEYS) {
    if (saved[k] !== undefined) merged[k] = saved[k]
  }
  return merged
}

function persistState(state) {
  try {
    const out = {}
    for (const k of PERSIST_KEYS) out[k] = state[k]
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(out))
  } catch { /* ignore quota / serialization errors */ }
}

// ----------------------------------------------------------------------
// Reducer
// ----------------------------------------------------------------------
function reducer(state, action) {
  switch (action.type) {

    // -------- Case lifecycle --------
    case 'CASE_ADD': {
      return { ...state, cases: [action.payload, ...state.cases] }
    }

    case 'CASES_SET': {
      return { ...state, cases: action.cases || [] }
    }

    case 'VISIT_CLOSE': {
      const now = new Date().toISOString()
      return {
        ...state,
        cases: state.cases.map((c) => c.id === action.caseId
          ? { ...c, visit: { ...(c.visit || {}), checkOutAt: now, status: 'completed' }, operationalStatus: 'Closed' }
          : c),
      }
    }

    case 'SESSION_ADD': {
      const now = new Date().toISOString()
      const sess = {
        id: `ses_${Date.now()}`,
        date: now,
        checkInAt: now,
        checkOutAt: null,
        status: 'active',
        note: action.note || '',
      }
      return {
        ...state,
        cases: state.cases.map((c) => c.id === action.caseId
          ? { ...c, sessions: [...(c.sessions || []), sess], operationalStatus: 'Open' }
          : c),
      }
    }

    case 'SESSION_CLOSE': {
      const now = new Date().toISOString()
      return {
        ...state,
        cases: state.cases.map((c) => {
          if (c.id !== action.caseId) return c
          return {
            ...c,
            sessions: c.sessions.map((s) => s.id === action.sessionId
              ? { ...s, checkOutAt: now, status: 'completed' }
              : s),
          }
        }),
      }
    }

    case 'ADMIT': {
      const now = new Date().toISOString()
      return {
        ...state,
        cases: state.cases.map((c) => c.id === action.caseId
          ? { ...c, admission: { admittedAt: now, dischargedAt: null, status: 'admitted' }, encounterPattern: 'inpatient_admission', operationalStatus: 'Open' }
          : c),
      }
    }

    case 'DISCHARGE': {
      const now = new Date().toISOString()
      let newRoomBoard = state.roomBoard
      const target = state.cases.find((c) => c.id === action.caseId)
      if (target?.centerRoomNumber) {
        const branchId = target.registeredAtKind === 'branch'
          ? target.registeredAtId
          : target.transfer?.toBranchId
        if (branchId && newRoomBoard[branchId]) {
          newRoomBoard = {
            ...newRoomBoard,
            [branchId]: newRoomBoard[branchId].map((r) =>
              r.number === target.centerRoomNumber
                ? { ...r, status: 'available', caseId: null }
                : r),
          }
        }
      }
      return {
        ...state,
        roomBoard: newRoomBoard,
        cases: state.cases.map((c) => c.id === action.caseId
          ? { ...c,
              admission: { ...(c.admission || { admittedAt: c.visit?.checkInAt || c.visitDate }), dischargedAt: now, status: 'discharged' },
              operationalStatus: 'Closed',
              centerRoomNumber: null,
            }
          : c),
      }
    }

    // -------- Transfer + room assignment --------
    case 'TRANSFER_RECEIVE': {
      const now = new Date().toISOString()
      return {
        ...state,
        cases: state.cases.map((c) => c.id === action.caseId && c.transfer
          ? { ...c, transfer: { ...c.transfer, receivedAt: now, status: 'Received' } }
          : c),
      }
    }

    case 'ROOM_ASSIGN': {
      const { caseId, roomNumber, branchId } = action
      const board = state.roomBoard[branchId] || []
      const target = state.cases.find((c) => c.id === caseId)
      if (!target) return { ...state, runtimeFeedback: { tone: 'reject', message: 'Case not found.' } }
      // Validation: room already occupied by someone else?
      const occByOther = board.some((r) => r.number === roomNumber && r.status === 'occupied' && r.caseId !== caseId)
      if (occByOther) {
        return { ...state, runtimeFeedback: { tone: 'reject', message: `Room ${String(roomNumber).padStart(2, '0')} is already occupied by another patient. Pick an Available room.` } }
      }
      // Free the patient's previous room (if reassigning)
      const prevRoom = target.centerRoomNumber
      let newBoard = board.map((r) => {
        if (r.number === prevRoom && r.caseId === caseId) return { ...r, status: 'available', caseId: null }
        if (r.number === roomNumber) return { ...r, status: 'occupied', caseId }
        return r
      })
      return {
        ...state,
        roomBoard: { ...state.roomBoard, [branchId]: newBoard },
        cases: state.cases.map((c) => c.id === caseId ? { ...c, centerRoomNumber: roomNumber } : c),
        runtimeFeedback: { tone: 'ok', message: `Room ${String(roomNumber).padStart(2, '0')} assigned.` },
      }
    }

    case 'CASE_UPDATE': {
      return {
        ...state,
        cases: state.cases.map((c) => c.id === action.caseId ? { ...c, ...action.patch } : c),
      }
    }

    // -------- Treasury / expenses --------
    case 'EXPENSE_ADD': {
      return {
        ...state,
        expenses: [{ ...action.payload, id: `ex_${Date.now()}` }, ...state.expenses],
        pendingExpenses: [...state.pendingExpenses, action.payload],
      }
    }

    case 'HANDOVER_SET_DELIVERED': {
      const { handoverId, rowIndex, value } = action
      return {
        ...state,
        handovers: state.handovers.map((h) => {
          if (h.id !== handoverId) return h
          return {
            ...h,
            rows: h.rows.map((r, i) => {
              if (i !== rowIndex) return r
              const num = value === '' || value === null ? null : Number(value)
              return {
                ...r,
                actualDelivered: num,
                difference: num === null ? null : Number((num - r.netBook).toFixed(2)),
              }
            }),
          }
        }),
      }
    }

    case 'HANDOVER_CLOSE': {
      return {
        ...state,
        handovers: state.handovers.map((h) => h.id === action.handoverId
          ? { ...h, status: 'Closed', periodTo: h.periodTo || new Date().toISOString() }
          : h),
      }
    }

    // -------- Visa/Bank transaction-by-transaction handover (P2C.R3) --------
    case 'VISA_TX_CONFIRM': {
      // ids: array of paymentLine/excessLine ids that were just confirmed
      // as handed over to the supervisor / bank.
      const ids = Array.isArray(action.ids) ? action.ids : [action.id].filter(Boolean)
      if (ids.length === 0) return state
      const next = { ...state.confirmedVisaLineIds }
      for (const id of ids) next[id] = true
      return { ...state, confirmedVisaLineIds: next }
    }

    case 'VISA_TX_UNCONFIRM': {
      const ids = Array.isArray(action.ids) ? action.ids : [action.id].filter(Boolean)
      if (ids.length === 0) return state
      const next = { ...state.confirmedVisaLineIds }
      for (const id of ids) delete next[id]
      return { ...state, confirmedVisaLineIds: next }
    }

    // -------- Attendance --------
    case 'NURSE_SHIFT_START': {
      const sh = {
        id: `sh_${Date.now()}`,
        clinicId: action.clinicId,
        nurseId: action.nurseId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        status: 'active',
      }
      return { ...state, nurseShifts: [...state.nurseShifts, sh] }
    }

    case 'NURSE_SHIFT_END': {
      return {
        ...state,
        nurseShifts: state.nurseShifts.map((s) => s.id === action.shiftId
          ? { ...s, endedAt: new Date().toISOString(), status: 'closed' }
          : s),
      }
    }

    case 'DOCTOR_ON_DUTY_SET': {
      return {
        ...state,
        doctorOnDuty: { ...state.doctorOnDuty, [action.clinicId]: { date: R1_TODAY, doctorId: action.doctorId } },
      }
    }

    case 'CLEAR_FEEDBACK': {
      return { ...state, runtimeFeedback: null }
    }

    case 'RESET_DEMO': {
      return initialState()
    }

    // -------- R3.1 — UAT dataset loaders --------
    case 'LOAD_UAT_STATE': {
      // action.payload is a full state object built by buildUatState()
      return { ...action.payload, uatMode: 'uat-loaded' }
    }

    case 'RESET_EMPTY': {
      return emptyState()
    }

    // -------- R3.1 — Insurer catalogue --------
    case 'INSURER_ADD': {
      const { name, email = '', phone = '' } = action.payload
      if (!name?.trim()) return state
      // Don't duplicate by case-insensitive name match
      const exists = state.insurers.find((i) => i.name.trim().toLowerCase() === name.trim().toLowerCase())
      if (exists) return state
      const next = { id: `ins_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), email, phone }
      return { ...state, insurers: [...state.insurers, next] }
    }

    // -------- P2C.R4 — Staff Directory CRUD --------
    case 'STAFF_ADD': {
      const { fullName, role, assignedClinicId, status, phone, note, staffCode } = action.payload
      const id = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const code = staffCode || nextStaffCode(state.staff, role, assignedClinicId)
      return {
        ...state,
        staff: [...state.staff, {
          staffId: id,
          staffCode: code,
          fullName: (fullName || '').trim(),
          role: role || 'Other',
          assignedClinicId: assignedClinicId || null,
          status: status || 'Active',
          hasPortalUser: false,
          phone: phone || '',
          note: note || '',
        }],
      }
    }

    case 'STAFF_UPDATE': {
      const { staffId, patch } = action
      return {
        ...state,
        staff: state.staff.map((s) => s.staffId === staffId ? { ...s, ...patch } : s),
      }
    }

    case 'STAFF_SET_STATUS': {
      const { staffId, status } = action
      return {
        ...state,
        staff: state.staff.map((s) => s.staffId === staffId ? { ...s, status } : s),
      }
    }

    case 'STAFF_ASSIGN_CLINIC': {
      const { staffId, clinicId } = action
      return {
        ...state,
        staff: state.staff.map((s) => s.staffId === staffId ? { ...s, assignedClinicId: clinicId } : s),
      }
    }

    // -------- P2C.R4 — Portal Users CRUD --------
    case 'USER_ADD': {
      const { username, displayName, role, assignedClinicId, linkedStaffId, status, demoPassword } = action.payload
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      // Don't allow duplicate username
      const exists = state.users.find((u) => u.username.trim().toLowerCase() === (username || '').trim().toLowerCase())
      if (exists) {
        return { ...state, runtimeFeedback: { tone: 'reject', message: `Username "${username}" already exists.` } }
      }
      const nextUser = {
        userId: id,
        username: (username || '').trim(),
        displayName: (displayName || username || '').trim(),
        role: role || 'clinic_nurse',
        assignedClinicId: role === 'admin' ? null : (assignedClinicId || null),
        linkedStaffId: linkedStaffId || null,
        status: status || 'Active',
        demoPassword: demoPassword || 'demo1234',
        lastLoginAt: null,
      }
      // Mark the linked staff as having a portal user
      const staff = linkedStaffId
        ? state.staff.map((s) => s.staffId === linkedStaffId ? { ...s, hasPortalUser: true } : s)
        : state.staff
      return { ...state, users: [...state.users, nextUser], staff }
    }

    case 'USER_UPDATE': {
      const { userId, patch } = action
      // If linked staff changed, propagate hasPortalUser flag
      const prev = state.users.find((u) => u.userId === userId)
      const merged = prev ? { ...prev, ...patch } : null
      let staff = state.staff
      if (merged && prev && (prev.linkedStaffId !== merged.linkedStaffId)) {
        staff = state.staff.map((s) => {
          if (s.staffId === prev.linkedStaffId) {
            // Did anyone else still link to this staff?
            const stillLinked = state.users.some((u) => u.userId !== userId && u.linkedStaffId === prev.linkedStaffId)
            return stillLinked ? s : { ...s, hasPortalUser: false }
          }
          if (s.staffId === merged.linkedStaffId) return { ...s, hasPortalUser: true }
          return s
        })
      }
      return {
        ...state,
        users: state.users.map((u) => u.userId === userId ? { ...u, ...patch } : u),
        staff,
      }
    }

    case 'USER_SET_STATUS': {
      const { userId, status } = action
      return { ...state, users: state.users.map((u) => u.userId === userId ? { ...u, status } : u) }
    }

    case 'USER_RESET_PASSWORD': {
      const { userId, newDemoPassword } = action
      return {
        ...state,
        users: state.users.map((u) => u.userId === userId ? { ...u, demoPassword: newDemoPassword || 'demo1234' } : u),
        runtimeFeedback: { tone: 'ok', message: 'Demo password reset locally. Real password reset will require backend phase.' },
      }
    }

    case 'USER_TOUCH_LOGIN': {
      const { userId } = action
      const at = new Date().toISOString()
      return { ...state, users: state.users.map((u) => u.userId === userId ? { ...u, lastLoginAt: at } : u) }
    }

    // -------- R3.1 — Admin insurance completion --------
    case 'INSURANCE_COMPLETE': {
      // action.payload = { caseId, fields: { invoiceCurrency, serviceChargePct, localAssistanceId, localAssistanceRef, billingPrepStatus, adminNotes } }
      const { caseId, fields } = action.payload
      return {
        ...state,
        cases: state.cases.map((c) => c.id === caseId ? {
          ...c,
          insuranceCompletion: { ...(c.insuranceCompletion || {}), ...fields, completedAt: new Date().toISOString() },
        } : c),
      }
    }

    default:
      return state
  }
}

// ----------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------
export function DemoStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState)
  const { currentUser } = useUserMode()

  // Persist whitelisted slices (mock mode only; supabase mode is server-backed).
  useEffect(() => { if (!IS_SUPABASE) persistState(state) }, [state])

  // Supabase-backed cases — (re)load (RLS-scoped) whenever the signed-in user changes.
  const refetchCases = useCallback(async () => {
    if (!IS_SUPABASE) return
    try { dispatch({ type: 'CASES_SET', cases: await fetchCases() }) }
    // P3J — a dead session makes RLS-scoped reads return empty; escalate to a
    // clean re-login instead of silently showing an empty / stale case list.
    catch (e) { console.error('[portal] fetchCases failed', e); await escalateIfAuthError(e) }
  }, [])
  useEffect(() => {
    if (!IS_SUPABASE) return
    if (currentUser) refetchCases()
    else dispatch({ type: 'CASES_SET', cases: [] })
  }, [currentUser, refetchCases])

  // Action creators (addCase / completeInsurance hit Supabase in supabase mode).
  const actions = useMemo(() => ({
    addCase: IS_SUPABASE
      ? async (caseObj) => { const id = await insertCase(caseObj); await refetchCases(); return id }
      : (caseObj) => { dispatch({ type: 'CASE_ADD', payload: caseObj }); return caseObj.id },
    closeVisit:           (caseId) => dispatch({ type: 'VISIT_CLOSE', caseId }),
    addSession:           (caseId, note = '') => dispatch({ type: 'SESSION_ADD', caseId, note }),
    closeSession:         (caseId, sessionId) => dispatch({ type: 'SESSION_CLOSE', caseId, sessionId }),
    admit:                (caseId) => dispatch({ type: 'ADMIT', caseId }),
    discharge:            (caseId) => dispatch({ type: 'DISCHARGE', caseId }),
    receiveTransfer: IS_SUPABASE
      ? async (caseId) => { await sbReceiveTransfer(caseId); await refetchCases() }
      : (caseId) => dispatch({ type: 'TRANSFER_RECEIVE', caseId }),
    // Phase 4: branch classification of a received case (+ real collections). Supabase
    // only; the mock receive page uses updateCase/assignRoom directly.
    classifyReceived: IS_SUPABASE
      ? async (caseId, patch) => { await classifyReceivedCase(caseId, patch); await refetchCases() }
      : (caseId, patch) => dispatch({ type: 'CASE_UPDATE', caseId, patch }),
    refreshCases:         refetchCases,
    assignRoom:           (caseId, roomNumber, branchId) => dispatch({ type: 'ROOM_ASSIGN', caseId, roomNumber, branchId }),
    updateCase:           (caseId, patch) => dispatch({ type: 'CASE_UPDATE', caseId, patch }),
    addExpense:           (payload) => dispatch({ type: 'EXPENSE_ADD', payload }),
    setHandoverDelivered: (handoverId, rowIndex, value) => dispatch({ type: 'HANDOVER_SET_DELIVERED', handoverId, rowIndex, value }),
    closeHandover:        (handoverId) => dispatch({ type: 'HANDOVER_CLOSE', handoverId }),
    confirmVisaTx:        (ids) => dispatch({ type: 'VISA_TX_CONFIRM', ids: Array.isArray(ids) ? ids : [ids] }),
    unconfirmVisaTx:      (ids) => dispatch({ type: 'VISA_TX_UNCONFIRM', ids: Array.isArray(ids) ? ids : [ids] }),
    // R3.1 — UAT + insurance flow
    loadUatState:         (payload) => dispatch({ type: 'LOAD_UAT_STATE', payload }),
    resetEmpty:           () => dispatch({ type: 'RESET_EMPTY' }),
    addInsurer:           (payload) => dispatch({ type: 'INSURER_ADD', payload }),
    completeInsurance: IS_SUPABASE
      ? async (payload) => { await upsertBillingPrep(payload.caseId, payload.fields); await refetchCases() }
      : (payload) => dispatch({ type: 'INSURANCE_COMPLETE', payload }),
    startNurseShift:      (clinicId, nurseId) => dispatch({ type: 'NURSE_SHIFT_START', clinicId, nurseId }),
    endNurseShift:        (shiftId) => dispatch({ type: 'NURSE_SHIFT_END', shiftId }),
    setDoctorOnDuty:      (clinicId, doctorId) => dispatch({ type: 'DOCTOR_ON_DUTY_SET', clinicId, doctorId }),
    clearFeedback:        () => dispatch({ type: 'CLEAR_FEEDBACK' }),
    reset:                () => dispatch({ type: 'RESET_DEMO' }),
    // P2C.R4 — Staff / Users management
    addStaff:             (payload) => dispatch({ type: 'STAFF_ADD', payload }),
    updateStaff:          (staffId, patch) => dispatch({ type: 'STAFF_UPDATE', staffId, patch }),
    setStaffStatus:       (staffId, status) => dispatch({ type: 'STAFF_SET_STATUS', staffId, status }),
    assignStaffClinic:    (staffId, clinicId) => dispatch({ type: 'STAFF_ASSIGN_CLINIC', staffId, clinicId }),
    addUser:              (payload) => dispatch({ type: 'USER_ADD', payload }),
    updateUser:           (userId, patch) => dispatch({ type: 'USER_UPDATE', userId, patch }),
    setUserStatus:        (userId, status) => dispatch({ type: 'USER_SET_STATUS', userId, status }),
    resetUserPassword:    (userId, newDemoPassword) => dispatch({ type: 'USER_RESET_PASSWORD', userId, newDemoPassword }),
    touchUserLogin:       (userId) => dispatch({ type: 'USER_TOUCH_LOGIN', userId }),
  }), [refetchCases])

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>
}

// ----------------------------------------------------------------------
// Hooks + selectors
// ----------------------------------------------------------------------
export function useDemoState() {
  const ctx = useContext(DemoStateContext)
  if (!ctx) throw new Error('useDemoState must be used inside DemoStateProvider')
  return ctx
}

export function useCases() { return useDemoState().state.cases }

export function useCasesForClinic(clinicId) {
  const cases = useCases()
  return useMemo(() => cases.filter((c) => c.registeredAtId === clinicId), [cases, clinicId])
}

export function useCasesForBranch(branchId) {
  const cases = useCases()
  return useMemo(() => cases.filter((c) =>
    c.registeredAtId === branchId ||
    (c.transfer && c.transfer.toBranchId === branchId),
  ), [cases, branchId])
}

export function useIncomingTransfers(branchId, { includeReceived = true } = {}) {
  const cases = useCases()
  return useMemo(() => cases.filter((c) => {
    if (!c.transfer || c.transfer.toBranchId !== branchId) return false
    if (!includeReceived && c.transfer.receivedAt) return false
    return true
  }), [cases, branchId, includeReceived])
}

export function useRoomBoard(branchId) {
  const { state } = useDemoState()
  return state.roomBoard[branchId] || []
}

export function useFindCase(caseId) {
  const cases = useCases()
  return useMemo(() => cases.find((c) => c.id === caseId) || null, [cases, caseId])
}

export function useCaseAggregates(branchId) {
  const cases = useCasesForBranch(branchId)
  const board = useRoomBoard(branchId)
  return useMemo(() => {
    const occupied = board.filter((r) => r.status === 'occupied').length
    const available = 15 - occupied
    const waiting = cases.filter((c) =>
      (c.transfer && c.transfer.toBranchId === branchId && c.transfer.receivedAt && !c.centerRoomNumber && c.operationalStatus === 'Open') ||
      (c.registeredAtId === branchId && !c.centerRoomNumber && c.operationalStatus === 'Open'),
    ).length
    const conservative = cases.filter((c) => c.treatmentMode === 'conservative').length
    const surgical = cases.filter((c) => c.treatmentMode === 'surgical').length
    const pendingMode = cases.filter((c) => c.treatmentMode === 'pending').length
    const insurance = cases.filter((c) => c.financialType === 'Insurance').length
    const cash = cases.filter((c) => c.financialType === 'Cash').length
    const pendingFin = cases.filter((c) => c.financialType === 'Pending').length
    const free = cases.filter((c) => c.financialType === 'Free / Complimentary').length
    const hmc = cases.filter((c) => c.billingFacility === 'HMC').length
    const smc = cases.filter((c) => c.billingFacility === 'SMC').length
    const admittedNow = cases.filter((c) => c.encounterPattern === 'inpatient_admission' && c.admission && !c.admission.dischargedAt).length
    const dischargedToday = cases.filter((c) => c.encounterPattern === 'inpatient_admission' && c.admission?.dischargedAt?.slice(0, 10) === R1_TODAY).length
    return { total: 15, occupied, available, waiting, conservative, surgical, pendingMode, insurance, cash, pendingFin, free, hmc, smc, admittedNow, dischargedToday }
  }, [cases, board, branchId])
}

/** Aggregated treasury per location, blending R1 seed with runtime cases. */
export function useTreasuryFor(locationId) {
  const { state } = useDemoState()
  const cases = state.cases
  return useMemo(() => {
    const seed = state.seedTreasury[locationId]
    if (!seed) return null
    const out = {}
    for (const cur of ['EGP', 'EUR', 'USD', 'GBP']) {
      const seedRow = seed[cur] || { cashInvoiceCollections: 0, patientExcessCollections: 0, expenses: 0, handedOver: 0 }
      const row = {
        cashInvoiceCollections:   seedRow.cashInvoiceCollections,
        patientExcessCollections: seedRow.patientExcessCollections,
        expenses:                 seedRow.expenses,
        handedOver:               seedRow.handedOver,
        get net() { return this.cashInvoiceCollections + this.patientExcessCollections - this.expenses - this.handedOver },
      }
      out[cur] = row
    }
    // Add runtime contributions from cases registered at this location
    for (const c of cases) {
      if (c.registeredAtId !== locationId) continue
      for (const l of c.paymentLines || []) {
        if (l.method === 'Cash' && l.amount && out[l.currency]) {
          out[l.currency].cashInvoiceCollections += Number(l.amount)
        }
      }
      for (const l of c.excessLines || []) {
        if (l.method === 'Cash' && l.amount && out[l.currency]) {
          out[l.currency].patientExcessCollections += Number(l.amount)
        }
      }
    }
    // Add session-added expenses
    for (const e of state.pendingExpenses) {
      if (e.clinicId !== locationId) continue
      if (out[e.currency]) out[e.currency].expenses += Number(e.amount) || 0
    }
    return out
  }, [state, locationId])
}

export function useVisaBankFor(locationId) {
  const { state } = useDemoState()
  return useMemo(() => {
    const seed = state.seedVisaBank[locationId]
    if (!seed) return null
    // P2C.R3 — confirmed-in-handover now follows individual transaction
    // confirmations, plus the carry-forward seed amount that was confirmed
    // in prior shifts.
    let total = seed.totalMovements
    let count = seed.movementsCount
    let confirmed = seed.confirmedInHandover  // the prior carry-forward batch
    let confirmedCount = 0
    let pendingCount = Math.max(0, seed.movementsCount - 0)
    // Reset and recount cleanly using the runtime cases:
    total = 0
    count = 0
    for (const c of state.cases) {
      if (c.registeredAtId !== locationId) continue
      const lines = [
        ...(c.paymentLines || []).filter((l) => l.method === 'Visa / Card' && Number(l.amount) > 0),
        ...(c.excessLines  || []).filter((l) => l.method === 'Visa / Card' && Number(l.amount) > 0),
      ]
      for (const l of lines) {
        const amt = Number(l.amount) || 0
        total += amt
        count += 1
        if (state.confirmedVisaLineIds[l.id]) {
          confirmed += amt
          confirmedCount += 1
        } else {
          pendingCount += 1
        }
      }
    }
    // Add the legacy carry-forward batch back into the total so it shows
    // honestly as a movement that has already been confirmed previously.
    total += seed.confirmedInHandover
    if (seed.confirmedInHandover > 0) {
      count += 1
      confirmedCount += 1
    } else {
      pendingCount = pendingCount
    }
    return {
      totalMovements: total,
      movementsCount: count,
      confirmedInHandover: confirmed,
      pending: Math.max(0, total - confirmed),
      confirmedCount,
      pendingCount: Math.max(0, count - confirmedCount),
    }
  }, [state, locationId])
}

export function useExpensesFor(clinicId) {
  const { state } = useDemoState()
  return useMemo(() => state.expenses.filter((e) => e.clinicId === clinicId), [state, clinicId])
}

export function useHandoversFor(locationId) {
  const { state } = useDemoState()
  return useMemo(() => state.handovers.filter((h) => h.locationId === locationId), [state, locationId])
}

export function useActiveShifts(clinicId) {
  const { state } = useDemoState()
  return useMemo(() => state.nurseShifts.filter((s) => s.clinicId === clinicId && s.status === 'active'), [state, clinicId])
}

export function useClosedShiftsToday(clinicId) {
  const { state } = useDemoState()
  return useMemo(() => state.nurseShifts.filter((s) => s.clinicId === clinicId && s.status === 'closed' && s.startedAt.slice(0, 10) === R1_TODAY), [state, clinicId])
}

export function useDoctorOnDuty(clinicId) {
  const { state } = useDemoState()
  return state.doctorOnDuty[clinicId] || null
}

// ----------------------------------------------------------------------
// P2C.R3 / R3.1 — OUR Ref preview helpers
// ----------------------------------------------------------------------
/**
 * Lock-once preview of the next OUR Ref (R3.1).
 *
 * Mohamed's binding rule: OUR Ref is assigned ONCE at draft initialization
 * and remains immutable. Changing Financial Type / Billing Facility /
 * Insurance HMC↔SMC after that does NOT change the ref. Transfers do not
 * change it. Admin completion does not change it.
 *
 * This hook captures the ref ONCE at first render using the initial
 * `context` snapshot and the case list at that moment. Subsequent renders
 * return the same value.
 *
 * If you need a *live* preview that updates (legacy R3 behavior), use
 * `useLiveNextOurRef` instead.
 */
export function useNextOurRef(context) {
  const cases = useCases()
  // Capture-on-mount — never recompute. Use a useState lazy initializer.
  const [snapshot] = useState(() => {
    const refs = cases.map((c) => c.ourRef).filter(Boolean)
    return generateOurRef(refs, context || {})
  })
  return snapshot
}

/** R3.1 — Combined EGP view: physical cash net + Visa/Bank pending. Display only — never used for expenses or cash handover. */
export function useEgpCombinedFor(locationId) {
  const treasury = useTreasuryFor(locationId)
  const visa = useVisaBankFor(locationId)
  return useMemo(() => {
    if (!treasury) return null
    const cashNet = treasury.EGP?.net || 0
    const visaPending = visa?.pending || 0
    return {
      physicalCashAvailable: cashNet,
      visaBankPending: visaPending,
      totalEgpCollected: cashNet + visaPending,
    }
  }, [treasury, visa])
}

/** P2C.R4 — Staff Directory (full list). */
export function useStaff() { return useDemoState().state.staff }
/** P2C.R4 — Portal Users (full list). */
export function useUsers() { return useDemoState().state.users }

/** P2C.R4 — Active nurses assigned to a clinic/branch. */
export function useNursesForClinic(clinicId) {
  const staff = useStaff()
  return useMemo(() => staff.filter((s) =>
    s.role === 'Nurse' && s.status === 'Active' && s.assignedClinicId === clinicId,
  ), [staff, clinicId])
}

/** P2C.R4 — Active doctors assigned to a clinic/branch. */
export function useDoctorsForClinic(clinicId) {
  const staff = useStaff()
  return useMemo(() => staff.filter((s) =>
    s.role === 'Doctor' && s.status === 'Active' && s.assignedClinicId === clinicId,
  ), [staff, clinicId])
}

/** R3.1 — Insurer catalogue. */
export function useInsurers() { return useDemoState().state.insurers }
/** R3.1 — Local Egyptian assistance catalogue (Admin-only). */
export function useLocalAssistance() { return useDemoState().state.localAssistance }
/** R3.1 — UAT mode flag for showing the dataset toolbar. */
export function useUatMode() { return useDemoState().state.uatMode }

/** Legacy live-preview hook — recomputes on every context change. */
export function useLiveNextOurRef(context) {
  const cases = useCases()
  const ctxKey = JSON.stringify(context || {})
  return useMemo(() => {
    const refs = cases.map((c) => c.ourRef).filter(Boolean)
    return generateOurRef(refs, context || {})
  }, [cases, ctxKey])
}

/**
 * Visa/Bank transactions per location for transaction-by-transaction
 * handover (P2C.R3). Returns one row per payment-line / excess-line that
 * settled via Visa/Card (always EGP), plus the seed pre-confirmed batch
 * as a single legacy row.
 */
export function useVisaTransactionsFor(locationId) {
  const { state } = useDemoState()
  return useMemo(() => {
    const out = []
    // Seed legacy confirmed batch (carried forward from previous shifts)
    const seed = state.seedVisaBank[locationId]
    if (seed && seed.confirmedInHandover > 0) {
      out.push({
        id: `legacy_seed_${locationId}`,
        kind: 'legacy_seed',
        ourRef: '—',
        patientName: 'Seed (carry-forward)',
        collectionType: 'Prior Confirmed Total',
        fxRefCurrency: '—',
        fxRefAmount: null,
        fxRate: null,
        amountEgp: seed.confirmedInHandover,
        status: 'confirmed_seed',
        at: null,
      })
    }
    // Live runtime transactions from cases
    for (const c of state.cases) {
      if (c.registeredAtId !== locationId) continue
      const visaInvoice = (c.paymentLines || []).filter(
        (l) => l.method === 'Visa / Card' && Number(l.amount) > 0,
      )
      const visaExcess = (c.excessLines || []).filter(
        (l) => l.method === 'Visa / Card' && Number(l.amount) > 0,
      )
      for (const l of visaInvoice) {
        out.push({
          id: `vt_${c.id}_${l.id || Math.random().toString(36).slice(2, 8)}`,
          kind: 'invoice',
          caseId: c.id,
          ourRef: c.ourRef,
          patientName: c.patient?.name || '—',
          collectionType: 'Cash Case Visa Payment',
          fxRefCurrency: l.fxRefCurrency || '—',
          fxRefAmount: l.fxRefAmount != null ? Number(l.fxRefAmount) : null,
          fxRate: l.fxRate != null && l.fxRate !== '' ? Number(l.fxRate) : null,
          amountEgp: Number(l.amount) || 0,
          status: state.confirmedVisaLineIds[l.id] ? 'confirmed' : 'pending',
          at: c.visitDate || null,
        })
      }
      for (const l of visaExcess) {
        out.push({
          id: `vt_${c.id}_${l.id || Math.random().toString(36).slice(2, 8)}`,
          kind: 'excess',
          caseId: c.id,
          ourRef: c.ourRef,
          patientName: c.patient?.name || '—',
          collectionType: 'Patient Excess Visa Payment',
          fxRefCurrency: l.fxRefCurrency || '—',
          fxRefAmount: l.fxRefAmount != null ? Number(l.fxRefAmount) : null,
          fxRate: l.fxRate != null && l.fxRate !== '' ? Number(l.fxRate) : null,
          amountEgp: Number(l.amount) || 0,
          status: state.confirmedVisaLineIds[l.id] ? 'confirmed' : 'pending',
          at: c.visitDate || null,
        })
      }
    }
    return out
  }, [state, locationId])
}
