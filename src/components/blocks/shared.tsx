'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Droplet,
  ImagePlus,
  Link2,
  Shield,
  Star,
  Trash2,
  Wrench,
  X
} from 'lucide-react'
import { InlineText } from '@/components/admin/InlineText'
import { ImageCropperModal } from '@/components/admin/ImageCropperModal'
import { ZoomableImage } from './ZoomableImage'

// ---------- icons for feature cards ----------

export const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  shield: Shield,
  award: Award,
  droplet: Droplet,
  clock: Clock,
  calendar: Calendar,
  dollar: DollarSign,
  wrench: Wrench,
  check: CheckCircle2,
  star: Star,
  compass: Compass
}
const ICON_KEYS = Object.keys(ICONS)

export function nextIcon(current: string | undefined): string {
  const i = ICON_KEYS.indexOf(current || '')
  return ICON_KEYS[(i + 1) % ICON_KEYS.length]
}

// ---------- array helpers for repeatable items ----------

export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export function patchItem<T extends object>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item))
}

// ---------- section heading ----------

export const SectionHeading: React.FC<{
  data: any
  update: (patch: Record<string, any>) => void
  editable: boolean
  dark?: boolean
}> = ({ data, update, editable, dark }) => {
  if (!editable && !data.title && !data.subtitle) return null
  return (
    <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
      <InlineText
        element="h2"
        value={data.title || ''}
        onChange={(title) => update({ title })}
        placeholder="Section title"
        className={`text-3xl md:text-4xl font-extrabold tracking-tight block ${dark ? 'text-white' : 'text-slate-900'}`}
      />
      <InlineText
        element="p"
        value={data.subtitle || ''}
        onChange={(subtitle) => update({ subtitle })}
        placeholder="Optional subtitle"
        className={`text-base block ${dark ? 'text-slate-300' : 'text-slate-500'}`}
      />
    </div>
  )
}

// ---------- replaceable image ----------

export const EditableImage: React.FC<{
  src: string
  alt?: string
  editable: boolean
  onChange: (url: string) => void
  className?: string
  imgClassName?: string
  aspect?: number
  /** shown to visitors when there is no image; defaults to nothing */
  fallback?: React.ReactNode
  label?: string
}> = ({ src, alt = '', editable, onChange, className = '', imgClassName = 'w-full h-full object-cover', aspect, fallback = null, label = 'Replace photo' }) => {
  const [open, setOpen] = useState(false)

  if (!editable && !src) return fallback ? <div className={className}>{fallback}</div> : null

  return (
    <div className={`relative ${className}`}>
      {src && !editable ? (
        // Visitors can click any photo to see it full size
        <ZoomableImage src={src} alt={alt} className={imgClassName} />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={imgClassName} />
      ) : (
        <div className="w-full h-full min-h-[8rem] flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 border-2 border-dashed border-slate-300 rounded-[inherit]">
          {fallback || <ImagePlus size={28} />}
          <span className="text-[10px] font-bold uppercase tracking-wider">No photo yet</span>
        </div>
      )}
      {editable && (
        <div className="absolute bottom-2 left-2 z-20 flex gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg"
          >
            <ImagePlus size={14} />
            <span>{src ? label : 'Add photo'}</span>
          </button>
          {src && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-lg shadow-lg"
              title="Remove photo"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {open && (
        <ImageCropperModal
          bucket="public-site-images"
          aspect={aspect}
          onClose={() => setOpen(false)}
          onSave={(url) => onChange(url)}
        />
      )}
    </div>
  )
}

// ---------- link that becomes editable text + URL in edit mode ----------

export const EditableLink: React.FC<{
  href: string
  text: string
  editable: boolean
  onChange: (patch: { text?: string; href?: string }) => void
  className?: string
  placeholder?: string
  icon?: React.ReactNode
}> = ({ href, text, editable, onChange, className = '', placeholder = 'Button text', icon }) => {
  if (!editable) {
    if (!text) return null
    return (
      <Link href={href || '#'} className={className}>
        <span>{text}</span>
        {icon}
      </Link>
    )
  }
  return (
    <span className={`${className} relative`}>
      <InlineText element="span" value={text} onChange={(t) => onChange({ text: t })} placeholder={placeholder} />
      {icon}
      <button
        type="button"
        onClick={() => {
          const next = window.prompt('Link URL (for example /contact or https://...)', href || '')
          if (next !== null) onChange({ href: next.trim() })
        }}
        className="ml-1 p-1 rounded-md bg-black/20 hover:bg-black/40"
        title={`Edit link (${href || 'none'})`}
      >
        <Link2 size={12} />
      </button>
    </span>
  )
}

// ---------- controls for a repeatable item (feature, team member) ----------

export const ItemControls: React.FC<{
  index: number
  count: number
  onMove: (delta: number) => void
  onRemove: () => void
}> = ({ index, count, onMove, onRemove }) => (
  <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 bg-slate-900/90 text-white rounded-lg px-1 py-0.5 shadow">
    <button
      type="button"
      onClick={() => onMove(-1)}
      disabled={index === 0}
      className="p-1 rounded hover:bg-slate-700 disabled:opacity-25"
      title="Move earlier"
    >
      <ArrowLeft size={12} />
    </button>
    <button
      type="button"
      onClick={() => onMove(1)}
      disabled={index === count - 1}
      className="p-1 rounded hover:bg-slate-700 disabled:opacity-25"
      title="Move later"
    >
      <ArrowRight size={12} />
    </button>
    <button
      type="button"
      onClick={onRemove}
      className="p-1 rounded hover:bg-red-600 text-red-300 hover:text-white"
      title="Remove"
    >
      <Trash2 size={12} />
    </button>
  </div>
)

export const AddItemButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition-all text-slate-400 hover:text-blue-600 min-h-[10rem] text-xs font-bold uppercase tracking-wider"
  >
    <span className="text-2xl leading-none">+</span>
    <span>{label}</span>
  </button>
)

export const ManageLink: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <div className="flex justify-center mt-8">
    <Link
      href={href}
      className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-xl"
    >
      {label}
    </Link>
  </div>
)
