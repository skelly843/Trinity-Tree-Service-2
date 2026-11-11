'use client'

import { AgreeToTerms } from '@/components/AgreeToTerms'
import { trackLead } from '@/utils/tracking'
import React, { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { InlineText } from '@/components/admin/InlineText'
import type { BlockProps } from './types'

const inputClass =
  'w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
const labelClass = 'text-xs font-bold text-slate-600 uppercase tracking-wider'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  serviceRequested: '',
  problemDescription: '',
  preferredDate: '',
  preferredTimeWindow: 'any_time',
  isEmergency: false,
  // Texting consent must be given by the customer, so the box starts unchecked
  permissionToContact: false
}

export default function RequestFormBlock({ data, editable, update }: BlockProps) {
  const [loading, setLoading] = useState(false)
  // Steps sit under the form heading, or directly under the page title when there is none
  const StepHeading = data.title ? 'h3' : 'h2'
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    const supabase = createClient()
    async function loadServices() {
      try {
        const { data: rows } = await supabase
          .from('services')
          .select('title')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
        if (rows) setServices(rows)
      } catch (err) {
        console.warn('Failed to load services for request form:', err)
      }
    }
    loadServices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editable) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      // Attempt to associate with an existing customer with matching email
      let matchedCustomerId: string | null = null
      const { data: matchedCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', formData.email.trim().toLowerCase())
        .limit(1)
        .maybeSingle()

      if (matchedCustomer) {
        matchedCustomerId = matchedCustomer.id
      }

      const { error: requestErr } = await supabase.from('service_requests').insert([
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          service_requested: formData.serviceRequested,
          problem_description: formData.problemDescription,
          preferred_date: formData.preferredDate || null,
          preferred_time_window: formData.preferredTimeWindow,
          is_emergency: formData.isEmergency,
          permission_to_contact: formData.permissionToContact,
          status: 'new',
          customer_id: matchedCustomerId
        }
      ])

      if (requestErr) {
        setError(requestErr.message)
      } else {
        setSuccess(true)
        trackLead('service_request', formData.isEmergency)
        setFormData(EMPTY_FORM)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: formData[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFormData({ ...formData, [key]: e.target.value })
  })

  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {(editable || data.title || data.intro) && (
            <div className="px-8 pt-8 space-y-2">
              <InlineText
                element="h2"
                value={data.title || ''}
                onChange={(title) => update({ title })}
                placeholder="Optional form heading"
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
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Personal Details */}
            <div className="space-y-4">
              <StepHeading className="font-bold text-slate-900 border-b border-slate-100 pb-2">1. Personal Information</StepHeading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="rq-first" className={labelClass}>First Name</label>
                  <input id="rq-first" type="text" {...field('firstName')} className={inputClass} placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="rq-last" className={labelClass}>Last Name</label>
                  <input id="rq-last" type="text" {...field('lastName')} className={inputClass} placeholder="Doe" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="rq-email" className={labelClass}>Email Address</label>
                  <input id="rq-email" type="email" {...field('email')} className={inputClass} placeholder="john@example.com" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="rq-phone" className={labelClass}>Phone Number</label>
                  <input id="rq-phone" type="tel" {...field('phone')} className={inputClass} placeholder="(555) 555-5555" required />
                </div>
              </div>
            </div>

            {/* Service Address */}
            <div className="space-y-4">
              <StepHeading className="font-bold text-slate-900 border-b border-slate-100 pb-2">2. Service Address</StepHeading>
              <div className="space-y-2">
                <label htmlFor="rq-address" className={labelClass}>Street Address</label>
                <input id="rq-address" type="text" {...field('address')} className={inputClass} placeholder="123 Main St" required />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-2">
                  <label htmlFor="rq-city" className={labelClass}>City</label>
                  <input id="rq-city" type="text" {...field('city')} className={inputClass} placeholder="Waco" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="rq-state" className={labelClass}>State</label>
                  <input id="rq-state" type="text" {...field('state')} className={inputClass} placeholder="CA" required />
                </div>
              </div>
              <div className="w-1/2 space-y-2">
                <label htmlFor="rq-zip" className={labelClass}>ZIP Code</label>
                <input id="rq-zip" type="text" {...field('zipCode')} className={inputClass} placeholder="76701" required />
              </div>
            </div>

            {/* Service Requirements */}
            <div className="space-y-4">
              <StepHeading className="font-bold text-slate-900 border-b border-slate-100 pb-2">3. Service Requested & Issue</StepHeading>
              <div className="space-y-2">
                <label htmlFor="rq-service" className={labelClass}>Service Type</label>
                <select id="rq-service" {...field('serviceRequested')} className={`${inputClass} py-2.5 bg-white`} required>
                  <option value="">-- Select a Service offering --</option>
                  {services.map((svc) => (
                    <option key={svc.title} value={svc.title}>
                      {svc.title}
                    </option>
                  ))}
                  {/* Used only until services are added in the Services Manager */}
                  {services.length === 0 &&
                    ['Tree Removal', 'Tree Trimming & Pruning', 'Stump Grinding', 'Storm Damage Cleanup', 'Land Clearing'].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  <option value="Other / Custom Request">Other / Custom Request</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="rq-problem" className={labelClass}>Problem Description</label>
                <textarea
                  id="rq-problem"
                  {...field('problemDescription')}
                  className={`${inputClass} h-28`}
                  placeholder="Tell us about the trees: what kind, about how tall, where they are, any damage, and how to get into the yard..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="rq-date" className={labelClass}>Preferred Date</label>
                  <input id="rq-date" type="date" {...field('preferredDate')} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="rq-window" className={labelClass}>Preferred Time Window</label>
                  <select id="rq-window" {...field('preferredTimeWindow')} className={`${inputClass} py-2.5 bg-white`}>
                    <option value="any_time">Any Time (7:00 AM - 6:00 PM)</option>
                    <option value="morning">Morning (7:00 AM - 12:00 PM)</option>
                    <option value="afternoon">Afternoon (12:00 PM - 4:00 PM)</option>
                    <option value="evening">Evening (4:00 PM - 6:00 PM)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <input
                  type="checkbox"
                  id="isEmergency"
                  checked={formData.isEmergency}
                  onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                  className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500 shrink-0 mt-0.5"
                />
                <div>
                  <label htmlFor="isEmergency" className="text-sm font-bold text-red-900 cursor-pointer flex items-center">
                    <ShieldAlert size={16} className="mr-1.5 shrink-0" />
                    This is an Emergency Tree Service Request
                  </label>
                  <p className="text-red-700 text-xs mt-1">
                    Select this if a tree has fallen on a home, vehicle or power line, is blocking a road or driveway, or could fall at any moment.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <input
                  type="checkbox"
                  id="permissionToContact"
                  checked={formData.permissionToContact}
                  onChange={(e) => setFormData({ ...formData, permissionToContact: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="permissionToContact" className="text-xs font-bold text-slate-700 cursor-pointer">
                  I agree to receive calls and text messages about this request, including automated texts. Consent is not required to get
                  service. Message and data rates may apply. Reply STOP to opt out.
                </label>
              </div>
            </div>

            {/* Status + submit */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-4">
              <div className="text-xs font-bold">
                <div className="font-normal mb-1">
                  <AgreeToTerms action="sending this request" />
                </div>
                {success && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 size={18} className="mr-1 shrink-0" />
                    {data.successMessage || 'Booking request submitted! We will contact you soon.'}
                  </div>
                )}
                {error && (
                  <div className="flex items-center text-red-600">
                    <AlertCircle size={18} className="mr-1 shrink-0" />
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
                      placeholder="Shown after submitting"
                      className="text-green-700"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                <InlineText
                  element="span"
                  value={data.buttonText || 'Submit Service Request'}
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
