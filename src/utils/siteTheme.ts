/**
 * Site-wide brand & theme (one row in public.global_styles, id = 'default').
 * Shared by the server layout (first paint, metadata) and the editor (live preview).
 * Colors recolor the whole site by overriding Tailwind's --color-blue-* / --color-slate-* variables.
 */

export interface SiteBrand {
  site_name: string
  footer_name: string
  footer_tagline: string
  /** {year} is replaced with the current year */
  copyright_text: string
  logo_url: string
  favicon_url: string
  primary_color: string
  secondary_color: string
  heading_font: string
  body_font: string
  border_radius: string
  seo_title: string
  seo_description: string
}

export const DEFAULT_BRAND: SiteBrand = {
  site_name: 'Trinity Enterprise',
  footer_name: 'Trinity Enterprise Tree Services',
  footer_tagline: 'For all your tree service needs.',
  copyright_text: '© {year} Trinity Enterprise. All rights reserved.',
  logo_url: '/logo.png',
  favicon_url: '/favicon.png',
  primary_color: '#4d7c0f',
  secondary_color: '#292524',
  heading_font: 'default',
  body_font: 'default',
  border_radius: 'default',
  seo_title: 'Trinity Enterprise Tree Services',
  seo_description: 'Tree removal, trimming, stump grinding and storm cleanup. For all your tree service needs.'
}

