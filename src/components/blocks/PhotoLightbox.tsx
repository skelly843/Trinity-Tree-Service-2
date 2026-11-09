'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'

export interface LightboxPhoto {
  src: string
  caption: string
}

/** Full-screen photo viewer: arrows or keyboard to move, click the photo to see it at full size. */
export function PhotoLightbox({ photos, startIndex, onClose }: {
  photos: LightboxPhoto[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [zoomed, setZoomed] = useState(false)
  const photo = photos[index]
  const many = photos.length > 1

  const step = (by: number) => {
    setZoomed(false)
    setIndex((i) => (i + by + photos.length) % photos.length)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, onClose])

  const control = 'p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption}
      data-testid="photo-lightbox"
      className="fixed inset-0 z-[10002] bg-slate-950 flex flex-col text-white"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium truncate">
          {photo.caption}
          {many && <span className="text-white/60"> ({index + 1} of {photos.length})</span>}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className={control} onClick={() => setZoomed(!zoomed)} aria-label={zoomed ? 'Fit to screen' : 'View full size'}>
            {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
          <button type="button" className={control} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={`relative flex-1 min-h-0 flex ${zoomed ? 'overflow-auto' : 'items-center justify-center overflow-hidden p-4'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.caption}
          onClick={(e) => {
            e.stopPropagation()
            setZoomed(!zoomed)
          }}
          className={zoomed ? 'max-w-none m-auto cursor-zoom-out' : 'max-w-full max-h-full object-contain cursor-zoom-in'}
        />
      </div>

      {many && (
        <>
          <button
            type="button"
            className={`${control} fixed left-3 top-1/2 -translate-y-1/2`}
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            className={`${control} fixed right-3 top-1/2 -translate-y-1/2`}
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
            aria-label="Next photo"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
