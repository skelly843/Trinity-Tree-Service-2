'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { TreeDeciduous, ArrowLeft, Loader2, Camera, Eye } from 'lucide-react'

export default function CustomerPhotosPage() {
  const supabase = createClient()
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPhotos() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', user.email || '')
          .limit(1)
          .maybeSingle()

        if (customer) {
          const { data } = await supabase
            .from('gallery_items')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('is_private', true)
          setPhotos(data || [])
        }
      }
      setLoading(false)
    }
    loadPhotos()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <TreeDeciduous className="text-blue-600" size={32} />
          <span className="text-2xl font-bold text-slate-900"><SiteName suffix=" Client Portal" /></span>
        </Link>
        <Link href="/portal" className="text-sm font-bold text-blue-600 hover:underline">
          Portal Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">
        <Link href="/portal" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Project Photos</h1>
          <p className="text-slate-500 mt-1">Private visual updates showing pipe repairs, remodeling framing, and finished surfaces on your properties.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {photos.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Before</p>
                    <div className="aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      {item.before_image ? (
                        <img src={item.before_image} alt="Before" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-xs">No image</div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest text-center">After</p>
                    <div className="aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                      {item.after_image ? (
                        <img src={item.after_image} alt="After" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-xs">No image</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-400 italic">No project photos uploaded for your properties yet. Check back during active construction dispatches!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
