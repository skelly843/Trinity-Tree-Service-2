'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { TreeDeciduous, ArrowLeft, Loader2, Save, CheckCircle2, AlertCircle, User } from 'lucide-react'

export default function CustomerProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    avatarUrl: ''
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          setFormData({
            fullName: data.full_name || '',
            phone: data.phone || '',
            avatarUrl: data.avatar_url || ''
          })
        }
      }
      setFetching(false)
    }
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        full_name: formData.fullName,
        phone: formData.phone,
        avatar_url: formData.avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
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

      <main className="max-w-xl mx-auto px-6 py-12 w-full space-y-6">
        <Link href="/portal" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-50">
            <User className="text-blue-600" size={24} />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile Settings</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Avatar / Photo URL</label>
              <input
                type="text"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="text-xs font-bold">
                {success && (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle2 size={16} className="mr-1" /> Profile updated successfully!
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md text-xs disabled:opacity-50 flex items-center space-x-1"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
