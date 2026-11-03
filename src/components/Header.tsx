'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { TreeDeciduous, Menu, X, User, LayoutDashboard, Settings } from 'lucide-react'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { InlineText } from '@/components/admin/InlineText'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { styles: brand, setStyles: setBrand, editMode, previewMode } = useWebsiteBuilder()
  const brandEditable = editMode && !previewMode

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [navLinks, setNavLinks] = useState<any[]>([
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Gallery', href: '/gallery' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Request Service', href: '/request-service' },
  ])

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          const { data: prof } = await supabase
            .from('profiles')
            .select('role, full_name, is_active')
            .eq('id', session.user.id)
            .single()
          setProfile(prof)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.warn('Supabase auth getSession not available:', err)
      }

      // Load custom dynamic navigation links
      try {
        const { data: customNav } = await supabase
          .from('navigation_items')
          .select('label, url')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        if (customNav && customNav.length > 0) {
          setNavLinks(customNav.map((item: any) => ({ label: item.label, href: item.url })))
        }
      } catch (err) {
        console.warn('Failed to load dynamic navigation items:', err)
      }
    }
    loadUser()

    let subscription: any = null
    try {
      const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          setUser(session.user)
          supabase
            .from('profiles')
            .select('role, full_name, is_active')
            .eq('id', session.user.id)
            .single()
            .then(({ data: prof }: any) => setProfile(prof))
            .catch((err: any) => console.warn('Failed to load profile in header:', err))
        } else {
          setUser(null)
          setProfile(null)
        }
      })
      subscription = data?.subscription
    } catch (err) {
      console.warn('Supabase auth onAuthStateChange not available:', err)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [supabase])

  // Don't render public header on admin layout routes
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/employee')) {
    return null
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  const isLoggedIn = !!user
  // STRICT RULE: Global admins and admins go strictly to /admin
  const isGlobalAdminUser = profile?.role === 'global_admin' && profile?.is_active === true
  const isAdmin = profile?.role === 'admin' || profile?.role === 'employee' || isGlobalAdminUser

  const dashboardLink = isGlobalAdminUser || isAdmin ? '/admin' : '/portal'
  const accountLink = isGlobalAdminUser || isAdmin ? '/admin/settings' : '/portal/profile'

  return (
    <header
      className="bg-white border-b border-slate-100 sticky z-50 shadow-sm select-none"
      style={{ top: 'var(--editor-toolbar-h, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        {brandEditable ? (
          // While editing, the name is a text field rather than a link
          <div className="flex items-center space-x-2 shrink-0">
            <BrandLogo src={brand.logo_url} alt={brand.site_name ? '' : brand.footer_name} />
            <InlineText
              element="span"
              value={brand.site_name}
              onChange={(site_name) => setBrand((prev) => ({ ...prev, site_name }))}
              placeholder="Site name"
              className="text-2xl font-black text-slate-900 tracking-tight select-text"
            />
          </div>
        ) : (
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <BrandLogo src={brand.logo_url} alt={brand.site_name ? '' : brand.footer_name} />
            {brand.site_name && (
              <span className="text-2xl font-black text-slate-900 tracking-tight">{brand.site_name}</span>
            )}
          </Link>
        )}

        {/* Desktop Nav */}
        <nav className="hidden lg:flex space-x-8 text-sm font-bold text-slate-600">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-blue-600 ${
                  isActive ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden lg:flex items-center space-x-4">
          {isGlobalAdminUser && (
            <Link
              href="/admin/website-builder"
              data-testid="website-builder-link"
              className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1"
            >
              <Settings size={14} />
              <span>Website Builder</span>
            </Link>
          )}

          {isLoggedIn ? (
            <>
              <Link
                href={dashboardLink}
                className="text-sm font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5"
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <Link
                href={accountLink}
                className="text-sm font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5"
              >
                <User size={16} />
                <span>My Account</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-bold text-slate-700 hover:text-blue-600"
              >
                Log In
              </Link>
              <Link
                href="/request-service"
                className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="lg:hidden p-2 text-slate-600 hover:text-blue-600"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-6 py-6 space-y-4 shadow-inner">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-bold ${
                  pathname === link.href ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-50 flex flex-col space-y-3">
            {isGlobalAdminUser && (
              <Link
                href="/admin/website-builder"
                onClick={() => setMenuOpen(false)}
                data-testid="website-builder-link"
                className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1"
              >
                <Settings size={14} />
                <span>Website Builder</span>
              </Link>
            )}

            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardLink}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5"
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href={accountLink}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5"
                >
                  <User size={16} />
                  <span>My Account</span>
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    handleSignOut()
                  }}
                  className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl text-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-bold text-slate-700 hover:text-blue-600 text-center py-2"
                >
                  Log In
                </Link>
                <Link
                  href="/request-service"
                  onClick={() => setMenuOpen(false)}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 text-center shadow-md shadow-blue-100"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/** Uploaded logo, or the default icon. Pass alt="" when the name is shown beside it. */
export function BrandLogo({ src, alt, className = 'h-10 w-auto max-w-[180px] object-contain', iconSize = 32, iconClassName = 'text-blue-600' }: {
  src: string
  alt: string
  className?: string
  iconSize?: number
  iconClassName?: string
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} className={className} /> : <TreeDeciduous className={iconClassName} size={iconSize} />
}
