'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, TreeDeciduous } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FALLBACK_SERVICES } from '@/utils/fallbackData'
import { ManageLink, SectionHeading } from './shared'
import { usePageData } from './PageData'
import type { BlockProps } from './types'

export default function ServicesGridBlock({ data, editable, update }: BlockProps) {
  // Server-loaded list paints first; the fetch below keeps it current after admin edits
  const preloaded = usePageData().services
  const [services, setServices] = useState<any[]>(preloaded ?? [])
  const [loading, setLoading] = useState(preloaded === undefined)
  const limit = Number(data.limit) || 0
  // Cards sit under the section heading, or directly under the page title when there is none
  const CardHeading = data.title ? 'h3' : 'h2'

  useEffect(() => {
    const supabase = createClient()
    async function loadServices() {
      try {
        const { data: rows, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
        if (error) throw error
        setServices(rows || [])
      } catch (err) {
        console.warn('Failed to fetch services:', err)
        setServices(FALLBACK_SERVICES)
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  const shown = limit > 0 ? services.slice(0, limit) : services

  return (
    <section id="services" className="py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading data={data} update={update} editable={editable} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shown.map((service) => (
            <div
              key={service.id}
              className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="aspect-video w-full rounded-xl bg-slate-100 overflow-hidden border border-slate-100 flex items-center justify-center text-blue-300">
                  {service.featured_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.featured_image} alt={service.title} className="w-full h-full object-cover" />
                  ) : (
                    <TreeDeciduous size={32} />
                  )}
                </div>
                <CardHeading className="text-xl font-bold text-slate-900">{service.title}</CardHeading>
                <p className="text-slate-600 text-sm line-clamp-3">{service.short_description}</p>
              </div>

              <div className="flex items-center justify-between mt-6 border-t border-slate-100 pt-4 gap-3">
                {service.price_range && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{service.price_range}</span>
                )}
                <Link
                  href={`/services/${service.slug}`}
                  className="flex items-center text-blue-600 font-bold text-sm ml-auto hover:underline"
                >
                  <span>Learn More<span className="sr-only"> about {service.title}</span></span>
                  <ChevronRight size={16} className="ml-1" />
                </Link>
              </div>
            </div>
          ))}

          {services.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 italic">No published services found. Please check back later or contact us directly.</p>
            </div>
          )}
        </div>

        {editable && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs font-bold text-slate-600">
            <label className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => update({ limit: Number(e.target.value) })}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white"
              >
                <option value={0}>all services</option>
                {[3, 6, 9].map((n) => (
                  <option key={n} value={n}>
                    first {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {editable && <ManageLink href="/admin/services" label="Manage services" />}
      </div>
    </section>
  )
}
