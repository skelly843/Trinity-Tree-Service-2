'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Clock, ShieldAlert } from 'lucide-react'

export default function CustomerRequestsPage() {
  const supabase = createClient()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRequests() {
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
            .from('service_requests')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
          setRequests(data || [])
        }
      }
      setLoading(false)
    }
    loadRequests()
  }, [])

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Service Requests</h1>
          <p className="text-slate-500 mt-1">Review the status of your online booking requests and dispatch allocations.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Online Requests Queue</span>
              <span className="text-xs font-semibold text-slate-500">{requests.length} Requests Total</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-lg">{req.service_requested}</p>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                      req.status === 'new'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-green-50 text-green-700 border-green-100'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                    {req.problem_description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      Submitted: {new Date(req.created_at).toLocaleDateString()}
                    </span>
                    {req.is_emergency && (
                      <span className="flex items-center font-bold text-red-600">
                        <ShieldAlert size={12} className="mr-1 text-red-500" />
                        Emergency request
                      </span>
                    )}
                    <span>Address: {req.address}, {req.city}</span>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No online booking requests submitted. Click "Request New Service" to create one.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
