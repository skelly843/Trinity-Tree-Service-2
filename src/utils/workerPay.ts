/** Shared labels and totals for worker earnings and payouts. */

export const PAY_METHODS = [
  { value: 'zelle', label: 'Zelle', reference: 'Zelle confirmation number' },
  { value: 'cash_app', label: 'Cash App', reference: 'Cash App payment ID' },
  { value: 'check', label: 'Check', reference: 'Check number' },
  { value: 'cash', label: 'Cash', reference: 'Receipt or note (optional)' },
  { value: 'other', label: 'Other', reference: 'Reference (optional)' }
] as const

export type PayMethod = (typeof PAY_METHODS)[number]['value']

export const methodLabel = (m: string) => PAY_METHODS.find((p) => p.value === m)?.label || m
export const referenceRequired = (m: string) => m === 'zelle' || m === 'cash_app' || m === 'check'

export interface Earning {
  id: string
  worker_id: string
  job_id: string | null
  description: string
  amount: number | string
  status: 'pending' | 'approved' | 'void'
  work_date: string
  payout_id: string | null
  created_at: string
  jobs?: { title: string | null; job_number: number | null } | null
}

export interface Payout {
  id: string
  worker_id: string
  amount: number | string
  method: string
  reference: string | null
  paid_on: string
  note: string | null
  created_at: string
  worker_confirmed_at: string | null
  voided_at: string | null
  void_reason: string | null
}

/** Adds money in cents so totals never pick up rounding errors. */
export function sumAmounts(rows: { amount: number | string }[]) {
  return rows.reduce((cents, r) => cents + Math.round(Number(r.amount || 0) * 100), 0) / 100
}

export function payTotals(earnings: Earning[], payouts: Payout[], year = new Date().getFullYear()) {
  const owed = earnings.filter((e) => e.status === 'approved' && !e.payout_id)
  const upcoming = earnings.filter((e) => e.status === 'pending')
  const paidThisYear = payouts.filter((p) => !p.voided_at && p.paid_on.startsWith(String(year)))
  return {
    owed,
    upcoming,
    owedTotal: sumAmounts(owed),
    upcomingTotal: sumAmounts(upcoming),
    paidThisYearTotal: sumAmounts(paidThisYear)
  }
}

/** "2026-11-10" shown as a local date without shifting a day across time zones. */
export const showDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString()
