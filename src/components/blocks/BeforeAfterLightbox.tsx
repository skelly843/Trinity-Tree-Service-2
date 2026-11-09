'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface BeforeAfterProject {
  title: string
  details?: string
  before?: string
  after?: string
}

function Side({ src, label, highlight }: { src?: string; label: string; highlight?: boolean }) {
  return (
    <figure className="flex-1 min-w-0 min-h-0 flex flex-col gap-2">
      <figcaption className={`text-xs font-bold uppercase tracking-widest text-center ${highlight ? 'text-blue-300' : 'text-white/70'}`}>
        {label}
      </figcaption>
      <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl bg-white/5">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="max-w-full max-h-full object-contain rounded-xl" />
        ) : (
          <span className="text-sm text-white/50 py-16">No {label.toLowerCase()} photo</span>
        )}
      </div>
    </figure>
  )
}

/**
 * Full-screen gallery viewer showing one project's before and after photos side by side.
 * Arrows (on screen or keyboard) move between projects; X, Esc or a click outside closes it.
 */
export function BeforeAfterLightbox({ projects, startIndex, onClose }: {
  projects: BeforeAfterProject[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const project = projects[index]
  const many = projects.length > 1

  useEffect(() => {
    const step = (by: number) => setIndex((i) => (i + by + projects.length) % projects.length)
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
  }, [projects.length, onClose])

  if (!project) return null

  const arrow = 'shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white'
  const step = (by: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((i) => (i + by + projects.length) % projects.length)
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title}: before and after`}
      data-testid="before-after-lightbox"
      className="fixed inset-0 z-[10002] bg-slate-950 flex flex-col text-white"
      onClick={onClose}
    >
      <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-2 shrink-0">
        <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
          <p className="font-bold truncate">{project.title}</p>
          {project.details && <p className="text-sm text-white/60 truncate">{project.details}</p>}
          {many && <p className="text-xs text-white/50 mt-0.5">Project {index + 1} of {projects.length}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/25"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center gap-2 sm:gap-4 px-2 sm:px-4 pb-4">
        {many && (
          <button type="button" className={arrow} onClick={step(-1)} aria-label="Previous project">
            <ChevronLeft size={26} />
          </button>
        )}
        <div className="flex-1 min-w-0 h-full flex flex-col md:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
          <Side src={project.before} label="Before" />
          <Side src={project.after} label="After" highlight />
        </div>
        {many && (
          <button type="button" className={arrow} onClick={step(1)} aria-label="Next project">
            <ChevronRight size={26} />
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
