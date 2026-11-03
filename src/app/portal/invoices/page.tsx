'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { TreeDeciduous, ArrowLeft, Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import PayButton from '@/components/PayButton'

// Only sites with Stripe keys offer card payments
const CARD_PAYMENTS_ENABLED = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

export default function CustomerInvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
  const [report, setReport] = useState<{ invoiceId: string; amount: string; method: string; reference: string } | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadInvoices = async () => {
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
          .from('invoices')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
        setInvoices(data || [])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadInvoices()

    // Stripe sends customers back here, usually just before the invoice updates
    if (new URLSearchParams(window.location.search).get('success') === 'true') {
      setSuccess('Thank you. Your card payment went through, and your invoice will update in a moment.')
    }
  }, [])

  const balanceOf = (inv: any) => Math.max(Number(inv.total || 0) - Number(inv.amount_paid || 0), 0)

  const handleOpenReport = (inv: any) => {
    setError(null)
    setSuccess(null)
    setReport({ invoiceId: inv.id, amount: balanceOf(inv).toFixed(2), method: 'check', reference: '' })
  }

  const handleReportPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!report) return
    setPaying(report.invoiceId)
    setError(null)

    const { error: payErr } = await supabase.rpc('customer_report_payment', {
      p_invoice_id: report.invoiceId,
      p_amount: Number(report.amount),
      p_method: report.method,
      p_reference: report.reference
    })

    if (payErr) {
      setError(payErr.message)
    } else {
      setSuccess('Thank you. Your invoice will update once our office confirms the payment.')
      setReport(null)
      loadInvoices()
    }
    setPaying(null)
  }

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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Invoices</h1>
          <p className="text-slate-500 mt-1">Review your service bills, transaction logs, and process secure payments.</p>
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
              <span className="text-sm font-bold text-slate-800">Outstanding & Paid Invoices</span>
              <span className="text-xs font-semibold text-slate-500">{invoices.length} Invoices Total</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <FileText size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-extrabold text-slate-800 text-lg">Invoice #INV-{inv.invoice_number}</p>
                      <p className="text-xs text-slate-400">Issued: {inv.issue_date || new Date(inv.created_at).toLocaleDateString()}</p>
                      {inv.notes && <p className="text-xs text-slate-500 font-semibold">{inv.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Balance</p>
                      <p className="text-lg font-black text-slate-900">${balanceOf(inv).toFixed(2)}</p>
                    </div>

                    {inv.status === 'sent' || inv.status === 'partial' || inv.status === 'overdue' ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {CARD_PAYMENTS_ENABLED && <PayButton invoiceId={inv.id} onError={setError} />}
                        <button
                          onClick={() => handleOpenReport(inv)}
                          className="bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                        >
                          I Sent a Payment
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                        inv.status === 'paid'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {inv.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No billing history found. All clean!
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {report && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-6 z-50">
          <form onSubmit={handleReportPayment} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tell us about your payment</h2>
              <p className="text-sm text-slate-500 mt-1">This does not charge you. It lets our office know a payment is on its way.</p>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              <span>Amount ($)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={report.amount}
                onChange={(e) => setReport({ ...report, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              <span>How did you pay?</span>
              <select
                value={report.method}
                onChange={(e) => setReport({ ...report, method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              <span>Check or reference number (optional)</span>
              <input
                type="text"
                value={report.reference}
                onChange={(e) => setReport({ ...report, reference: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setReport(null)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={paying !== null} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50">
                {paying ? 'Sending...' : 'Send to Office'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
