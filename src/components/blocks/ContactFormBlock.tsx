'use client'

import { trackLead } from '@/utils/tracking'
import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { InlineText } from '@/components/admin/InlineText'
import type { BlockProps } from './types'

const inputClass =
  'w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold'
const labelClass = 'text-xs font-bold text-slate-600 uppercase tracking-wider'

export default function ContactFormBlock({ data, editable, update }: BlockProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editable) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: submitErr } = await supabase.from('contact_submissions').insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          status: 'new'
        }
      ])

      if (submitErr) {
        setError(submitErr.message)
      } else {
        setSuccess(true)
        trackLead('contact')
        setFormData({ name: '', email: '', phone: '', message: '' })
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-8 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <InlineText
              element="h2"
              value={data.title || ''}
              onChange={(title) => update({ title })}
              placeholder="Form heading"
              className="text-2xl font-bold text-slate-900 block"
            />
            <InlineText
              element="p"
              value={data.intro || ''}
              onChange={(intro) => update({ intro })}
              placeholder="Optional intro text"
              className="text-slate-500 text-sm block"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="contact-name" className={labelClass}>Your Name</label>
              <input
                id="contact-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="contact-email" className={labelClass}>Email Address</label>
                <input
                  id="contact-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-phone" className={labelClass}>Phone Number (Optional)</label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClass}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-message" className={labelClass}>Message</label>
              <textarea
                id="contact-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`${inputClass} h-32`}
                placeholder="How can we help you?"
                required
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="text-xs">
                {success && (
                  <div className="flex items-center text-green-600 font-bold">
                    <CheckCircle2 size={16} className="mr-1 shrink-0" />
                    {data.successMessage || 'Message submitted successfully!'}
                  </div>
                )}
                {error && (
                  <div className="flex items-center text-red-600 font-bold">
                    <AlertCircle size={16} className="mr-1 shrink-0" />
                    {error}
                  </div>
                )}
                {editable && (
                  <div className="text-slate-500 font-semibold">
                    Success message:{' '}
                    <InlineText
                      element="span"
                      value={data.successMessage || ''}
                      onChange={(successMessage) => update({ successMessage })}
                      placeholder="Shown after sending"
                      className="text-green-700"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                <InlineText
                  element="span"
                  value={data.buttonText || 'Send Message'}
                  onChange={(buttonText) => update({ buttonText })}
                  placeholder="Button text"
                />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
