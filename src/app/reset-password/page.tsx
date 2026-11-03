'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2, Lock, TreeDeciduous } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return;
    }

    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateErr) {
        setError(updateErr.message)
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-slate-50 px-6">
      <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md border border-slate-200 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600 mx-auto">
          <TreeDeciduous size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reset Password</h1>
        <p className="text-slate-500 mt-2 font-medium mb-8">Enter your new secure password below</p>

        {success ? (
          <div className="space-y-6">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link href="/login" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
              Proceed to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
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
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              <span>Update Password</span>
            </button>
          </form>
        )}

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <Link href="/login" className="text-sm font-bold text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
