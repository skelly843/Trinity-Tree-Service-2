'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TreeDeciduous, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
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

      // Exact format requested: signInWithPassword({ email, password })
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        throw new Error('Login failed. Please check your credentials.')
      }

      // Double check if admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || profile?.role !== 'admin') {
        await supabase.auth.signOut()
        setError('Unauthorized access. Admin role required.')
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      console.error('Admin login error:', err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      if (error) setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-slate-900 px-6">
      <div className="p-10 bg-white shadow-2xl rounded-2xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <TreeDeciduous className="text-blue-600" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Login</h1>
          <p className="text-slate-500 mt-2"><SiteName suffix=" Management Portal" /></p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="admin@example.com"
                required
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
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
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Authenticating...
              </>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
      <div className="mt-8">
        <a href="/" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
          &larr; Back to Public Website
        </a>
      </div>
    </div>
  )
}
