'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Type,
  Image as ImageIcon,
  Clock,
  Phone,
  Mail,
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  Upload,
  User,
  Shield,
  FileText,
  Copy,
  FolderOpen
} from 'lucide-react'
import ImageUpload from '@/components/admin/ImageUpload'
import { PRIVATE_BUCKETS } from '@/utils/storedFiles'

export default function SiteContentPage() {
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'contact' | 'navigation' | 'footer' | 'seo' | 'media'>('navigation')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  // 1. Home content state
  const [homeHero, setHomeHero] = useState({
    title: 'Premium Water Solutions for Modern Homes',
    subtitle: 'Expert maintenance, repair, and installation services at your fingertips. Manage your home services with our state-of-the-art portal.',
    backgroundImage: '',
    ctaText: 'Book a Service',
    ctaUrl: '/request-service',
    secondaryCtaText: 'View Our Work',
    secondaryCtaUrl: '/gallery',
    whyChooseTitle: 'Why Choose Trinity Enterprise',
    whyChooseSubtitle: 'The Preferred Choice for Homeowners'
  })

  // 2. About content state
  const [aboutContent, setAboutContent] = useState({
    heading: 'About Trinity Enterprise Tree Services',
    subtitle: 'Safe, professional tree care with integrity, reliability, and respect for your property.',
    storyTitle: 'Our Story & Mission',
    storyBody: 'Trinity Enterprise Tree Services provides tree removal, trimming and pruning, stump grinding, land clearing and storm damage cleanup for homes and businesses, from Dallas to Houston and beyond, including hurricane recovery during storm season.',
    mission: 'Our mission is to safeguard our clients\' homes and commercial investments by delivering careful, professional tree work, clean job sites, and honest, upfront pricing on every job.',
    team: [] as { name: string; role: string; bio: string }[],
  })

  const [newTeamMember, setNewTeamMember] = useState({ name: '', role: '', bio: '' })

  // 3. Contact settings state
  const [contactSettings, setContactSettings] = useState({
    company_name: 'Trinity Enterprise Tree Services',
    phone: '',
    email: '',
    address: '',
    emergency_service_notice: 'Tree down on your home, car or driveway after a storm? Call us and our crew will respond as fast as we can.',
    service_areas: [] as string[],
    business_hours_text: 'Monday - Friday: 7:00 AM - 6:00 PM\nSaturday: 8:00 AM - 4:00 PM\nSunday: Closed'
  })

  const [newArea, setNewArea] = useState('')

  // 4. Navigation Links state
  const [navLinks, setNavLinks] = useState<any[]>([])
  const [newNavLink, setNewNavLink] = useState({ label: '', url: '', display_order: 10 })

  // 5. Footer state
  const [footerSettings, setFooterSettings] = useState({
    brandName: 'Trinity Enterprise Tree Services',
    description: 'Tree removal, trimming, stump grinding, land clearing and storm damage cleanup.',
    copyright: '© 2026 Trinity Enterprise Tree Services. All rights reserved.'
  })

  // 6. SEO state
  const [seoSettings, setSeoSettings] = useState({
    seo_title: 'Trinity Enterprise Tree Services | Tree Removal & Trimming',
    seo_description: 'Professional tree removal, trimming, stump grinding, land clearing and storm damage cleanup.'
  })

  // 7. Media Library state
  const [selectedBucket, setSelectedBucket] = useState<'public-site-images' | 'gallery-images' | 'customer-files' | 'receipts' | 'profile-images'>('public-site-images')
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  // Private buckets have no public links, so previews use short-lived signed links
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [mediaLoading, setMediaLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Fetch all content
  useEffect(() => {
    async function loadAllContent() {
      try {
        setFetching(true)

        // Fetch home hero block
        const { data: heroData } = await supabase
          .from('site_content')
          .select('*')
          .eq('id', 'homepage_hero')
          .single()
        if (heroData) {
          setHomeHero(prev => ({ ...prev, ...(heroData.content as any) }))
        }

        // Fetch about page content
        const { data: aboutData } = await supabase
          .from('site_content')
          .select('*')
          .eq('id', 'about_page')
          .single()
        if (aboutData) {
          setAboutContent(prev => ({ ...prev, ...(aboutData.content as any) }))
        }

        // Fetch company settings for contact
        const { data: compSettings } = await supabase
          .from('company_settings')
          .select('*')
          .eq('id', 'default')
          .single()
        if (compSettings) {
          setContactSettings({
            company_name: compSettings.company_name || 'Trinity Enterprise Tree Services',
            phone: compSettings.phone || '',
            email: compSettings.email || '',
            address: compSettings.address || '',
            emergency_service_notice: compSettings.emergency_service_notice || '',
            service_areas: compSettings.service_areas || [],
            business_hours_text: compSettings.business_hours_text || 'Monday - Friday: 7:00 AM - 6:00 PM\nSaturday: 8:00 AM - 4:00 PM\nSunday: Closed'
          })
          setSeoSettings({
            seo_title: compSettings.seo_title || '',
            seo_description: compSettings.seo_description || ''
          })
        }

        // Fetch footer content block
        const { data: footerData } = await supabase
          .from('site_content')
          .select('*')
          .eq('id', 'footer_settings')
          .single()
        if (footerData) {
          setFooterSettings(prev => ({ ...prev, ...(footerData.content as any) }))
        }

        // Fetch Navigation Links
        const { data: navItems } = await supabase
          .from('navigation_items')
          .select('*')
          .order('display_order', { ascending: true })
        if (navItems) {
          setNavLinks(navItems)
        }

      } catch (err) {
        console.error('Error fetching site content:', err)
      } finally {
        setFetching(false)
      }
    }
    loadAllContent()
  }, [supabase])

  // Media Library Fetcher
  const loadMedia = async () => {
    try {
      setMediaLoading(true)
      const { data, error: mediaErr } = await supabase.storage
        .from(selectedBucket)
        .list('', { limit: 100 })

      if (mediaErr) throw mediaErr
      // Folder entries (customer folders in private buckets) have no id
      const files = (data || []).filter((f: any) => f.id)
      setMediaFiles(files)
      if ((PRIVATE_BUCKETS as readonly string[]).includes(selectedBucket) && files.length > 0) {
        const { data: signed } = await supabase.storage.from(selectedBucket).createSignedUrls(files.map((f: any) => f.name), 600)
        setSignedUrls(Object.fromEntries((signed || []).filter((x: any) => x.signedUrl).map((x: any) => [x.path, x.signedUrl])))
      } else {
        setSignedUrls({})
      }
    } catch (err: any) {
      console.error('Error fetching storage:', err)
      setMediaFiles([])
    } finally {
      setMediaLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'media') {
      loadMedia()
    }
  }, [activeTab, selectedBucket])

  // Direct File Upload for Media Library Tab
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    try {
      setUploadingMedia(true)
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(selectedBucket)
        .upload(fileName, file)

      if (uploadError) throw uploadError
      loadMedia()
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploadingMedia(false)
    }
  }

  const deleteMediaFile = async (name: string) => {
    if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return
    try {
      const { error: delErr } = await supabase.storage
        .from(selectedBucket)
        .remove([name])
      if (delErr) throw delErr
      loadMedia()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  // General Saver
  const handleSaveAll = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 1. Save Home Hero Block
      await supabase
        .from('site_content')
        .upsert({ id: 'homepage_hero', content: homeHero as any, updated_at: new Date().toISOString() })

      // 2. Save About Page Block
      await supabase
        .from('site_content')
        .upsert({ id: 'about_page', content: aboutContent as any, updated_at: new Date().toISOString() })

      // 3. Save Company Settings
      await supabase
        .from('company_settings')
        .upsert({
          id: 'default',
          company_name: contactSettings.company_name,
          phone: contactSettings.phone,
          email: contactSettings.email,
          address: contactSettings.address,
          emergency_service_notice: contactSettings.emergency_service_notice,
          service_areas: contactSettings.service_areas,
          business_hours_text: contactSettings.business_hours_text,
          seo_title: seoSettings.seo_title,
          seo_description: seoSettings.seo_description,
          updated_at: new Date().toISOString()
        })

      // 4. Save Footer Settings Block
      await supabase
        .from('site_content')
        .upsert({ id: 'footer_settings', content: footerSettings as any, updated_at: new Date().toISOString() })

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Navigation Links Crud operations
  const addNavLink = async () => {
    if (!newNavLink.label || !newNavLink.url) return
    const { data, error: addErr } = await supabase
      .from('navigation_items')
      .insert([newNavLink])
      .select()
    if (!addErr && data) {
      setNavLinks(prev => [...prev, data[0]].sort((a, b) => a.display_order - b.display_order))
      setNewNavLink({ label: '', url: '', display_order: 10 })
    }
  }

  const deleteNavLink = async (id: string) => {
    const { error: delErr } = await supabase
      .from('navigation_items')
      .delete()
      .eq('id', id)
    if (!delErr) {
      setNavLinks(prev => prev.filter(link => link.id !== id))
    }
  }

  const moveNavLink = async (index: number, direction: 'up' | 'down') => {
    const newLinks = [...navLinks]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= newLinks.length) return

    // Swap items
    const temp = newLinks[index]
    newLinks[index] = newLinks[targetIdx]
    newLinks[targetIdx] = temp

    // Re-index display_order
    const updated = newLinks.map((link, idx) => ({ ...link, display_order: (idx + 1) * 10 }))
    setNavLinks(updated)

    // Save batch swaps to Supabase
    for (const item of updated) {
      await supabase
        .from('navigation_items')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
    }
  }

  if (fetching) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Website Content Editor</h1>
        <p className="text-slate-500 mt-1">Change the top menu links and manage uploaded files. Page content is edited on the page itself.</p>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-sm border">
        {(['navigation', 'media'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Pane content */}
      <div className="space-y-6">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center border-b pb-4">
              <Monitor className="mr-2 text-slate-400" />
              Homepage Hero Section
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Headline</label>
                <input
                  type="text"
                  value={homeHero.title}
                  onChange={(e) => setHomeHero({ ...homeHero, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Subtitle</label>
                <textarea
                  value={homeHero.subtitle}
                  onChange={(e) => setHomeHero({ ...homeHero, subtitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Primary CTA Label</label>
                  <input
                    type="text"
                    value={homeHero.ctaText}
                    onChange={(e) => setHomeHero({ ...homeHero, ctaText: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Primary CTA Link</label>
                  <input
                    type="text"
                    value={homeHero.ctaUrl}
                    onChange={(e) => setHomeHero({ ...homeHero, ctaUrl: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Secondary CTA Label</label>
                  <input
                    type="text"
                    value={homeHero.secondaryCtaText}
                    onChange={(e) => setHomeHero({ ...homeHero, secondaryCtaText: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Secondary CTA Link</label>
                  <input
                    type="text"
                    value={homeHero.secondaryCtaUrl}
                    onChange={(e) => setHomeHero({ ...homeHero, secondaryCtaUrl: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-bold text-slate-700">Hero Image URL / Upload</label>
                {homeHero.backgroundImage && (
                  <div className="relative w-48 h-32 rounded-xl overflow-hidden border">
                    <img src={homeHero.backgroundImage} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setHomeHero({ ...homeHero, backgroundImage: '' })}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full text-red-500 hover:bg-slate-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                <ImageUpload
                  bucket="public-site-images"
                  label="Upload new Hero image"
                  onUpload={(url) => setHomeHero({ ...homeHero, backgroundImage: url })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center border-b pb-4">
              <User className="mr-2 text-slate-400" />
              About Us Page Content
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Page Main Heading</label>
                <input
                  type="text"
                  value={aboutContent.heading}
                  onChange={(e) => setAboutContent({ ...aboutContent, heading: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Introduction Subtitle</label>
                <input
                  type="text"
                  value={aboutContent.subtitle}
                  onChange={(e) => setAboutContent({ ...aboutContent, subtitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Company Story Title</label>
                <input
                  type="text"
                  value={aboutContent.storyTitle}
                  onChange={(e) => setAboutContent({ ...aboutContent, storyTitle: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Company Story Description Body</label>
                <textarea
                  value={aboutContent.storyBody}
                  onChange={(e) => setAboutContent({ ...aboutContent, storyBody: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl h-32 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Mission Statement text</label>
                <textarea
                  value={aboutContent.mission}
                  onChange={(e) => setAboutContent({ ...aboutContent, mission: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl h-24 text-sm"
                />
              </div>

              {/* Team Members List */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-base font-bold text-slate-800">Team Members Leadership</h3>
                <div className="divide-y border rounded-xl overflow-hidden bg-slate-50">
                  {aboutContent.team?.map((member, index) => (
                    <div key={index} className="p-4 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-slate-800">{member.name}</p>
                        <p className="text-xs text-blue-600 font-bold uppercase">{member.role}</p>
                        <p className="text-xs text-slate-500 mt-1">{member.bio}</p>
                      </div>
                      <button
                        onClick={() => setAboutContent({
                          ...aboutContent,
                          team: aboutContent.team.filter((_, idx) => idx !== index)
                        })}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!aboutContent.team || aboutContent.team.length === 0) && (
                    <div className="p-6 text-center text-slate-400 italic text-sm">No team members added. Use fields below to add!</div>
                  )}
                </div>

                <div className="p-4 border rounded-xl space-y-4 bg-slate-50">
                  <p className="font-bold text-xs text-slate-600 uppercase">Add Team Member</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newTeamMember.name}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                      className="px-3 py-2 border bg-white rounded-lg text-sm focus:ring-1"
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. Lead Arborist)"
                      value={newTeamMember.role}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                      className="px-3 py-2 border bg-white rounded-lg text-sm focus:ring-1"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Brief bio or years of experience"
                    value={newTeamMember.bio}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, bio: e.target.value })}
                    className="w-full px-3 py-2 border bg-white rounded-lg text-sm focus:ring-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTeamMember.name) return
                      setAboutContent({
                        ...aboutContent,
                        team: [...(aboutContent.team || []), newTeamMember]
                      })
                      setNewTeamMember({ name: '', role: '', bio: '' })
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1"
                  >
                    <Plus size={14} />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center border-b pb-4">
              <Phone className="mr-2 text-slate-400" />
              Contact Information & Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Company Display Name</label>
                <input
                  type="text"
                  value={contactSettings.company_name}
                  onChange={(e) => setContactSettings({ ...contactSettings, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Phone</label>
                <input
                  type="text"
                  value={contactSettings.phone}
                  onChange={(e) => setContactSettings({ ...contactSettings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={contactSettings.email}
                  onChange={(e) => setContactSettings({ ...contactSettings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Physical Address</label>
                <input
                  type="text"
                  value={contactSettings.address}
                  onChange={(e) => setContactSettings({ ...contactSettings, address: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">24/7 Emergency Service Notice Notice Notice</label>
              <textarea
                value={contactSettings.emergency_service_notice}
                onChange={(e) => setContactSettings({ ...contactSettings, emergency_service_notice: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl h-20 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Business Hours text block</label>
              <textarea
                value={contactSettings.business_hours_text}
                onChange={(e) => setContactSettings({ ...contactSettings, business_hours_text: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl h-24 text-sm font-mono"
              />
            </div>

            {/* Service Areas tag list */}
            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-bold text-slate-700">Service Coverage Areas</label>
              <div className="flex flex-wrap gap-2">
                {contactSettings.service_areas?.map((area) => (
                  <span key={area} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 flex items-center space-x-1">
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => setContactSettings({
                        ...contactSettings,
                        service_areas: contactSettings.service_areas.filter(a => a !== area)
                      })}
                      className="text-red-500 hover:text-red-700 font-extrabold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(!contactSettings.service_areas || contactSettings.service_areas.length === 0) && (
                  <span className="text-slate-400 italic text-xs">No service areas specified.</span>
                )}
              </div>
              <div className="flex space-x-2 max-w-xs">
                <input
                  type="text"
                  placeholder="Add area (e.g. Waco)"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-lg focus:ring-1 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newArea) return
                    setContactSettings({
                      ...contactSettings,
                      service_areas: [...(contactSettings.service_areas || []), newArea]
                    })
                    setNewArea('')
                  }}
                  className="bg-blue-600 text-white px-4 py-1.5 text-xs font-bold rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION LINKS TAB */}
        {activeTab === 'navigation' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center border-b pb-4">
              <Globe className="mr-2 text-slate-400" />
              Navigation Link Manager
            </h2>

            <div className="divide-y border rounded-2xl overflow-hidden bg-slate-50">
              {navLinks.map((link, idx) => (
                <div key={link.id} className="p-4 bg-white flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => moveNavLink(idx, 'up')}
                        disabled={idx === 0}
                        className="text-slate-400 hover:text-slate-800 disabled:opacity-20"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveNavLink(idx, 'down')}
                        disabled={idx === navLinks.length - 1}
                        className="text-slate-400 hover:text-slate-800 disabled:opacity-20"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{link.label}</p>
                      <p className="text-xs text-slate-400 font-mono">{link.url}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteNavLink(link.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {navLinks.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">No navigation elements. Add below!</div>
              )}
            </div>

            {/* Add nav link */}
            <div className="p-6 border rounded-2xl bg-slate-50 space-y-4">
              <p className="font-bold text-xs text-slate-600 uppercase">Add Menu Link</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Label (e.g. Services)"
                  value={newNavLink.label}
                  onChange={(e) => setNewNavLink({ ...newNavLink, label: e.target.value })}
                  className="px-3 py-2 border bg-white rounded-xl text-sm"
                />
                <input
                  type="text"
                  placeholder="URL (e.g. /services)"
                  value={newNavLink.url}
                  onChange={(e) => setNewNavLink({ ...newNavLink, url: e.target.value })}
                  className="px-3 py-2 border bg-white rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={addNavLink}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl text-sm hover:bg-blue-700 flex items-center justify-center space-x-1"
                >
                  <Plus size={16} />
                  <span>Add Link</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER TAB */}
        {activeTab === 'footer' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center border-b pb-4">
              <FileText className="mr-2 text-slate-400" />
              Footer Branding & Copyright Content
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Footer Brand Name</label>
                <input
                  type="text"
                  value={footerSettings.brandName}
                  onChange={(e) => setFooterSettings({ ...footerSettings, brandName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Footer Short Description</label>
                <textarea
                  value={footerSettings.description}
                  onChange={(e) => setFooterSettings({ ...footerSettings, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl h-20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Copyright Banner Text</label>
                <input
                  type="text"
                  value={footerSettings.copyright}
                  onChange={(e) => setFooterSettings({ ...footerSettings, copyright: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* SEO TAB */}
        {activeTab === 'seo' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center border-b pb-4">
              <Shield className="mr-2 text-slate-400" />
              SEO Title & Meta Descriptions
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Global Website Meta Title Tag</label>
                <input
                  type="text"
                  value={seoSettings.seo_title}
                  onChange={(e) => setSeoSettings({ ...seoSettings, seo_title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                  placeholder="Trinity Enterprise | Tree Removal & Trimming in Texas"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Global Website Meta Description Tag</label>
                <textarea
                  value={seoSettings.seo_description}
                  onChange={(e) => setSeoSettings({ ...seoSettings, seo_description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl h-24 text-sm"
                  placeholder="Enter a brief, keyword-rich snippet that summary of your tree services..."
                />
              </div>
            </div>
          </div>
        )}

        {/* MEDIA LIBRARY TAB */}
        {activeTab === 'media' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <FolderOpen className="mr-2 text-slate-400" />
                Media Storage Library
              </h2>
              <div className="flex gap-2">
                <select
                  value={selectedBucket}
                  onChange={(e: any) => setSelectedBucket(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider bg-white focus:outline-none"
                >
                  <option value="public-site-images">public-site-images</option>
                  <option value="gallery-images">gallery-images</option>
                  <option value="customer-files">customer-files</option>
                  <option value="receipts">receipts</option>
                  <option value="profile-images">profile-images</option>
                </select>

                <label className="bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center space-x-1 cursor-pointer">
                  {uploadingMedia ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  <span>{uploadingMedia ? 'Uploading...' : 'Upload File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleMediaUpload}
                    disabled={uploadingMedia}
                  />
                </label>
              </div>
            </div>

            {mediaLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaFiles.map((file) => {
                  const path = file.name
                  const publicUrl = (PRIVATE_BUCKETS as readonly string[]).includes(selectedBucket)
                    ? signedUrls[path] || ''
                    : supabase.storage.from(selectedBucket).getPublicUrl(path).data.publicUrl
                  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path)
                  return (
                    <div key={file.id || path} className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex flex-col justify-between space-y-3 shadow-sm hover:shadow transition-shadow group relative">
                      <div className="aspect-video bg-white border rounded-lg overflow-hidden flex items-center justify-center text-slate-300">
                        {isImage ? (
                          <img src={publicUrl} className="w-full h-full object-cover" />
                        ) : (
                          <FileText size={32} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700 truncate" title={path}>{path}</p>
                        <p className="text-[10px] text-slate-400">Size: {(file.metadata?.size / 1024 || 0).toFixed(1)} KB</p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            // Private files have links that expire, so open them instead of copying
                            if ((PRIVATE_BUCKETS as readonly string[]).includes(selectedBucket)) {
                              window.open(publicUrl, '_blank', 'noopener')
                              return
                            }
                            navigator.clipboard.writeText(publicUrl)
                            alert('Copied URL to clipboard!')
                          }}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-white border hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600"
                        >
                          <Copy size={10} />
                          <span>{(PRIVATE_BUCKETS as readonly string[]).includes(selectedBucket) ? 'Open' : 'Copy URL'}</span>
                        </button>
                        <button
                          onClick={() => deleteMediaFile(path)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-[10px] font-bold"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {mediaFiles.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-400 italic text-sm">
                    No files found inside this bucket. Upload one now!
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS BAR FOR SAVING (Excluding Media Library and Navigation tabs as they have dynamic action pipelines) */}
      {activeTab !== 'media' && activeTab !== 'navigation' && (
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-100">
          {error && (
            <div className="flex items-center text-red-600 text-sm font-medium">
              <AlertCircle size={16} className="mr-1" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center text-green-600 text-sm font-medium">
              <CheckCircle2 size={16} className="mr-1" />
              Changes saved and published!
            </div>
          )}
          <button
            onClick={handleSaveAll}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Save All Changes</span>
          </button>
        </div>
      )}
    </div>
  )
}
