import type Anthropic from '@anthropic-ai/sdk'
import type { AssistantAudience } from './assistantGuide'

/**
 * Read-only lookups the help assistant can use to answer questions about the asker's own
 * information. Safety rules:
 * - Every lookup runs with the signed-in person's own database session, so the same
 *   access rules that protect the website decide what comes back. The service role key
 *   is never used here.
 * - Each lookup returns only a few named fields, at most a handful of rows.
 * - Nothing here can change, approve, pay or delete anything.
 */

type Supa = any
export interface ToolContext {
  supabase: Supa
  userId: string
  role: string
  customerId: string | null
}

const OPEN_VISIT = ['pending', 'confirmed', 'in_progress']
const OPEN_INVOICE = ['sent', 'partial', 'overdue']
const MAX_ROWS = 8

const money = (n: unknown) => `$${(Math.round(Number(n || 0) * 100) / 100).toFixed(2)}`
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const day = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null)
const name = (c?: { first_name?: string; last_name?: string } | null) => (c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : null)
const place = (p?: { address_line?: string; city?: string } | null) => (p ? [p.address_line, p.city].filter(Boolean).join(', ') : null)
const clean = (t?: string | null, max = 200) => (t ? String(t).replace(/\s+/g, ' ').trim().slice(0, max) : null)

function schema(properties: Record<string, unknown> = {}, required: string[] = []) {
  return { type: 'object' as const, additionalProperties: false, properties, required }
}

interface ToolDef {
  tool: Anthropic.Beta.BetaTool
  run: (input: any, ctx: ToolContext) => Promise<unknown>
}

// ---------- customers ----------

const myVisits: ToolDef = {
  tool: {
    name: 'my_upcoming_visits',
    description: "The customer's upcoming scheduled visits: date and time, service, status, address and the arborist coming.",
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    if (!ctx.customerId) return { note: 'This login is not linked to a customer account yet.' }
    const [{ data }, { data: team }] = await Promise.all([
      ctx.supabase
        .from('appointments')
        .select('id, scheduled_at, service_type, status, customer_properties(address_line, city)')
        .eq('customer_id', ctx.customerId)
        .in('status', OPEN_VISIT)
        .gte('scheduled_at', new Date(Date.now() - 3 * 3600_000).toISOString())
        .order('scheduled_at')
        .limit(MAX_ROWS),
      ctx.supabase.rpc('customer_team')
    ])
    const staff = new Map(((team as any[]) || []).filter((t) => t.kind === 'visit').map((t) => [t.ref_id, t.full_name]))
    return (data || []).map((v: any) => ({
      when: when(v.scheduled_at),
      service: v.service_type,
      status: v.status,
      address: place(v.customer_properties),
      arborist: staff.get(v.id) || null
    }))
  }
}

const myBilling: ToolDef = {
  tool: {
    name: 'my_billing',
    description: "The customer's unpaid invoices (number, total, amount still due, due date) and estimates waiting for their answer.",
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    if (!ctx.customerId) return { note: 'This login is not linked to a customer account yet.' }
    const [{ data: invoices }, { data: estimates }] = await Promise.all([
      ctx.supabase
        .from('invoices')
        .select('invoice_number, total, amount_paid, status, due_date')
        .eq('customer_id', ctx.customerId)
        .in('status', OPEN_INVOICE)
        .order('due_date')
        .limit(MAX_ROWS),
      ctx.supabase
        .from('estimates')
        .select('estimate_number, total, status, expiration_date')
        .eq('customer_id', ctx.customerId)
        .in('status', ['sent', 'viewed'])
        .limit(MAX_ROWS)
    ])
    const open = (invoices || []).map((i: any) => ({
      invoice: `#${i.invoice_number}`,
      total: money(i.total),
      still_due: money(Math.max(Number(i.total || 0) - Number(i.amount_paid || 0), 0)),
      due: day(i.due_date),
      status: i.status
    }))
    return {
      open_invoices: open,
      total_due: money(open.reduce((s: number, i: any) => s + Number(i.still_due.slice(1)), 0)),
      estimates_waiting_for_answer: (estimates || []).map((e: any) => ({ estimate: `#${e.estimate_number}`, total: money(e.total), expires: day(e.expiration_date) }))
    }
  }
}

const myJobs: ToolDef = {
  tool: {
    name: 'my_jobs',
    description: "The customer's jobs with their status and the progress summary written for the customer.",
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    if (!ctx.customerId) return { note: 'This login is not linked to a customer account yet.' }
    const { data } = await ctx.supabase
      .from('jobs')
      .select('job_number, title, status, customer_visible_summary, start_date, actual_completion_date')
      .eq('customer_id', ctx.customerId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)
    return (data || []).map((j: any) => ({
      job: `#${j.job_number} ${j.title}`,
      status: String(j.status).replace(/_/g, ' '),
      started: day(j.start_date),
      finished: day(j.actual_completion_date),
      progress: clean(j.customer_visible_summary)
    }))
  }
}

