'use client'

import React, { useEffect, useState } from 'react'
import { Clock, Mail, Map as MapIcon, MapPin, Phone, ShieldAlert } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { InlineText } from '@/components/admin/InlineText'
import ServiceAreaMap, { type ServiceRadius } from '@/components/ServiceAreaMapLazy'
import { ManageLink } from './shared'
import type { BlockProps } from './types'

const DEFAULT_SETTINGS = {
  phone: '',
  email: '',
  address: '',
  emergency_service_notice:
    'Tree down on your home, car or driveway after a storm? Call us and our crew will respond as fast as we can.',
  service_areas: [] as string[],
  business_hours_text: 'Monday - Friday: 7:00 AM - 6:00 PM\nSaturday: 8:00 AM - 4:00 PM\nSunday: Closed'
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-bold text-slate-900 text-sm">{label}</p>
        <div className="mt-1 text-sm break-words">{children}</div>
      </div>
    </div>
  )
}

export default function ContactInfoBlock({ data, editable, update }: BlockProps) {
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS)

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient()
        const { data: row, error } = await supabase.from('company_settings').select('*').eq('id', 'default').maybeSingle()
        if (error) throw error
        if (row) setSettings({ ...DEFAULT_SETTINGS, ...Object.fromEntries(Object.entries(row).filter(([, v]) => v != null)) })
      } catch (err: any) {
        console.warn('Failed to fetch contact settings:', err?.message)
      }
    }
    loadSettings()
  }, [])

  const areas: string[] = Array.isArray(settings.service_areas) ? settings.service_areas : []
  const seasonal: string[] = Array.isArray(settings.seasonal_areas) ? settings.seasonal_areas : []
  const radius: ServiceRadius | null =
    settings.service_radius && typeof settings.service_radius.lat === 'number' ? settings.service_radius : null

  return (
    <section className="pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="max-w-2xl space-y-3">
          <InlineText
            element="h2"
            value={data.title || ''}
            onChange={(title) => update({ title })}
            placeholder="Heading"
            className="text-2xl md:text-3xl font-bold text-slate-900 block"
          />
          <InlineText
            element="p"
            value={data.body || ''}
            onChange={(body) => update({ body })}
            placeholder="Intro text"
            className="text-slate-500 font-medium block"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard icon={<Phone size={18} />} label="Phone Number">
            {settings.phone ? (
              <a href={`tel:${String(settings.phone).replace(/[^d+]/g, '')}`} className="text-blue-600 font-bold hover:underline">
                {settings.phone}
              </a>
            ) : null}
          </InfoCard>
          <InfoCard icon={<Mail size={18} />} label="Email Address">
            {settings.email ? (
              <a href={`mailto:${settings.email}`} className="text-blue-600 font-bold hover:underline break-all">
                {settings.email}
              </a>
            ) : null}
          </InfoCard>
          <InfoCard icon={<MapPin size={18} />} label="Business Address">
            <p className="font-semibold text-slate-600">{settings.address}</p>
          </InfoCard>
          <InfoCard icon={<Clock size={18} />} label="Business Hours">
            <p className="font-medium whitespace-pre-line leading-relaxed text-slate-500">{settings.business_hours_text}</p>
          </InfoCard>
        </div>

        {radius && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MapIcon size={18} className="text-blue-600" />
              <span>
                We serve within {Math.round(radius.miles)} miles of {radius.label || 'our base'}
              </span>
            </h3>
            <ServiceAreaMap area={radius} />
            {seasonal.length > 0 && (
              <p className="text-sm text-slate-600">
                <span className="font-bold text-slate-800">Seasonal and storm response: </span>
                {seasonal.join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!radius && seasonal.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Seasonal and storm response</h3>
              <p className="text-sm text-slate-600">{seasonal.join(', ')}</p>
            </div>
          )}
          {areas.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MapIcon size={16} className="text-blue-600" />
                <span>Main Cities We Serve</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {areas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 uppercase tracking-wider"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {settings.social_links?.google_review && (
            <a
              href={settings.social_links.google_review}
              target="_blank"
              rel="noreferrer"
              className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 text-amber-900 hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                ★
              </span>
              <span>
                <span className="block font-bold text-sm">Worked with us? Leave a Google review</span>
                <span className="block text-xs">It takes a minute and helps others find us.</span>
              </span>
            </a>
          )}

          {settings.emergency_service_notice && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-red-900 text-sm">Storm & Emergency Tree Service</h3>
                <p className="text-red-700 text-xs leading-relaxed font-semibold">{settings.emergency_service_notice}</p>
              </div>
            </div>
          )}
        </div>

        {editable && <ManageLink href="/admin/settings" label="Edit phone, email, service area and map in Business Settings" />}
      </div>
    </section>
  )
}
