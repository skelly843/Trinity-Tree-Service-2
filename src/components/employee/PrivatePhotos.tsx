'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { resolveStoredFileUrl } from '@/utils/storedFiles'
import { ZoomableImage } from '@/components/blocks/ZoomableImage'

/** Thumbnails of a customer's private photos; tap one to see it full size. */
export function PrivatePhotos({ photos }: { photos: { ref: string; caption: string }[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    Promise.all(
      photos.map(async (p) => {
        try {
          return [p.ref, await resolveStoredFileUrl(supabase, p.ref)] as const
        } catch {
          return [p.ref, null] as const
        }
      })
    ).then((pairs) => {
      if (cancelled) return
      setUrls(Object.fromEntries(pairs.filter(([, url]) => url) as [string, string][]))
    })
    return () => {
      cancelled = true
    }
  }, [photos])

  if (!photos.length) return <p className="text-sm text-slate-400">No photos yet.</p>

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {photos.map((p) => (
        <div key={p.ref} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
          {urls[p.ref] ? <ZoomableImage src={urls[p.ref]} alt={p.caption} /> : <div className="w-full h-full animate-pulse" />}
        </div>
      ))}
    </div>
  )
}
