'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FALLBACK_GALLERY_ITEMS } from '@/utils/fallbackData'
import { ManageLink, SectionHeading } from './shared'
import { PhotoLightbox, type LightboxPhoto } from './PhotoLightbox'
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
            <img src={src} alt={label} className="w-full h-full object-cover" />
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
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openSrc, setOpenSrc] = useState<string | null>(null)

  const closeLightbox = useCallback(() => setOpenSrc(null), [])
  const photos = useMemo<LightboxPhoto[]>(
    () =>
      items.flatMap((item) => [
        ...(item.before_image ? [{ src: item.before_image, caption: `${item.title} – Before` }] : []),
        ...(item.after_image ? [{ src: item.after_image, caption: `${item.title} – After` }] : [])
      ]),
    [items]
  )

  useEffect(() => {
    const supabase = createClient()
    async function loadGallery() {
      try {
        const { data: rows, error } = await supabase
          .from('gallery_items')
          .select('*')
          .eq('is_published', true)
          .eq('is_private', false)
          .order('sort_order', { ascending: true })
        if (error) throw error
        setItems(rows || [])
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Photo src={item.before_image} label="Before" onOpen={() => setOpenSrc(item.before_image)} />
                <Photo src={item.after_image} label="After" highlight onOpen={() => setOpenSrc(item.after_image)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  <span className="text-xs font-semibold text-slate-400 shrink-0">
                    {item.completion_date && format(new Date(item.completion_date), 'MMM yyyy')}
                  </span>
                </div>
                {item.description && <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>}
                <div className="pt-2 flex flex-wrap gap-2">
                  {item.service_category && (
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
              <p className="text-slate-400 italic">No published projects yet. Check back soon for our completed transformations!</p>
            </div>
          )}
        </div>

        {editable && <ManageLink href="/admin/gallery" label="Manage gallery projects" />}
      </div>

      {openSrc && (
        <PhotoLightbox
          photos={photos}
          startIndex={Math.max(0, photos.findIndex((p) => p.src === openSrc))}
          onClose={closeLightbox}
        />
      )}
    </section>
  )
}
