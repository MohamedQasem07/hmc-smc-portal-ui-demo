// Synthetic "Old Cases" — historical insurance cases from the Master Sheet.
// MOCK DATA ONLY. No real patient data, no backend, no import has happened.
// Edits made in the Old Cases UI are kept in local React state for the demo.

export const OLD_CASE_STATUSES = [
  'Pending',
  'GOP',
  'Waiting Final GOP',
  'Submitted',
  'Paid',
  'Closed',
  'Needs Review',
]

// StatusPill tone per status (tones defined in premium/primitives StatusPill).
export const STATUS_TONE = {
  'Pending': 'pending',
  'GOP': 'insurance',
  'Waiting Final GOP': 'transferred',
  'Submitted': 'navy',
  'Paid': 'cash',
  'Closed': 'finalized',
  'Needs Review': 'mixed',
}

// Coarse grouping for the Paid / Open / Needs Review filter.
export function payStateOf(status) {
  if (status === 'Needs Review') return 'needs_review'
  if (status === 'Paid' || status === 'Closed') return 'paid'
  return 'open'
}

function mk(p) {
  const at = p.lastUpdated || '2026-05-18T09:00:00.000Z'
  return {
    ourRef: null,
    dob: null,
    insurer: null,
    insuranceRef: null,
    facility: null,
    currency: null,
    status: 'Pending',
    notes: null,
    archived: false,
    statusHistory: [{ status: p.status || 'Pending', at, by: 'Legacy Import' }],
    auditHistory: [{ action: 'Imported', at, by: 'Legacy Import', detail: 'Synthetic sample row' }],
    lastUpdated: at,
    ...p,
  }
}

