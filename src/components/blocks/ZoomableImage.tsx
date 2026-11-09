'use client'

import { useCallback, useState } from 'react'
import { PhotoLightbox } from './PhotoLightbox'

/** A photo visitors can click to see full screen, closed with the X, Esc or a click outside. */
export function ZoomableImage({ src, alt = '', className = 'w-full h-full object-cover' }: { src: string; alt?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full h-full cursor-zoom-in transition-opacity hover:opacity-90"
        aria-label={alt ? `View full size: ${alt}` : 'View photo full size'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open && <PhotoLightbox photos={[{ src, caption: alt }]} startIndex={0} onClose={close} />}
    </>
  )
}
