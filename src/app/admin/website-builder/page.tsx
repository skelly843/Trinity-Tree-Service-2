import { SiteName } from '@/components/SiteTheme'
import { getProfile } from '@/utils/supabase/getProfile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Home,
  Image as ImageIcon,
  Link2,
  Mail,
  Palette,
  Settings,
  Wrench
} from 'lucide-react'

const PAGES = [
  { title: 'Home', desc: 'Your first impression: main banner, highlights and calls to action.', href: '/', icon: Home },
  { title: 'Services', desc: 'The page layout, headings and banners around your services.', href: '/services', icon: Wrench },
  { title: 'Gallery', desc: 'The page layout and headings around your project photos.', href: '/gallery', icon: ImageIcon },
  { title: 'About', desc: 'Your story, why customers choose you, and your team.', href: '/about', icon: BookOpen },
  { title: 'Contact', desc: 'The contact page layout, headings and form.', href: '/contact', icon: Mail },
  { title: 'Request Service', desc: 'The booking page heading and form wording.', href: '/request-service', icon: ClipboardList }
]

const CONTENT = [
  { title: 'Services', desc: 'Add or change the services you offer.', href: '/admin/services', icon: Wrench },
  { title: 'Gallery Projects', desc: 'Add project photos. Tick Published to show them.', href: '/admin/gallery', icon: ImageIcon },
  { title: 'Menu & Media', desc: 'Change the top menu links and manage uploaded files.', href: '/admin/content', icon: Link2 },
  { title: 'Business Settings', desc: 'Phone, email, address, service area, social profiles and search title.', href: '/admin/settings', icon: Settings }
]

export default async function WebsiteBuilderDashboard() {
  const profile = await getProfile()

  // Guard: Strict server-side validation.
  if (!profile || profile.role !== 'global_admin' || !profile.is_active) {
    return redirect('/login')
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Website Editor</h1>
        <p className="text-slate-500 text-sm mt-1">
          Click a page to edit <SiteName /> right on the page. Click any text to type, and use <strong>Style</strong> on a
          section for background photos and colors.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Your pages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PAGES.map((page) => (
            // A full page load, because the editor runs on the public site
            <a
              key={page.href}
              href={`${page.href}?edit=1`}
              className="group bg-white rounded-2xl border border-slate-200 p-6 space-y-3 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <page.icon size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">{page.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{page.desc}</p>
              <p className="text-xs font-bold text-blue-600 inline-flex items-center gap-1">
                Edit this page <ArrowRight size={14} />
              </p>
            </a>
          ))}
        </div>
      </section>

      <a
        href="/?edit=1&panel=brand"
        className="flex items-center gap-4 bg-slate-900 text-white rounded-2xl p-6 hover:bg-slate-800 transition-all"
      >
        <span className="w-12 h-12 bg-white/10 text-blue-300 rounded-xl flex items-center justify-center shrink-0">
          <Palette size={24} />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-lg">Brand &amp; Theme</span>
          <span className="block text-xs text-slate-300 mt-0.5">
            Colors, fonts, logo, browser tab icon, business name and footer, for the whole site.
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0" />
      </a>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Website content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTENT.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <item.icon size={20} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