export const OLD_CASES = [
  mk({ id: 'oc-0001', ourRef: 'SHMC-1052026.418', patientName: 'Liam Becker', dob: '1979-03-12', insurer: 'Allianz Care', insuranceRef: 'ALZ/26/DE/559210', facility: 'SMC – Sahl Hasheesh', currency: 'EUR', status: 'Paid', notes: 'Final invoice settled in full.', lastUpdated: '2026-05-15T14:20:00.000Z' }),
  mk({ id: 'oc-0002', ourRef: 'HMC202604471', patientName: 'Sofia Rossi', dob: '1990-11-02', insurer: 'Europ Assistance', insuranceRef: 'EA-IT-7741209', facility: 'HMC – Hurghada', currency: 'EUR', status: 'Waiting Final GOP', notes: 'Awaiting final GOP after inpatient discharge.', lastUpdated: '2026-05-17T08:05:00.000Z' }),
  mk({ id: 'oc-0003', ourRef: null, patientName: 'Oliver Hughes', dob: '1965-07-23', insurer: 'Bupa Global', insuranceRef: 'BUPA-UK-330117', facility: 'HMC – Hurghada', currency: 'GBP', status: 'Needs Review', notes: 'OUR Ref missing in the sheet — needs assignment.', lastUpdated: '2026-05-19T11:40:00.000Z' }),
  mk({ id: 'oc-0004', ourRef: 'SHMC-2042026.377', patientName: 'Emma Schmidt', dob: '1985-01-30', insurer: 'AXA Assistance', insuranceRef: 'AXA/26/DE/118843', facility: 'Tropitel Clinic', currency: 'EUR', status: 'GOP', lastUpdated: '2026-05-16T16:10:00.000Z' }),
  mk({ id: 'oc-0005', ourRef: 'SHMC-9042026.351', patientName: 'Noah Müller', dob: '2001-09-14', insurer: 'Roland Assistance', insuranceRef: 'RA-DE-220945', facility: 'Romance Clinic', currency: 'EUR', status: 'Submitted', notes: 'Claim package submitted; awaiting insurer response.', lastUpdated: '2026-05-14T10:00:00.000Z' }),
  mk({ id: 'oc-0006', ourRef: null, patientName: 'Charlotte Dubois', dob: '1973-12-05', insurer: 'MAPFRE', insuranceRef: 'MAP-FR-908122', facility: 'SMC – Sahl Hasheesh', currency: 'EUR', status: 'Pending', notes: 'Not previously assigned an OUR Ref.', lastUpdated: '2026-05-19T07:25:00.000Z' }),
  mk({ id: 'oc-0007', ourRef: 'HMC202604402', patientName: 'George Whitfield', dob: '1958-04-18', insurer: 'Bupa Global', insuranceRef: 'BUPA-UK-330244', facility: 'Sheraton Branch', currency: 'GBP', status: 'Closed', notes: 'Case closed and settled by insurer.', lastUpdated: '2026-05-10T13:30:00.000Z' }),
  mk({ id: 'oc-0008', ourRef: 'SHMC-1052026.420', patientName: 'Mia Andersson', dob: '1995-06-21', insurer: 'Europ Assistance', insuranceRef: 'EA-SE-7741355', facility: 'Tropitel Clinic', currency: 'EUR', status: 'Paid', lastUpdated: '2026-05-13T09:45:00.000Z' }),
  mk({ id: 'oc-0009', ourRef: 'SHMC-3052026.461', patientName: 'James Carter', dob: '1982-02-09', insurer: 'AXA Assistance', insuranceRef: 'AXA/26/UK/118990', facility: 'Al-Kawther Branch', currency: 'GBP', status: 'GOP', notes: 'GOP received; treatment ongoing.', lastUpdated: '2026-05-18T12:15:00.000Z' }),
  mk({ id: 'oc-0010', ourRef: null, patientName: 'Hannah Klein', dob: '1968-10-27', insurer: 'Allianz Care', insuranceRef: 'ALZ/26/DE/559477', facility: 'HMC – Hurghada', currency: 'EUR', status: 'Needs Review', notes: 'Duplicate suspected — verify against existing case.', lastUpdated: '2026-05-19T15:55:00.000Z' }),
  mk({ id: 'oc-0011', ourRef: 'HMC202604388', patientName: 'Lucas Moreau', dob: '1999-08-03', insurer: 'MAPFRE', insuranceRef: 'MAP-FR-908233', facility: 'Romance Clinic', currency: 'EUR', status: 'Submitted', lastUpdated: '2026-05-12T11:05:00.000Z' }),
  mk({ id: 'oc-0012', ourRef: 'SHMC-7042026.298', patientName: 'Isabella Conti', dob: '1977-05-16', insurer: 'Europ Assistance', insuranceRef: 'EA-IT-7740980', facility: 'SMC – Sahl Hasheesh', currency: 'EUR', status: 'Waiting Final GOP', notes: 'Partial GOP; waiting final amount.', lastUpdated: '2026-05-11T08:50:00.000Z' }),
  mk({ id: 'oc-0013', ourRef: 'HMC202604301', patientName: 'William Foster', dob: '1961-01-08', insurer: 'Bupa Global', insuranceRef: 'BUPA-UK-329870', facility: 'Sheraton Branch', currency: 'GBP', status: 'Paid', lastUpdated: '2026-05-09T17:20:00.000Z' }),
  mk({ id: 'oc-0014', ourRef: null, patientName: 'Olivia Novak', dob: '2003-04-25', insurer: 'Roland Assistance', insuranceRef: 'RA-CZ-221180', facility: 'Tropitel Clinic', currency: 'EUR', status: 'Pending', notes: 'Pediatric case; OUR Ref pending.', lastUpdated: '2026-05-18T06:40:00.000Z' }),
  mk({ id: 'oc-0015', ourRef: 'SHMC-2032026.140', patientName: 'Henry Walsh', dob: '1970-09-19', insurer: 'AXA Assistance', insuranceRef: 'AXA/26/IE/117560', facility: 'SMC – Sahl Hasheesh', currency: 'EUR', status: 'Closed', notes: 'Older case, retained for reference.', archived: true, lastUpdated: '2026-04-28T10:10:00.000Z' }),
]
