'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { TreeDeciduous, ArrowLeft, Loader2, Briefcase, Clock, AlertCircle } from 'lucide-react'

export default function CustomerJobsPage() {
  const supabase = createClient()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadJobs() {
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
            .from('jobs')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
          setJobs(data || [])
        }
      }
      setLoading(false)
    }
    loadJobs()
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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Jobs & Projects</h1>
          <p className="text-slate-500 mt-1">Review active contracting projects, bathroom designs, or plumbing repairs on your properties.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Active Pipeline Jobs</span>
              <span className="text-xs font-semibold text-slate-500">{jobs.length} Active Projects</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-slate-900 text-lg">{job.title}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">Job Ref: JOB-{job.job_number || job.id.substring(0,6).toUpperCase()}</p>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border self-start sm:self-center bg-blue-50 text-blue-700 border-blue-100">
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 font-medium">
                    {job.customer_visible_summary || job.description || 'Our technicians are drafting active progress notes for this project.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      Status: {job.payment_status}
                    </span>
                    {job.start_date && (
                      <span>Start Date: {job.start_date}</span>
                    )}
                    <span>Est Amount: <span className="font-bold text-slate-700">${Number(job.total_amount || 0).toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No active contracting jobs found. Please contact administration if you initiated a project.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
