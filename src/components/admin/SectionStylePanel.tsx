'use client'

import React, { useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, ImagePlus, X } from 'lucide-react'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { ImageCropperModal } from '@/components/admin/ImageCropperModal'
import type { PageBlock } from '@/components/blocks/types'

const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest'

function Choice({ value, options, onChange }: {
  value: string
  options: { value: string; label: React.ReactNode; title: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-label={option.title}
          onClick={() => onChange(option.value)}
          className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded-lg text-xs font-bold ${
            value === option.value ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const ALIGN_OPTIONS = [
  { value: 'left', label: <AlignLeft size={14} />, title: 'Left' },
  { value: 'center', label: <AlignCenter size={14} />, title: 'Center' },
  { value: 'right', label: <AlignRight size={14} />, title: 'Right' }
]

/** Background, alignment and spacing for one section. Saved with the page. */
export function SectionStylePanel({ block, onClose }: { block: PageBlock; onClose: () => void }) {
  const { updateBlockData } = useWebsiteBuilder()
  const [cropperOpen, setCropperOpen] = useState(false)
  const isHero = block.block_type === 'hero'
  const data = block.draft_data || {}
  const style = data._style || {}

  const color: string = (isHero ? data.backgroundColor : style.bgColor) || ''
  const photo: string = (isHero ? data.backgroundImage : style.bgImage) || ''

  const setStyle = (patch: Record<string, any>) => updateBlockData(block.id, { _style: { ...style, ...patch } })
  const setColor = (value: string) => (isHero ? updateBlockData(block.id, { backgroundColor: value }) : setStyle({ bgColor: value }))
  const setPhoto = (value: string) => (isHero ? updateBlockData(block.id, { backgroundImage: value }) : setStyle({ bgImage: value }))

  return (
    <div className="absolute top-12 left-2 z-[55] w-72 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 space-y-4 text-left select-none">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Section style</p>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close section style">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-1.5">
        <p className={labelClass}>Background color</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color || '#ffffff'}
            onChange={(e) => setColor(e.target.value)}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
            aria-label="Section background color"
          />
          {color ? (
            <button type="button" onClick={() => setColor('')} className="text-xs font-bold text-slate-300 hover:text-white">
              Remove color
            </button>
          ) : (
            <span className="text-xs text-slate-400">Using the page default</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className={labelClass}>Background photo</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCropperOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold"
          >
            <ImagePlus size={14} />
            {photo ? 'Replace photo' : 'Add photo'}
          </button>
          {photo && (
            <button type="button" onClick={() => setPhoto('')} className="text-xs font-bold text-slate-300 hover:text-white">
              Remove
            </button>
          )}
        </div>
      </div>

      {photo && !isHero && (
        <div className="space-y-1.5">
          <p className={labelClass}>Photo shading</p>
          <Choice
            value={style.overlay || 'dark'}
            onChange={(overlay) => setStyle({ overlay })}
            options={[
              { value: 'dark', label: 'Dark', title: 'Dark shading, white text' },
              { value: 'light', label: 'Light', title: 'Light shading, dark text' },
              { value: 'none', label: 'None', title: 'No shading' }
            ]}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <p className={labelClass}>{isHero ? 'Text position' : 'Text alignment'}</p>
        <Choice
          value={isHero ? data.contentPosition || (data.variant === 'compact' ? 'center' : 'left') : style.align || ''}
          onChange={(value) => (isHero ? updateBlockData(block.id, { contentPosition: value }) : setStyle({ align: value }))}
          options={ALIGN_OPTIONS}
        />
      </div>

      {!isHero && (
        <div className="space-y-1.5">
          <p className={labelClass}>Spacing</p>
          <Choice
            value={style.spacing || 'normal'}
            onChange={(spacing) => setStyle({ spacing })}
            options={[
              { value: 'compact', label: 'Compact', title: 'Less space above and below' },
              { value: 'normal', label: 'Normal', title: 'Standard spacing' },
              { value: 'tall', label: 'Tall', title: 'More space above and below' }
            ]}
          />
        </div>
      )}

      <p className="text-[11px] text-slate-500">Press Save Draft or Publish to keep your changes.</p>

      {cropperOpen && (
        <ImageCropperModal
          bucket="public-site-images"
          aspect={16 / 9}
          onClose={() => setCropperOpen(false)}
          onSave={(url) => setPhoto(url)}
        />
      )}
    </div>
  )
}
