import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, Search, Trash2, Edit, ImageIcon, Star, Globe, Lock } from 'lucide-react'
import { Database } from '@/types/database.types'
import GalleryFiltersManager from '@/components/admin/GalleryFiltersManager'

type GalleryItem = Database['public']['Tables']['gallery_items']['Row']

export default async function AdminGalleryPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('gallery_items')
    .select('*, gallery_item_filters(gallery_filters(name))')
    .order('sort_order', { ascending: true })

  const typedItems = (items as unknown as (GalleryItem & { gallery_item_filters?: { gallery_filters: { name: string } | null }[] })[]) || []
  const filterNames = (item: (typeof typedItems)[number]) =>
    (item.gallery_item_filters || []).map((link) => link.gallery_filters?.name).filter(Boolean).join(', ')

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gallery</h1>
          <p className="text-slate-500 mt-1">Manage your project showcase and before/after photos.</p>
        </div>
        <Link
          href="/admin/gallery/new"
          className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-200"
        >
          <Plus size={20} />
          <span>Add Gallery Item</span>
        </Link>
      </div>

      <GalleryFiltersManager />

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search gallery..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {typedItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
            <div className="aspect-video relative bg-slate-100 border-b border-slate-100">
              {item.after_image ? (
                <img src={item.after_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={40} />
                </div>
              )}
              <div className="absolute top-3 left-3 flex space-x-2">
                {item.is_featured && (
                  <span className="p-1.5 bg-yellow-400 text-white rounded-lg shadow-sm">
                    <Star size={14} fill="currentColor" />
                  </span>
                )}
                {item.is_published ? (
                  <span className="px-2 py-1 bg-green-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm tracking-wider">
                    Live
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-slate-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm tracking-wider">
                    Draft
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <p className="font-bold text-slate-800 line-clamp-1">{item.title}</p>
              <p className="text-xs text-slate-500 mt-1">{filterNames(item) || item.service_category || 'No filters'}</p>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Order: {item.sort_order}
                </span>
                <div className="flex space-x-1">
                  <Link
                    href={`/admin/gallery/${item.id}`}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                  >
                    <Edit size={16} />
                  </Link>
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {typedItems.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4 text-slate-300">
              <ImageIcon size={48} />
            </div>
            <p className="text-slate-500 font-medium">Your gallery is empty.</p>
            <Link href="/admin/gallery/new" className="text-purple-600 font-bold mt-2 hover:underline">
              Upload your first project
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
