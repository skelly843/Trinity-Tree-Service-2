'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { InlineText } from '@/components/admin/InlineText'
import { copyrightLine } from '@/utils/siteTheme'
import { BrandLogo } from '@/components/Header'

export default function Footer() {
  const pathname = usePathname()
  const { styles: brand, setStyles: setBrand, editMode, previewMode } = useWebsiteBuilder()
  const editable = editMode && !previewMode

  // Don't render public footer on admin layout routes
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/employee')) {
    return null
  }

  return (
    <footer className="bg-slate-900 text-white py-12 px-6 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-2">
          <BrandLogo src={brand.logo_url} alt="" className="h-8 w-auto max-w-[140px] object-contain" iconSize={24} iconClassName="text-blue-400" />
          <InlineText
            element="span"
            value={brand.footer_name}
            onChange={(footer_name) => setBrand((prev) => ({ ...prev, footer_name }))}
            placeholder="Company name"
            className="text-xl font-bold tracking-tight"
          />
        </div>
        <InlineText
          element="p"
          value={brand.footer_tagline}
          onChange={(footer_tagline) => setBrand((prev) => ({ ...prev, footer_tagline }))}
          placeholder="Short description of the business"
          className="text-slate-400 text-xs text-center max-w-md md:text-left"
        />
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors font-medium">Home</Link>
          <Link href="/services" className="hover:text-white transition-colors font-medium">Services</Link>
          <Link href="/gallery" className="hover:text-white transition-colors font-medium">Gallery</Link>
          <Link href="/about" className="hover:text-white transition-colors font-medium">About</Link>
          <Link href="/contact" className="hover:text-white transition-colors font-medium">Contact</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
        {editable ? (
          <>
            <InlineText
              element="span"
              value={brand.copyright_text}
              onChange={(copyright_text) => setBrand((prev) => ({ ...prev, copyright_text }))}
              placeholder="© {year} Company name. All rights reserved."
            />
            <span className="block mt-1 text-[11px] text-slate-600">Write {'{year}'} to show the current year.</span>
          </>
        ) : (
          copyrightLine(brand)
        )}
      </div>
    </footer>
  )
}
