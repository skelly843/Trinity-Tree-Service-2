'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ChevronRight, TreeDeciduous, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FALLBACK_SERVICES } from '@/utils/fallbackData'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { InlineText } from '@/components/admin/InlineText'
import { EditableImage, ManageLink, SectionHeading } from './shared'
import { usePageData } from './PageData'
import type { BlockProps } from './types'

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'service'

export default function ServicesGridBlock({ data, editable, update }: BlockProps) {
  // Server-loaded list paints first; the fetch below keeps it current after admin edits
  const preloaded = usePageData().services
  const { showToast, refreshPublicPages } = useWebsiteBuilder()
  const [services, setServices] = useState<any[]>(preloaded ?? [])
  const [loading, setLoading] = useState(preloaded === undefined)
  // Bumped after a failed save so the text fields reset to the saved wording
  const [resetKey, setResetKey] = useState(0)
  const limit = Number(data.limit) || 0
  // Cards sit under the section heading, or directly under the page title when there is none
  const CardHeading = data.title ? 'h3' : 'h2'

  const loadServices = useCallback(async () => {
    try {
      // While editing, hidden services are listed too so they can be shown again
      let query = createClient().from('services').select('*').order('sort_order', { ascending: true })
      if (!editable) query = query.eq('is_published', true)
      const { data: rows, error } = await query
      if (error) throw error
      setServices(rows || [])
    } catch (err) {
      console.warn('Failed to fetch services:', err)
      setServices(FALLBACK_SERVICES)
    } finally {
      setLoading(false)
    }
  }, [editable])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  // Service cards are shared records, not part of the page draft: changes save and go live right away
  const saveService = async (id: string, patch: Record<string, any>, message = 'Service saved — visitors now see it.') => {
    const previous = services
    setServices((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    let problem: string | null = null
    try {
      const { data: saved, error } = await createClient().from('services').update(patch).eq('id', id).select('id')
      if (error) problem = error.message
      else if (!saved?.length) problem = 'you do not have access to change services.'
    } catch (err: any) {
      problem = err?.message || 'the database could not be reached.'
    }
    if (problem) {
      setServices(previous)
      setResetKey((k) => k + 1)
      showToast('error', `Service not saved: ${problem}`)
      return
    }
    await refreshPublicPages()
    showToast('success', message)
  }

  const moveService = async (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= services.length) return
    const reordered = [...services]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    const numbered = reordered.map((s, i) => ({ ...s, sort_order: (i + 1) * 10 }))
    setServices(numbered)
    const supabase = createClient()
    const results = await Promise.all(
      numbered.map((s) => supabase.from('services').update({ sort_order: s.sort_order }).eq('id', s.id))
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) {
      showToast('error', `Order not saved: ${failed.error.message}`)
      loadServices()
      return
    }
    await refreshPublicPages()
    showToast('success', 'Service order saved.')
  }

  const addService = async () => {
    const title = 'New service'
    const { data: created, error } = await createClient()
      .from('services')
      .insert([
        {
          title,
          slug: `${slugify(title)}-${Date.now().toString(36)}`,
          short_description: '',
          is_published: false,
          sort_order: (services.length + 1) * 10
        }
      ])
      .select('*')
      .single()
    if (error || !created) {
      showToast('error', `Service not added: ${error?.message || 'unknown error'}`)
      return
    }
    setServices((list) => [...list, created])
    showToast('success', 'Service added. It stays hidden until you click Show.')
  }

  const deleteService = async (service: any) => {
    if (!window.confirm(`Delete the "${service.title}" service? This cannot be undone.`)) return
    const { error } = await createClient().from('services').delete().eq('id', service.id)
    if (error) {
      showToast('error', `Service not deleted: ${error.message}`)
      return
    }
    setServices((list) => list.filter((s) => s.id !== service.id))
    await refreshPublicPages()
    showToast('success', 'Service deleted.')
  }

  const shown = limit > 0 && !editable ? services.slice(0, limit) : services
  const control = 'p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-600 hover:text-blue-600 shadow-sm disabled:opacity-30'

  return (
    <section id="services" className="py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading data={data} update={update} editable={editable} />

        {editable && (
          <p className="mb-6 text-center text-xs font-medium text-slate-500">
            Click a service&apos;s title, description or price label to change it. Service changes save and go live right away.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shown.map((service, index) => (
            <div
              key={service.id}
              className={`group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-50 transition-all flex flex-col justify-between ${
                editable && !service.is_published ? 'opacity-60' : ''
              }`}
            >
              {editable && (
                <div className="absolute -top-3 right-3 z-30 flex items-center gap-1">
                  {!service.is_published && (
                    <span className="px-2 py-1 rounded bg-amber-500 text-white text-[10px] font-bold uppercase">Hidden</span>
                  )}
                  <button type="button" className={control} onClick={() => moveService(index, -1)} disabled={index === 0} title="Move earlier" aria-label="Move earlier">
                    <ArrowLeft size={14} />
                  </button>
                  <button type="button" className={control} onClick={() => moveService(index, 1)} disabled={index === shown.length - 1} title="Move later" aria-label="Move later">
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className={control}
                    onClick={() =>
                      saveService(
                        service.id,
                        { is_published: !service.is_published },
                        service.is_published ? 'Service hidden from visitors.' : 'Service is now showing to visitors.'
                      )
                    }
                    title={service.is_published ? 'Hide from visitors' : 'Show to visitors'}
                    aria-label={service.is_published ? 'Hide from visitors' : 'Show to visitors'}
                  >
                    {service.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button type="button" className={`${control} hover:text-red-600`} onClick={() => deleteService(service)} title="Delete service" aria-label="Delete service">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <EditableImage
                  src={service.featured_image || ''}
                  alt={service.title}
                  editable={editable}
                  aspect={16 / 9}
                  onChange={(featured_image) => saveService(service.id, { featured_image: featured_image || null })}
                  className="aspect-video w-full rounded-xl bg-slate-100 overflow-hidden border border-slate-100 flex items-center justify-center"
                  fallback={<TreeDeciduous size={32} className="text-blue-300" />}
                />
                {editable ? (
                  <>
                    <InlineText
                      key={`title-${resetKey}`}
                      element="h3"
                      value={service.title || ''}
                      onChange={(title) => title.trim() && saveService(service.id, { title: title.trim() })}
                      placeholder="Service name"
                      className="text-xl font-bold text-slate-900 block"
                    />
                    <InlineText
                      key={`desc-${resetKey}`}
                      element="p"
                      value={service.short_description || ''}
                      onChange={(short_description) => saveService(service.id, { short_description })}
                      placeholder="Short description of this service"
                      className="text-slate-600 text-sm block"
                    />
                  </>
                ) : (
                  <>
                    <CardHeading className="text-xl font-bold text-slate-900">{service.title}</CardHeading>
                    <p className="text-slate-600 text-sm line-clamp-3">{service.short_description}</p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mt-6 border-t border-slate-100 pt-4 gap-3">
                {editable ? (
                  <InlineText
                    key={`price-${resetKey}`}
                    element="span"
                    value={service.price_range || ''}
                    onChange={(price_range) => saveService(service.id, { price_range: price_range.trim() || null })}
                    placeholder="Price label"
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full"
                  />
                ) : (
                  service.price_range && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{service.price_range}</span>
                  )
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

          {editable && (
            <button
              type="button"
              onClick={addService}
              className="min-h-[16rem] rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 flex flex-col items-center justify-center gap-2 font-bold text-sm"
            >
              <Plus size={24} />
              Add a service
            </button>
          )}

          {services.length === 0 && !loading && !editable && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 italic">No published services found. Please check back later or contact us directly.</p>
            </div>
          )}
        </div>

        {editable && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs font-bold text-slate-600">
            <label className="flex items-center gap-2">
              <span>On this page, show</span>
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
        {editable && <ManageLink href="/admin/services" label="Full service details (long description, extra photos)" />}
      </div>
    </section>
  )
}
