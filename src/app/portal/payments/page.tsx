'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, CreditCard } from 'lucide-react'

export default function CustomerPaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPayments() {
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
            .from('payments')
            .select('*, invoices(invoice_number)')
            .eq('customer_id', customer.id)
            .order('payment_date', { ascending: false })
          setPayments(data || [])
        }
      }
      setLoading(false)
    }
    loadPayments()
  }, [])

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Payments</h1>
          <p className="text-slate-500 mt-1">Review processing dates, credit card references, and settled balance logs.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Transaction History</span>
              <span className="text-xs font-semibold text-slate-500">{payments.length} Payments Reconciled</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {payments.map((p) => (
                <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                      <CreditCard size={22} />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">Payment for INV-{p.invoices?.invoice_number}</p>
                      <p className="text-xs text-slate-400">Processed: {p.payment_date || new Date(p.created_at).toLocaleDateString()} via {p.payment_method.toUpperCase()}</p>
                      <p className="text-xs font-mono text-slate-500 mt-1">Reference: {p.reference_number || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${p.status === 'confirmed' ? 'text-green-600' : 'text-slate-400'}`}>
                      +${Number(p.amount || 0).toFixed(2)}
                    </p>
                    {p.status !== 'confirmed' && (
                      <p className="text-xs font-bold text-slate-500">
                        {p.status === 'pending' ? 'Waiting for office review' : 'Not accepted'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No payment history recorded.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
