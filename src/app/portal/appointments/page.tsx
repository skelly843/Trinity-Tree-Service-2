'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

export default function CustomerAppointmentsPage() {
  const supabase = createClient()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAppointments() {
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
            .from('appointments')
            .select('*, customer_properties(address_line)')
            .eq('customer_id', customer.id)
            .order('scheduled_at', { ascending: false })
          setAppointments(data || [])
        }
      }
      setLoading(false)
    }
    loadAppointments()
  }, [])

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Appointments</h1>
          <p className="text-slate-500 mt-1">Review your upcoming dispatches, maintenance visits, or completed jobs.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Appointment History</span>
              <span className="text-xs font-semibold text-slate-500">{appointments.length} Total Visits</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {appointments.map((apt) => (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <Calendar size={22} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{apt.service_type}</p>
                      <p className="text-xs text-blue-600 font-bold flex items-center">
                        <Clock size={12} className="mr-1" />
                        {format(new Date(apt.scheduled_at), 'PPP p')}
                      </p>
                      {apt.customer_properties && (
                        <p className="text-xs text-slate-500">Address: {apt.customer_properties.address_line}</p>
                      )}
                      {apt.notes && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg mt-2 inline-block">
                          Note from tech: {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border shrink-0 self-end sm:self-center ${
                    apt.status === 'completed'
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : apt.status === 'cancelled'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No appointments scheduled. Click "Request New Service" to schedule a dispatch.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