// ---------- employees ----------

const mySchedule: ToolDef = {
  tool: {
    name: 'my_schedule',
    description: "The worker's own visits for the next given number of days (1 to 14): time, service, customer, address, phone and visit notes.",
    input_schema: schema({ days: { type: 'integer', description: 'How many days ahead, 1 to 14.' } }, ['days']),
    strict: true
  },
  async run(input, ctx) {
    const days = Math.min(Math.max(Number(input?.days) || 1, 1), 14)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const { data } = await ctx.supabase
      .from('appointments')
      .select('scheduled_at, service_type, status, notes, customers(first_name, last_name, phone), customer_properties(address_line, city)')
      .eq('assigned_admin_id', ctx.userId)
      .in('status', OPEN_VISIT)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', new Date(start.getTime() + days * 86400_000).toISOString())
      .order('scheduled_at')
      .limit(MAX_ROWS * 2)
    return (data || []).map((v: any) => ({
      when: when(v.scheduled_at),
      service: v.service_type,
      customer: name(v.customers),
      phone: v.customers?.phone || null,
      address: place(v.customer_properties),
      notes: clean(v.notes)
    }))
  }
}

const findCustomer: ToolDef = {
  tool: {
    name: 'find_customer',
    description:
      'Look up a customer by name among the customers this person is allowed to see: phone, email, property addresses with access notes (gate codes, dogs), and open jobs.',
    input_schema: schema({ name: { type: 'string', description: 'First or last name, or both.' } }, ['name']),
    strict: true
  },
  async run(input, ctx) {
    const words = String(input?.name || '')
      .replace(/[^a-zA-Z' -]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 3)
    if (!words.length) return { note: 'Give a customer name to look up.' }
    let query = ctx.supabase
      .from('customers')
      .select('first_name, last_name, business_name, phone, email, customer_properties(address_line, city, notes), jobs(title, status)')
      .limit(5)
    for (const w of words) query = query.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%,business_name.ilike.%${w}%`)
    const { data } = await query
    if (!data?.length) return { note: 'No customer by that name that you have access to.' }
    return data.map((c: any) => ({
      customer: name(c),
      business: c.business_name || null,
      phone: c.phone || null,
      email: c.email || null,
      properties: (c.customer_properties || []).map((p: any) => ({ address: place(p), access_notes: clean(p.notes) })),
      open_jobs: (c.jobs || []).filter((j: any) => !['completed', 'cancelled'].includes(j.status)).map((j: any) => j.title)
    }))
  }
}

const myPay: ToolDef = {
  tool: {
    name: 'my_pay',
    description: "The worker's own pay: amount owed now, amount waiting on unfinished jobs, and recent payments (date, method, amount, confirmed or not).",
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    const [{ data: earnings }, { data: payouts }] = await Promise.all([
      ctx.supabase.from('worker_earnings').select('amount, status, payout_id').eq('worker_id', ctx.userId).neq('status', 'void'),
      ctx.supabase.from('worker_payouts').select('amount, method, paid_on, worker_confirmed_at, voided_at').eq('worker_id', ctx.userId).order('paid_on', { ascending: false }).limit(5)
    ])
    const sum = (rows: any[]) => money(rows.reduce((s, r) => s + Number(r.amount || 0), 0))
    return {
      owed_now: sum((earnings || []).filter((e: any) => e.status === 'approved' && !e.payout_id)),
      when_current_jobs_finish: sum((earnings || []).filter((e: any) => e.status === 'pending')),
      recent_payments: (payouts || [])
        .filter((p: any) => !p.voided_at)
        .map((p: any) => ({ date: day(p.paid_on), method: p.method, amount: money(p.amount), confirmed_by_you: !!p.worker_confirmed_at }))
    }
  }
}

// ---------- office ----------

const schedule: ToolDef = {
  tool: {
    name: 'schedule',
    description: 'All visits for a day: 0 is today, 1 tomorrow, up to 14. Time, service, customer, address, assigned staff and status.',
    input_schema: schema({ day_offset: { type: 'integer', description: 'Days from today, 0 to 14.' } }, ['day_offset']),
    strict: true
  },
  async run(input, ctx) {
    const offset = Math.min(Math.max(Number(input?.day_offset) || 0, 0), 14)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() + offset)
    const { data } = await ctx.supabase
      .from('appointments')
      .select('scheduled_at, service_type, status, assigned_admin_id, customers(first_name, last_name), customer_properties(address_line, city)')
      .gte('scheduled_at', start.toISOString())
      .lt('scheduled_at', new Date(start.getTime() + 86400_000).toISOString())
      .order('scheduled_at')
      .limit(25)
    const ids = [...new Set((data || []).map((v: any) => v.assigned_admin_id).filter(Boolean))]
    const { data: staff } = ids.length ? await ctx.supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] }
    const names = new Map(((staff as any[]) || []).map((s) => [s.id, s.full_name]))
    return (data || []).map((v: any) => ({
      when: when(v.scheduled_at),
      service: v.service_type,
      customer: name(v.customers),
      address: place(v.customer_properties),
      assigned_to: names.get(v.assigned_admin_id) || 'not assigned',
      status: v.status
    }))
  }
}

const moneyOwed: ToolDef = {
  tool: {
    name: 'money_owed_to_business',
    description: 'Unpaid customer invoices, oldest due date first: customer, invoice number, amount still due, due date and whether it is past due.',
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    const { data } = await ctx.supabase
      .from('invoices')
      .select('invoice_number, total, amount_paid, status, due_date, customers(first_name, last_name)')
      .in('status', OPEN_INVOICE)
      .order('due_date')
      .limit(15)
    const today = new Date().toISOString().slice(0, 10)
    const rows = (data || []).map((i: any) => ({
      customer: name(i.customers),
      invoice: `#${i.invoice_number}`,
      still_due: Math.max(Number(i.total || 0) - Number(i.amount_paid || 0), 0),
      due: day(i.due_date),
      past_due: !!i.due_date && i.due_date < today
    }))
    return {
      invoices: rows.map((r: any) => ({ ...r, still_due: money(r.still_due) })),
      total_outstanding: money(rows.reduce((s: number, r: any) => s + r.still_due, 0))
    }
  }
}

