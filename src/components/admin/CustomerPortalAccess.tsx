'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Mail, ShieldCheck, UserX } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface LoginStatus {
  customer_id: string
  profile_id: string
  invited_at: string | null
  accepted_at: string | null
  last_sign_in_at: string | null
  is_active: boolean
}

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '')

/** Sends a customer an invitation email. Shared by this panel and the Add customer form. */
export async function sendPortalInvite(customerId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/invite-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId })
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, message: body.error || `The invitation was not sent (${res.status}).` }
    return { ok: true, message: `Invitation emailed to ${body.invited}.` }
  } catch {
    return { ok: false, message: 'The invitation was not sent. Check your connection and try again.' }
  }
}

/**
 * Customer records with their portal login status: invite them, resend an invitation,
 * and (global admin) approve or remove the login once the customer has created it.
 */
export function CustomerPortalAccess() {
  const [customers, setCustomers] = useState<any[]>([])
  const [statuses, setStatuses] = useState<Map<string, LoginStatus>>(new Map())
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: rows }, { data: status }, { data: globalAdmin }] = await Promise.all([
      supabase.from('customers').select('id, first_name, last_name, email').order('last_name'),
      supabase.rpc('customer_login_statuses'),
      supabase.rpc('is_global_admin')
    ])
    setCustomers(rows || [])
    setStatuses(new Map(((status as LoginStatus[]) || []).map((s) => [s.customer_id, s])))
    setIsGlobalAdmin(globalAdmin === true)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // The Add customer form announces new customers so this list updates
    window.addEventListener('customers-changed', load)
    return () => window.removeEventListener('customers-changed', load)
  }, [load])

  const invite = async (customerId: string) => {
    setBusy(customerId)
    setMessage(null)
    const result = await sendPortalInvite(customerId)
    setMessage({ ok: result.ok, text: result.message })
    setBusy(null)
    load()
  }

  const setAccess = async (status: LoginStatus, active: boolean) => {
    setBusy(status.customer_id)
    setMessage(null)
    const { data, error } = await createClient().from('profiles').update({ is_active: active }).eq('id', status.profile_id).select('id')
    if (error || !data?.length) {
      setMessage({ ok: false, text: error?.message || 'Only the global admin can approve logins.' })
    } else {
      setMessage({ ok: true, text: active ? 'Login approved. The customer can now use the portal.' : 'Portal access removed.' })
    }
    setBusy(null)
    load()
  }

  const button = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50">
        <h2 className="font-bold text-slate-900">Customer Portal Access</h2>
        <p className="text-xs text-slate-500 mt-1">
          Invite a customer by email. They choose a password from the email link, then you approve the login so they can
          see their estimates, invoices, documents and messages.
        </p>
      </div>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`px-5 py-3 text-sm font-medium ${message.ok ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {customers.map((c) => {
            const s = statuses.get(c.id)
            const isBusy = busy === c.id
            let label: React.ReactNode
            let actions: React.ReactNode

            if (!s) {
              label = <span className="text-slate-500">No login yet</span>
              actions = c.email ? (
                <button onClick={() => invite(c.id)} disabled={isBusy} className={`${button} text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100`}>
                  {isBusy ? <Loader2 className="animate-spin" size={12} /> : <Mail size={12} />} Invite to portal
                </button>
              ) : (
                <span className="text-xs text-slate-400">Add an email to invite</span>
              )
            } else if (!s.accepted_at) {
              label = <span className="text-amber-700">Invitation sent {date(s.invited_at)}, not accepted yet</span>
              actions = (
                <button onClick={() => invite(c.id)} disabled={isBusy} className={`${button} text-slate-700 bg-white border-slate-200 hover:bg-slate-50`}>
                  {isBusy ? <Loader2 className="animate-spin" size={12} /> : <Mail size={12} />} Resend invitation
                </button>
              )
            } else if (!s.is_active) {
              label = (
                <span className="text-amber-700 font-semibold">
                  Login created {date(s.accepted_at)}. Waiting for your approval
                </span>
              )
              actions = isGlobalAdmin ? (
                <button onClick={() => setAccess(s, true)} disabled={isBusy} className={`${button} text-green-700 bg-green-50 border-green-100 hover:bg-green-100`}>
                  {isBusy ? <Loader2 className="animate-spin" size={12} /> : <ShieldCheck size={12} />} Approve
                </button>
              ) : (
                <span className="text-xs text-slate-400">The global admin approves logins</span>
              )
            } else {
              label = (
                <span className="text-green-700 inline-flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active{s.last_sign_in_at ? `, last signed in ${date(s.last_sign_in_at)}` : ''}
                </span>
              )
              actions = isGlobalAdmin ? (
                <button onClick={() => setAccess(s, false)} disabled={isBusy} className={`${button} text-red-600 bg-red-50 border-red-100 hover:bg-red-100`}>
                  <UserX size={12} /> Remove access
                </button>
              ) : null
            }

            return (
              <div key={c.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-slate-500">{c.email || 'No email'} • {label}</p>
                </div>
                {actions}
              </div>
            )
          })}
          {customers.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-400 italic">No customers yet. Use Add customer above.</p>
          )}
        </div>
      )}
    </div>
  )
}
