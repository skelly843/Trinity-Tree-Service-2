'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      if (!supabase || !supabase.auth) {
        throw new Error('Authentication service is unavailable.')
      }

      // Exact implementation requested by user
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signupError) {
        setError(signupError.message)
      } else if (data.user) {
        setSuccess(true)
      } else {
        throw new Error('Failed to create account. Please try again.')
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 px-6">
        <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md text-center border border-slate-200">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-3xl font-extrabold mb-4 text-slate-900">Check your email</h1>
          <p className="text-slate-600 leading-relaxed">
            We've sent a verification link to <span className="font-bold text-slate-900">{email}</span>. Please click the link to confirm your email. Our office will then approve your account before you can use the portal.
          </p>
          <a href="/login" className="mt-8 inline-block font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Return to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 px-6">
      <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200">
        <h1 className="text-3xl font-extrabold mb-2 text-center text-slate-900 tracking-tight">Create Account</h1>
        <p className="text-slate-500 text-center mb-8">Join the <SiteName /> service portal</p>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="name@example.com"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start space-x-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all transform active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Creating account...
              </>
            ) : 'Sign up'}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-blue-600 hover:underline">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
