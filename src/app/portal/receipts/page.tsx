'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { TreeDeciduous, ArrowLeft, Loader2, Receipt } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <TreeDeciduous className="text-blue-600" size={32} />
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Receipts</h1>
          <p className="text-slate-500 mt-1">Review part materials, installation receipts, and supplier invoices shared by our contracting crew.</p>
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
                    <a
                      href={rec.receipt_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                    >
                      Download file
                    </a>
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