const newRequests: ToolDef = {
  tool: {
    name: 'new_service_requests',
    description: 'Service requests from the website not yet handled (status new): name, service, city, preferred date, emergency or not.',
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    const { data } = await ctx.supabase
      .from('service_requests')
      .select('first_name, last_name, service_requested, city, preferred_date, is_emergency, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(10)
    return (data || []).map((r: any) => ({
      name: `${r.first_name} ${r.last_name}`,
      service: r.service_requested,
      city: r.city,
      preferred_date: day(r.preferred_date),
      emergency: !!r.is_emergency,
      received: when(r.created_at)
    }))
  }
}

const workerPay: ToolDef = {
  tool: {
    name: 'worker_pay_status',
    description: 'Owner only. For each worker: amount owed now, amount waiting on unfinished jobs, and payments they have not confirmed receiving.',
    input_schema: schema(),
    strict: true
  },
  async run(_input, ctx) {
    if (ctx.role !== 'global_admin') return { note: 'Only the owner can see worker pay.' }
    const [{ data: earnings }, { data: payouts }, { data: workers }] = await Promise.all([
      ctx.supabase.from('worker_earnings').select('worker_id, amount, status, payout_id').neq('status', 'void'),
      ctx.supabase.from('worker_payouts').select('worker_id, amount, paid_on, method').is('voided_at', null).is('worker_confirmed_at', null),
      ctx.supabase.from('profiles').select('id, full_name').in('role', ['employee', 'admin'])
    ])
    return ((workers as any[]) || []).map((w) => {
      const mine = ((earnings as any[]) || []).filter((e) => e.worker_id === w.id)
      const total = (rows: any[]) => money(rows.reduce((s, r) => s + Number(r.amount || 0), 0))
      return {
        worker: w.full_name,
        owed_now: total(mine.filter((e) => e.status === 'approved' && !e.payout_id)),
        waiting_on_jobs: total(mine.filter((e) => e.status === 'pending')),
        unconfirmed_payments: ((payouts as any[]) || []).filter((p) => p.worker_id === w.id).map((p) => `${money(p.amount)} by ${p.method} on ${day(p.paid_on)}`)
      }
    })
  }
}

const TOOLS: Record<AssistantAudience, ToolDef[]> = {
  customer: [myVisits, myBilling, myJobs],
  employee: [mySchedule, findCustomer, myPay],
  office: [schedule, findCustomer, moneyOwed, newRequests, workerPay]
}

export function assistantTools(audience: AssistantAudience, role: string): ToolDef[] {
  return TOOLS[audience].filter((t) => t !== workerPay || role === 'global_admin')
}

/** Runs one lookup, returning plain JSON text; failures come back as a short error. */
export async function runAssistantTool(defs: ToolDef[], name: string, input: unknown, ctx: ToolContext) {
  const def = defs.find((d) => d.tool.name === name)
  if (!def) return { text: JSON.stringify({ error: 'Unknown lookup.' }), isError: true }
  try {
    const result = await def.run(input && typeof input === 'object' ? input : {}, ctx)
    const empty = Array.isArray(result) && result.length === 0
    return { text: JSON.stringify(empty ? { result: 'Nothing found.' } : result).slice(0, 6000), isError: false }
  } catch (err) {
    console.error('Assistant lookup failed:', name, err)
    return { text: JSON.stringify({ error: 'The lookup failed. Suggest checking the page directly.' }), isError: true }
  }
}
