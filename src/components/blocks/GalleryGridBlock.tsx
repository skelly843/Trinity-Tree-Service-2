'use client'

import { CARD_WIDTHS, responsiveImage } from '@/utils/imageUrl'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FALLBACK_GALLERY_ITEMS } from '@/utils/fallbackData'
import { fetchGalleryFilters, fetchPublicGallery, type PublicGalleryFilter } from '@/utils/galleryData'
import { ManageLink, SectionHeading } from './shared'
import { usePageData } from './PageData'
import { BeforeAfterLightbox, type BeforeAfterProject } from './BeforeAfterLightbox'
import type { BlockProps } from './types'

function Photo({ src, label, highlight, onOpen }: { src?: string; label: string; highlight?: boolean; onOpen: () => void }) {
  return (
    <div className="flex-1 space-y-2">
      <p className={`text-xs font-bold uppercase tracking-widest text-center ${highlight ? 'text-blue-600' : 'text-slate-400'}`}>
        {label}
      </p>
      <div
        className={`aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border flex items-center justify-center ${
          highlight ? 'border-blue-100 shadow-lg shadow-blue-50' : 'border-slate-100'
        }`}
      >
        {src ? (
          <button type="button" onClick={onOpen} className="w-full h-full cursor-zoom-in" aria-label={`View ${label.toLowerCase()} photo full size`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              {...responsiveImage(src, CARD_WIDTHS, '(min-width: 768px) 25vw, 50vw')}
              alt={label}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="text-slate-300 flex flex-col items-center space-y-1">
            <ImageIcon size={24} />
            <span className="text-[10px] uppercase font-bold">No Image</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GalleryGridBlock({ data, editable, update }: BlockProps) {
  // Server-loaded list paints first; the fetch below keeps it current after admin edits
  const pageData = usePageData()
  const preloaded = pageData.gallery
  const [items, setItems] = useState<any[]>(preloaded ?? [])
  const [filters, setFilters] = useState<PublicGalleryFilter[]>(pageData.galleryFilters ?? [])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(preloaded === undefined)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // Cards sit under the section heading, or directly under the page title when there is none
  const CardHeading = data.title ? 'h3' : 'h2'

  // Only offer filters that have at least one project to show
  const usedFilters = useMemo(
    () => filters.filter((f) => items.some((item) => (item.filter_ids || []).includes(f.id))),
    [filters, items]
  )
  const filterName = useMemo(() => new Map(filters.map((f) => [f.id, f.name])), [filters])
  const shown = activeFilter ? items.filter((item) => (item.filter_ids || []).includes(activeFilter)) : items

  const closeLightbox = useCallback(() => setOpenIndex(null), [])
  // The viewer steps through the projects currently shown, so it follows the chosen filter
  const projects = useMemo<BeforeAfterProject[]>(
    () =>
      shown.map((item) => ({
        title: item.title,
        details: [item.location, item.completion_date && format(new Date(item.completion_date), 'MMM yyyy')].filter(Boolean).join(' • '),
        before: item.before_image || undefined,
        after: item.after_image || undefined
      })),
    [shown]
  )

  useEffect(() => {
    const supabase = createClient()
    async function loadGallery() {
      try {
        const [{ items: rows, error }, filterRows] = await Promise.all([
          fetchPublicGallery(supabase),
          fetchGalleryFilters(supabase)
        ])
        if (error) throw new Error(error)
        setItems(rows)
        setFilters(filterRows)
      } catch (err) {
        console.warn('Failed to load gallery items:', err)
        setItems(FALLBACK_GALLERY_ITEMS)
      } finally {
        setLoading(false)
      }
    }
    loadGallery()
  }, [])

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading data={data} update={update} editable={editable} />

        {usedFilters.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10" role="group" aria-label="Filter projects">
            {[{ id: null as string | null, name: 'All' }, ...usedFilters].map((f) => {
              const on = activeFilter === f.id
              return (
                <button
                  key={f.id ?? 'all'}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  aria-pressed={on}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                    on
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {f.name}
                </button>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {shown.map((item, index) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Photo src={item.before_image} label="Before" onOpen={() => setOpenIndex(index)} />
                <Photo src={item.after_image} label="After" highlight onOpen={() => setOpenIndex(index)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <CardHeading className="text-xl font-bold text-slate-900">{item.title}</CardHeading>
                  <span className="text-xs font-semibold text-slate-400 shrink-0">
                    {item.completion_date && format(new Date(item.completion_date), 'MMM yyyy')}
                  </span>
                </div>
                {item.description && <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>}
                <div className="pt-2 flex flex-wrap gap-2">
                  {(item.filter_ids || []).length > 0
                    ? item.filter_ids.map((id: string) =>
                        filterName.has(id) ? (
                          <span key={id} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {filterName.get(id)}
                          </span>
                        ) : null
                      )
                    : item.service_category && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {item.service_category}
                        </span>
                      )}
                  {item.location && (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {item.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 italic">No published projects yet. Check back soon for our completed transformations!</p>
            </div>
          )}
        </div>

        {editable && <ManageLink href="/admin/gallery" label="Manage gallery projects" />}
      </div>

      {openIndex !== null && projects.length > 0 && (
        <BeforeAfterLightbox
          projects={projects}
          startIndex={Math.min(openIndex, projects.length - 1)}
          onClose={closeLightbox}
        />
      )}
    </section>
  )
}
