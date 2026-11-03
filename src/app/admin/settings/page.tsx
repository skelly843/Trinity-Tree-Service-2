'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AdminSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [settings, setSettings] = useState({
    company_name: 'Trinity Enterprise Tree Services',
    phone: '(254) 338-8140',
    email: 'jessienichols01@gmail.com',
    address: '',
    emergency_service_notice: '',
    service_areas: [] as string[],
    seo_title: 'Trinity Enterprise Tree Services',
    seo_description: 'Tree removal, trimming, stump grinding and storm cleanup. For all your tree service needs.',
  })

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'default')
        .single()
      if (data) {
        setSettings({
          company_name: data.company_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          emergency_service_notice: data.emergency_service_notice || '',
          service_areas: data.service_areas || [],
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
        })
      }
      setFetching(false)
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error: saveErr } = await supabase
      .from('company_settings')
      .upsert({
        id: 'default',
        ...settings,
        updated_at: new Date().toISOString()
      })

    if (saveErr) {
      setError(saveErr.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Company Settings</h1>
        <p className="text-slate-500 mt-1">Configure company branding, contact numbers, and SEO meta tags.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4 flex items-center">
            <Settings className="mr-2 text-slate-400" size={18} />
            Branding & Contact Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Company Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Business Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Emergency Dispatch Notice</label>
            <textarea
              value={settings.emergency_service_notice}
              onChange={(e) => setSettings({ ...settings, emergency_service_notice: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm h-20"
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4">Search Engine Optimization (SEO)</h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta SEO Title</label>
              <input
                type="text"
                value={settings.seo_title}
                onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Meta SEO Description</label>
              <textarea
                value={settings.seo_description}
                onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm h-24"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold">
            {success && (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 size={16} className="mr-1" /> Settings saved successfully!
              </span>
            )}
            {error && (
              <span className="text-red-600 flex items-center">
                <AlertCircle size={16} className="mr-1" /> {error}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-100 flex items-center space-x-2 text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  )
}
