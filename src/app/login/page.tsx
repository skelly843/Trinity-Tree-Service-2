'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Loader2, Lock, Mail, TreeDeciduous } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      if (!supabase || !supabase.auth) {
        throw new Error('Authentication service is unavailable.')
      }

      // Exact signUp / signIn directives applied here
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
      } else if (authData.user) {
        // Fetch user role to decide redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()

        const role = profile?.role || 'customer'
        if (role === 'admin' || role === 'global_admin') {
          router.push('/admin')
        } else if (role === 'employee') {
          router.push('/employee')
        } else {
          router.push('/portal')
        }
        router.refresh()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 px-6">
      <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
            <TreeDeciduous size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Portal Login</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your <SiteName /> services</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="name@example.com"
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start space-x-2">
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
                Logging in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <Link href="/signup" className="font-bold text-blue-600 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
      <div className="mt-8">
        <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          &larr; Back to Public Website
        </Link>
      </div>
    </div>
  )
}