export const FONT_OPTIONS: { value: string; label: string; stack: string; google?: string }[] = [
  { value: 'default', label: 'Default (Arial / Helvetica)', stack: 'Arial, Helvetica, sans-serif' },
  { value: 'geist', label: 'Geist', stack: 'var(--font-geist-sans), Arial, sans-serif' },
  { value: 'Inter', label: 'Inter', stack: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700;800;900' },
  { value: 'Roboto', label: 'Roboto', stack: "'Roboto', sans-serif", google: 'Roboto:wght@400;500;700;900' },
  { value: 'Open Sans', label: 'Open Sans', stack: "'Open Sans', sans-serif", google: 'Open+Sans:wght@400;600;700;800' },
  { value: 'Lato', label: 'Lato', stack: "'Lato', sans-serif", google: 'Lato:wght@400;700;900' },
  { value: 'Montserrat', label: 'Montserrat', stack: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;500;600;700;800;900' },
  { value: 'Poppins', label: 'Poppins', stack: "'Poppins', sans-serif", google: 'Poppins:wght@400;500;600;700;800;900' },
  { value: 'Nunito', label: 'Nunito', stack: "'Nunito', sans-serif", google: 'Nunito:wght@400;600;700;800;900' },
  { value: 'Raleway', label: 'Raleway', stack: "'Raleway', sans-serif", google: 'Raleway:wght@400;500;600;700;800;900' },
  { value: 'Oswald', label: 'Oswald (condensed)', stack: "'Oswald', sans-serif", google: 'Oswald:wght@400;500;600;700' },
  { value: 'Playfair Display', label: 'Playfair Display (serif)', stack: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;600;700;800;900' },
  { value: 'Merriweather', label: 'Merriweather (serif)', stack: "'Merriweather', serif", google: 'Merriweather:wght@400;700;900' },
  { value: 'Lora', label: 'Lora (serif)', stack: "'Lora', serif", google: 'Lora:wght@400;500;600;700' }
]

export const RADIUS_OPTIONS: { value: string; label: string; scale: number }[] = [
  { value: 'sharp', label: 'Sharp corners', scale: 0.2 },
  { value: 'small', label: 'Slightly rounded', scale: 0.5 },
  { value: 'default', label: 'Rounded (default)', scale: 1 },
  { value: 'round', label: 'Extra rounded', scale: 1.6 }
]

const HEX = /^#[0-9a-f]{6}$/i
// Tailwind v4 default radii, in rem
const RADII: Record<string, number> = { sm: 0.25, md: 0.375, lg: 0.5, xl: 0.75, '2xl': 1, '3xl': 1.5 }

const fontFor = (value: string) => FONT_OPTIONS.find((f) => f.value === value)

/** Merges a database row over the defaults, dropping empty values and legacy formats. */
export function normalizeBrand(row: Record<string, any> | null | undefined): SiteBrand {
  const brand: SiteBrand = { ...DEFAULT_BRAND }
  if (!row) return brand
  for (const key of Object.keys(DEFAULT_BRAND) as (keyof SiteBrand)[]) {
    const v = row[key]
    if (typeof v === 'string' && v.trim() !== '') brand[key] = v
  }
  // Older rows stored placeholder values from the first Styles panel
  if (!HEX.test(brand.primary_color) || brand.primary_color.toLowerCase() === '#3b82f6') brand.primary_color = DEFAULT_BRAND.primary_color
  if (!HEX.test(brand.secondary_color) || brand.secondary_color.toLowerCase() === '#1e293b') brand.secondary_color = DEFAULT_BRAND.secondary_color
  if (!fontFor(brand.heading_font)) brand.heading_font = 'default'
  if (!fontFor(brand.body_font)) brand.body_font = 'default'
  if (!RADIUS_OPTIONS.some((r) => r.value === brand.border_radius)) brand.border_radius = 'default'
  return brand
}

/** True for pale colors, which need dark text on top of them */
export function isLightColor(hex?: string) {
  if (!hex || !HEX.test(hex)) return false
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 165
}

export const copyrightLine = (brand: SiteBrand) =>
  brand.copyright_text.replace(/\{year\}/g, String(new Date().getFullYear()))

// Tailwind's own blue-600 and slate-900. Brand colors equal to these need no override.
const BASE_PRIMARY = '#2563eb'
const BASE_SECONDARY = '#0f172a'

/** CSS custom properties for the brand. Only validated values reach the stylesheet. */
export function themeCss(brand: SiteBrand): string {
  const rules: string[] = []
  const p = brand.primary_color
  if (HEX.test(p) && p.toLowerCase() !== BASE_PRIMARY) {
    const tint = (pct: number) => `color-mix(in oklab, ${p} ${pct}%, white)`
    const shade = (pct: number) => `color-mix(in oklab, ${p} ${pct}%, black)`
    rules.push(
      `--color-blue-50:${tint(7)}`,
      `--color-blue-100:${tint(14)}`,
      `--color-blue-200:${tint(28)}`,
      `--color-blue-300:${tint(48)}`,
      `--color-blue-400:${tint(72)}`,
      `--color-blue-500:${tint(88)}`,
      `--color-blue-600:${p}`,
      `--color-blue-700:${shade(82)}`,
      `--color-blue-800:${shade(66)}`,
      `--color-blue-900:${shade(52)}`,
      `--color-blue-950:${shade(36)}`
    )
  }
  const s = brand.secondary_color
  if (HEX.test(s) && s.toLowerCase() !== BASE_SECONDARY) {
    rules.push(
      `--color-slate-800:color-mix(in oklab, ${s} 85%, white)`,
      `--color-slate-900:${s}`,
      `--color-slate-950:color-mix(in oklab, ${s} 80%, black)`
    )
  }
  const radius = RADIUS_OPTIONS.find((r) => r.value === brand.border_radius)
  if (radius && radius.scale !== 1) {
    for (const [name, rem] of Object.entries(RADII)) rules.push(`--radius-${name}:${+(rem * radius.scale).toFixed(3)}rem`)
  }

  let css = rules.length ? `:root{${rules.join(';')}}` : ''
  const body = fontFor(brand.body_font)
  if (body && body.value !== 'default') css += `body{font-family:${body.stack}}`
  const heading = fontFor(brand.heading_font)
  if (heading && heading.value !== 'default') css += `h1,h2,h3,h4{font-family:${heading.stack}}`
  return css
}

/** Google Fonts stylesheet for the chosen fonts, or null when none are needed. */
export function googleFontsHref(brand: SiteBrand): string | null {
  const families = [...new Set([brand.heading_font, brand.body_font])]
    .map((v) => fontFor(v)?.google)
    .filter(Boolean)
  return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap` : null
}
