'use client'

import { AgreeToTerms } from '@/components/AgreeToTerms'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { SiteName } from '@/components/SiteTheme'

type Stage = 'checking' | 'form' | 'done' | 'invalid'

/**
 * Where the invitation email lands. Supabase sends the customer here signed in
 * (the session arrives in the link); they choose a password, then wait for approval.
 */
export default function AcceptInvitePage() {
  const [stage, setStage] = useState<Stage>('checking')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function start() {
      try {
        // Invitation links carry the session after # (or an error, if the link expired)
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        if (hash.get('error')) {
          setError(
            hash.get('error_code') === 'otp_expired'
              ? 'This invitation link has expired or was already used. Ask us to send a new one.'
              : hash.get('error_description') || 'This invitation link is not valid.'
          )
          setStage('invalid')
          return
        }
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (sessionError) throw sessionError
          window.history.replaceState(null, '', window.location.pathname)
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('This invitation link is not valid. Ask us to send a new one.')
          setStage('invalid')
          return
        }
        setEmail(user.email || '')
        setFullName((user.user_metadata?.full_name as string) || '')
        setStage('form')
      } catch (err: any) {
        setError(err?.message || 'This invitation link is not valid.')
        setStage('invalid')
      }
    }
    start()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() }
      })
      if (updateError) throw updateError
      if (user && fullName.trim()) {
        await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id)
      }
      setStage('done')
    } catch (err: any) {
      setError(err?.message || 'Your password could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 px-6">
      <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600 mx-auto">
          <KeyRound size={30} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center">Create your login</h1>
        <p className="text-slate-500 mt-2 text-center mb-8">
          You were invited to the <SiteName /> customer portal.
        </p>

        {stage === 'checking' && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        )}

        {stage === 'invalid' && (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-start gap-2 text-left">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">Go to the login page</Link>
          </div>
        )}

        {stage === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Email</span>
              <input value={email} disabled className={`${input} bg-slate-50 text-slate-500`} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Your name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" className={input} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Choose a password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={input} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Type it again</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" className={input} />
            </label>
            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
            )}
            <AgreeToTerms action="creating your login" />
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold disabled:opacity-60"
            >
              {saving && <Loader2 className="animate-spin" size={18} />}
              Create my login
            </button>
          </form>
        )}

        {stage === 'done' && (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-slate-600 leading-relaxed">
              Your login is created. Our office will confirm your account shortly. You can then see your estimates,
              invoices, documents and messages in the portal.
            </p>
            <Link href="/portal" className="inline-block font-bold text-blue-600 hover:text-blue-700">Go to the portal</Link>
          </div>
        )}
      </div>
    </div>
  )
}
