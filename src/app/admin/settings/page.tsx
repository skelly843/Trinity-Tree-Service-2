'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Settings, Save, Loader2, CheckCircle2, AlertCircle, MapPin, Search, Share2 } from 'lucide-react'

const SOCIAL_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'google', label: 'Google Business Profile', placeholder: 'https://g.page/… or https://maps.app.goo.gl/…' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'yelp', label: 'Yelp', placeholder: 'https://yelp.com/biz/…' },
  { key: 'nextdoor', label: 'Nextdoor', placeholder: 'https://nextdoor.com/pages/…' },
  { key: 'bbb', label: 'Better Business Bureau', placeholder: 'https://bbb.org/…' }
]

const input = 'w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm'
const label = 'text-xs font-bold text-slate-600 uppercase tracking-wider'

export default function AdminSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [settings, setSettings] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    emergency_service_notice: '',
    seo_title: '',
    seo_description: ''
  })
  // Typed as one line, saved as a list
  const [areasText, setAreasText] = useState('')
  const [social, setSocial] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadSettings() {
      const [{ data }, { data: brand }] = await Promise.all([
        supabase.from('company_settings').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('global_styles').select('seo_title, seo_description').eq('id', 'default').maybeSingle()
      ])
      if (data) {
        setSettings({
          company_name: data.company_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          emergency_service_notice: data.emergency_service_notice || '',
          // The website reads the search title and description from the brand settings
          seo_title: brand?.seo_title || data.seo_title || '',
          seo_description: brand?.seo_description || data.seo_description || ''
        })
        setAreasText((data.service_areas || []).join(', '))
        setSocial(data.social_links && typeof data.social_links === 'object' ? data.social_links : {})
      }
      setFetching(false)
    }
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const serviceAreas = areasText.split(/[,\n]/).map((a) => a.trim()).filter(Boolean)
    const socialLinks = Object.fromEntries(
      Object.entries(social).map(([k, v]) => [k, v.trim()]).filter(([, v]) => /^https?:\/\//i.test(v))
    )

    const { error: saveErr } = await supabase.from('company_settings').upsert({
      id: 'default',
      ...settings,
      service_areas: serviceAreas,
      social_links: socialLinks,
      updated_at: new Date().toISOString()
    })
    if (saveErr) {
      setError(saveErr.message)
      setLoading(false)
      return
    }

    const { error: brandErr } = await supabase
      .from('global_styles')
      .update({ seo_title: settings.seo_title, seo_description: settings.seo_description, updated_at: new Date().toISOString() })
      .eq('id', 'default')
    if (brandErr) {
      setError(brandErr.message)
      setLoading(false)
      return
    }

    // Public pages are cached; rebuild them so visitors and search engines see the new details now
    await fetch('/api/site/revalidate', { method: 'POST' }).catch(() => null)
    setSocial(socialLinks)
    setAreasText(serviceAreas.join(', '))
    setSuccess(true)
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
        <h1 className="text-3xl font-extrabold text-slate-900">Business Settings</h1>
        <p className="text-slate-500 mt-1">
          Contact details, service area and listings. These appear on the Contact page and in what search engines show
          for the business, so keep them exactly the same as on Google Business Profile.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4 flex items-center">
            <Settings className="mr-2 text-slate-400" size={18} />
            Contact Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="space-y-1.5 block">
              <span className={label}>Business name</span>
              <input type="text" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} className={`${input} font-semibold`} required />
            </label>
            <label className="space-y-1.5 block">
              <span className={label}>Phone</span>
              <input type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className={input} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="space-y-1.5 block">
              <span className={label}>Email address</span>
              <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className={input} />
            </label>
            <label className="space-y-1.5 block">
              <span className={label}>Business address</span>
              <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className={input} placeholder="Street, City, State ZIP" />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className={label}>Emergency notice (optional)</span>
            <textarea value={settings.emergency_service_notice} onChange={(e) => setSettings({ ...settings, emergency_service_notice: e.target.value })} className={`${input} h-20`} />
          </label>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4 flex items-center">
            <MapPin className="mr-2 text-slate-400" size={18} />
            Service Area
          </h2>
          <label className="space-y-1.5 block">
            <span className={label}>Towns and cities you serve</span>
            <input type="text" value={areasText} onChange={(e) => setAreasText(e.target.value)} className={input} placeholder="e.g. Waco, Temple, Belton, Killeen" />
          </label>
          <p className="text-xs text-slate-500">
            Separate with commas, most important first. The first three are added to page titles and descriptions (for
            example &quot;Tree Removal in Waco, Temple and Belton&quot;), and all of them are shown on the Contact page and given to
            search engines.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4 flex items-center">
            <Share2 className="mr-2 text-slate-400" size={18} />
            Listings &amp; Social Profiles
          </h2>
          <p className="text-xs text-slate-500">Paste the full web address of each profile you have. Search engines use these to connect the listings to this website.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOCIAL_FIELDS.map((f) => (
              <label key={f.key} className="space-y-1.5 block">
                <span className={label}>{f.label}</span>
                <input type="url" value={social[f.key] || ''} onChange={(e) => setSocial({ ...social, [f.key]: e.target.value })} className={input} placeholder={f.placeholder} />
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-4 flex items-center">
            <Search className="mr-2 text-slate-400" size={18} />
            Home Page in Search Results
          </h2>
          <label className="space-y-1.5 block">
            <span className={label}>Search title</span>
            <input type="text" value={settings.seo_title} onChange={(e) => setSettings({ ...settings, seo_title: e.target.value })} className={input} maxLength={70} placeholder="e.g. Tree Service in Waco, TX | Trinity Enterprise" />
            <span className="block text-[11px] text-slate-400">{settings.seo_title.length}/60 recommended. Leave as the business name to have the service area added automatically.</span>
          </label>
          <label className="space-y-1.5 block">
            <span className={label}>Search description</span>
            <textarea value={settings.seo_description} onChange={(e) => setSettings({ ...settings, seo_description: e.target.value })} className={`${input} h-24`} maxLength={200} placeholder="One or two sentences about what you do and where." />
            <span className="block text-[11px] text-slate-400">{settings.seo_description.length}/155 recommended. Other pages use their own banner text.</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold">
            {success && (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 size={16} className="mr-1" /> Saved. The website now shows the new details.
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
