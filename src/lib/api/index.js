/* =========================================================================
 * Data-access facade (P3-prep) — the seam P3B wires to Supabase.
 * -----------------------------------------------------------------------
 * `api` resolves to the mock backend by default (browser-local). When
 * VITE_DATA_BACKEND=supabase (P3B, after approval + envs + npm i), it
 * resolves to the Supabase backend instead.
 *
 * IMPORTANT (mock mode): the LIVE source of truth for writes is
 * DemoStateContext (the React reducer + localStorage). The mock backend here
 * exposes READ helpers over the same persisted state so the interface is
 * demonstrable, and throws on writes to make clear that, in mock mode, writes
 * still flow through the Portal UI. P3B migrates pages onto this facade.
 * ========================================================================= */
import { DATA_BACKEND, isSupabaseConfigured } from './config'
import { getSupabaseClient } from './supabaseClient'
import { billingPrepToRow } from './portalMapping'

const PERSIST_KEY = 'aegis_portal_state_v1'
function readLocalState() {
  try { return JSON.parse(window.localStorage.getItem(PERSIST_KEY)) || {} } catch { return {} }
}
const MOCK_WRITE_MSG =
  'mock mode: writes flow through the Portal UI (DemoStateContext). Live writes arrive in P3B.'

// ---- Mock backend (browser-local) ----------------------------------------
const mockApi = {
  backend: 'mock',
  async listCases() { return readLocalState().cases || [] },
  async getCase(id) { return (readLocalState().cases || []).find((c) => c.id === id) || null },
  async listBillingQueue() {
    return (readLocalState().cases || []).filter(
      (c) => c.financialType === 'Insurance'
        && c.insuranceCompletion?.billingPrepStatus === 'ready_for_claude',
    )
  },
  async createCase() { throw new Error(MOCK_WRITE_MSG) },
  async updateCase() { throw new Error(MOCK_WRITE_MSG) },
  async saveBillingPreparation() { throw new Error(MOCK_WRITE_MSG) },
}

// ---- Supabase backend (INERT until P3B) ----------------------------------
const supabaseApi = {
  backend: 'supabase',
  async _db() { return getSupabaseClient() },
  async listCases() {
    const db = await this._db()
    const { data, error } = await db.from('portal_cases').select('*')
    if (error) throw error
    return data
  },
  async getCase(id) {
    const db = await this._db()
    const { data, error } = await db.from('portal_cases').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async listBillingQueue() {
    const db = await this._db()
    const { data, error } = await db
      .from('portal_insurance_billing_preparations')
      .select('*, portal_cases(*)')
      .eq('billing_preparation_status', 'ready_for_claude_invoice_preparation')
    if (error) throw error
    return data
  },
  async createCase() {
    // P3B: insert portal_patients then portal_cases (see portalMapping.caseToRow);
    // both writes must satisfy clinic/reception RLS scope.
    throw new Error('P3B: implement createCase (portal_patients + portal_cases insert).')
  },
  async updateCase() { throw new Error('P3B: implement updateCase.') },
  async saveBillingPreparation(caseId, completion, ids) {
    const db = await this._db()
    const row = billingPrepToRow(caseId, completion, ids)
    const { data, error } = await db
      .from('portal_insurance_billing_preparations')
      .upsert(row, { onConflict: 'case_id' })
      .select().single()
    if (error) throw error
    return data
  },
}

export const api = DATA_BACKEND === 'supabase' ? supabaseApi : mockApi
export { DATA_BACKEND, isSupabaseConfigured }
