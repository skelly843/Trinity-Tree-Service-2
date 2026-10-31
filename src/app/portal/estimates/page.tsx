'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Droplet, ArrowLeft, Loader2, FileCheck, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CustomerEstimatesPage() {
  const supabase = createClient()
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadEstimates = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email || '')
        .limit(1)
        .maybeSingle()

      if (customer) {
        const { data } = await supabase
          .from('estimates')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
        setEstimates(data || [])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEstimates()
  }, [])

  const handleRespond = async (id: string, decision: 'approved' | 'declined') => {
    setUpdating(id)
    setError(null)
    setSuccess(null)

    const { error: updErr } = await supabase.rpc('customer_respond_to_estimate', {
      p_estimate_id: id,
      p_decision: decision
    })

    if (updErr) {
      setError(updErr.message)
    } else {
      setSuccess(decision === 'approved'
        ? 'Estimate approved. We will contact you to schedule the work.'
        : 'Estimate declined. Thank you for letting us know.')
      loadEstimates()
    }
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <Droplet className="text-blue-600" size={32} />
          <span className="text-2xl font-bold text-slate-900"><SiteName suffix=" Client Portal" /></span>
        </Link>
        <Link href="/portal" className="text-sm font-bold text-blue-600 hover:underline">
          Portal Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">
        <Link href="/portal" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Proposals & Estimates</h1>
          <p className="text-slate-500 mt-1">Review labor, materials, and overall bids for your home plumbing or construction services.</p>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center">
            <CheckCircle2 size={16} className="mr-2" /> {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
            <AlertCircle size={16} className="mr-2" /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Estimates Pipeline</span>
              <span className="text-xs font-semibold text-slate-500">{estimates.length} Proposals Total</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {estimates.map((est) => (
                <div key={est.id} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <FileCheck size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-extrabold text-slate-800 text-lg">Proposal Estimate #{est.estimate_number}</p>
                      <p className="text-xs text-slate-400">Created: {new Date(est.created_at).toLocaleDateString()}</p>
                      <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                        <p>Labor Cost: ${Number(est.labor_cost || 0).toFixed(2)}</p>
                        <p>Materials Cost: ${Number(est.materials_cost || 0).toFixed(2)}</p>
                      </div>
                      {est.terms_conditions && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 inline-block mt-2">
                          Terms: {est.terms_conditions}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Est</p>
                      <p className="text-lg font-black text-slate-900">${Number(est.total || 0).toFixed(2)}</p>
                    </div>

                    {est.status === 'sent' || est.status === 'viewed' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespond(est.id, 'declined')}
                          disabled={updating === est.id}
                          className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespond(est.id, 'approved')}
                          disabled={updating === est.id}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                        >
                          {updating === est.id ? 'Saving...' : 'Approve'}
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                        est.status === 'approved' || est.status === 'converted'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {est.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {estimates.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No active estimates drafted. If you requested a quote, our designers will post a proposal shortly.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
