/**
 * Photos uploaded to Supabase storage are served at full size (often 1 MB or more). These
 * helpers ask the site's image service (Next.js locally, Netlify's image CDN when live) for
 * a copy sized to the screen and in a modern format, which loads much faster on phones.
 * Other images (logos, outside links) are left as they are.
 */

const SUPABASE_PUBLIC = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//i

// Must be widths Next.js allows (its default deviceSizes)
export const HERO_WIDTHS = [640, 1080, 1920]
export const CARD_WIDTHS = [640, 1080]

export function canOptimize(src?: string | null): src is string {
  return !!src && SUPABASE_PUBLIC.test(src)
}

export function optimizedSrc(src: string, width: number) {
  return canOptimize(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75` : src
}

/** src, srcSet and sizes for an <img>, falling back to the original file. */
export function responsiveImage(src: string, widths: number[], sizes: string) {
  if (!canOptimize(src)) return { src }
  return {
    src: optimizedSrc(src, widths[widths.length - 1]),
    srcSet: widths.map((w) => `${optimizedSrc(src, w)} ${w}w`).join(', '),
    sizes
  }
}
