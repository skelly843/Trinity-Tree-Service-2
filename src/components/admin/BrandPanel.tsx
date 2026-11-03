'use client'

import React, { useState } from 'react'
import { ImagePlus, Loader2, Palette, RotateCcw, Save, X } from 'lucide-react'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { ImageCropperModal } from '@/components/admin/ImageCropperModal'
import { FONT_OPTIONS, RADIUS_OPTIONS, type SiteBrand } from '@/utils/siteTheme'

const COLOR_PRESETS: { label: string; primary: string; secondary: string }[] = [
  { label: 'Ocean blue', primary: '#2563eb', secondary: '#0f172a' },
  { label: 'Forest green', primary: '#15803d', secondary: '#14261c' },
  { label: 'Teal', primary: '#0d9488', secondary: '#112a2c' },
  { label: 'Crimson', primary: '#dc2626', secondary: '#1f1416' },
  { label: 'Sunset orange', primary: '#ea580c', secondary: '#24170f' },
  { label: 'Royal purple', primary: '#7c3aed', secondary: '#1b1430' },
  { label: 'Gold', primary: '#ca8a04', secondary: '#1c1a14' },
  { label: 'Charcoal', primary: '#475569', secondary: '#111827' }
]

const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest'
const inputClass = 'w-full bg-slate-800 text-sm text-white border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">{title}</h4>
      {children}
    </section>
  )
}

function TextField({ label, value, onChange, placeholder, multiline }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelClass}>{label}</span>
      {multiline ? (
        <textarea rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </label>
  )
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  React.useEffect(() => setText(value), [value])
  return (
    <div className="space-y-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent shrink-0"
          aria-label={label}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value)
          }}
          className={inputClass}
          maxLength={7}
        />
      </div>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  )
}

function ImageField({ label, hint, value, aspect, onChange }: {
  label: string
  hint: string
  value: string
  aspect: number
  onChange: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-14 w-28 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-slate-400 font-bold">None</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold"
        >
          <ImagePlus size={14} />
          {value ? 'Replace' : 'Upload'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-xs font-bold text-slate-400 hover:text-red-400">
            Remove
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500">{hint}</p>
      {open && (
        <ImageCropperModal
          aspect={aspect}
          onClose={() => setOpen(false)}
          onSave={(url) => {
            onChange(url)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

/** Site-wide brand & theme settings: name, logo, colors, fonts, corners and search text. */
export function BrandPanel({ onClose }: { onClose: () => void }) {
  const { styles: brand, setStyles, brandDirty, saveBrand, resetBrand, saving } = useWebsiteBuilder()
  const set = (patch: Partial<SiteBrand>) => setStyles((prev) => ({ ...prev, ...patch }))

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md bg-slate-900 text-white border-l border-slate-800 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Brand and theme settings"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <Palette className="text-blue-400" size={18} />
            Brand &amp; Theme
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          <p className="text-xs text-slate-400">
            Changes preview on the page right away. They apply to every page once you save.
          </p>

          <Section title="Business identity">
            <TextField label="Name in the header" value={brand.site_name} onChange={(site_name) => set({ site_name })} placeholder="Leave empty to show only the logo" />
            <TextField label="Company name in the footer" value={brand.footer_name} onChange={(footer_name) => set({ footer_name })} />
            <TextField label="Footer description" value={brand.footer_tagline} onChange={(footer_tagline) => set({ footer_tagline })} multiline />
            <TextField label="Copyright line" value={brand.copyright_text} onChange={(copyright_text) => set({ copyright_text })} placeholder="© {year} Company name. All rights reserved." />
          </Section>

          <Section title="Logo & icon">
            <ImageField label="Logo" hint="Shown in the header and footer. A wide image with a transparent or white background works best." value={brand.logo_url} aspect={3} onChange={(logo_url) => set({ logo_url })} />
            <ImageField label="Browser tab icon" hint="A small square image (favicon)." value={brand.favicon_url} aspect={1} onChange={(favicon_url) => set({ favicon_url })} />
          </Section>

          <Section title="Colors">
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  onClick={() => set({ primary_color: preset.primary, secondary_color: preset.secondary })}
                  className={`h-10 rounded-lg overflow-hidden flex border-2 ${
                    brand.primary_color === preset.primary && brand.secondary_color === preset.secondary ? 'border-white' : 'border-transparent'
                  }`}
                >
                  <span className="flex-1" style={{ background: preset.primary }} />
                  <span className="w-1/3" style={{ background: preset.secondary }} />
                </button>
              ))}
            </div>
            <ColorField label="Main brand color" hint="Buttons, links, icons and highlights." value={brand.primary_color} onChange={(primary_color) => set({ primary_color })} />
            <ColorField label="Dark color" hint="Headings, dark page banners and the footer." value={brand.secondary_color} onChange={(secondary_color) => set({ secondary_color })} />
          </Section>

          <Section title="Fonts & shape">
            <label className="block space-y-1.5">
              <span className={labelClass}>Heading font</span>
              <select value={brand.heading_font} onChange={(e) => set({ heading_font: e.target.value })} className={inputClass}>
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Body text font</span>
              <select value={brand.body_font} onChange={(e) => set({ body_font: e.target.value })} className={inputClass}>
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Corners on cards and buttons</span>
              <select value={brand.border_radius} onChange={(e) => set({ border_radius: e.target.value })} className={inputClass}>
                {RADIUS_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
          </Section>

          <Section title="Search engines & browser tab">
            <TextField label="Page title" value={brand.seo_title} onChange={(seo_title) => set({ seo_title })} />
            <TextField label="Description" value={brand.seo_description} onChange={(seo_description) => set({ seo_description })} multiline />
          </Section>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={resetBrand}
            disabled={!brandDirty || saving}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
          >
            <RotateCcw size={14} />
            Undo changes
          </button>
          <button
            type="button"
            onClick={saveBrand}
            disabled={!brandDirty || saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Save brand &amp; theme
          </button>
        </div>
      </aside>
    </div>
  )
}
