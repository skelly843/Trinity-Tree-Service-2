'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { StoredFileLink } from '@/components/StoredFileLink'
import { Loader2, Receipt } from 'lucide-react'

export default function CustomerReceiptsPage() {
  const supabase = createClient()
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReceipts() {
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
            .from('receipts')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('is_visible_to_customer', true)
            .order('receipt_date', { ascending: false })
          setReceipts(data || [])
        }
      }
      setLoading(false)
    }
    loadReceipts()
  }, [])

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Receipts</h1>
          <p className="text-slate-500 mt-1">Receipts we've shared with you for your jobs.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Billed Materials Proofs</span>
              <span className="text-xs font-semibold text-slate-500">{receipts.length} Receipts Shared</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {receipts.map((rec) => (
                <div key={rec.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Receipt size={22} />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">{rec.description || 'Materials Invoice'}</p>
                      <p className="text-xs text-slate-400">Shared Date: {rec.receipt_date || new Date(rec.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-slate-900">
                      ${Number(rec.amount || 0).toFixed(2)}
                    </span>
                    <StoredFileLink value={rec.receipt_file_url} label="View receipt" />
                  </div>
                </div>
              ))}
              {receipts.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No billing receipts shared on this account.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
