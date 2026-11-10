'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Save,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Star,
  Upload,
  Plus
} from 'lucide-react'
import ImageUpload from './ImageUpload'
import { createGalleryFilter, loadGalleryFilters, type GalleryFilter } from './GalleryFiltersManager'
import { Database } from '@/types/database.types'

type GalleryItem = Database['public']['Tables']['gallery_items']['Row']

interface GalleryFormProps {
  initialData?: GalleryItem | null
}

export default function GalleryForm({ initialData }: GalleryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    location: initialData?.location || '',
    service_category: initialData?.service_category || '',
    before_image: initialData?.before_image || '',
    after_image: initialData?.after_image || '',
    description: initialData?.description || '',
    completion_date: initialData?.completion_date || '',
    is_featured: initialData?.is_featured ?? false,
    is_published: initialData?.is_published ?? false,
    sort_order: initialData?.sort_order || 0,
  })

  // Gallery filters this project is tagged with
  const [filters, setFilters] = useState<GalleryFilter[]>([])
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [newFilterName, setNewFilterName] = useState('')
  const [filterError, setFilterError] = useState<string | null>(null)

  useEffect(() => {
    loadGalleryFilters(supabase).then(setFilters)
    if (initialData?.id) {
      supabase
        .from('gallery_item_filters')
        .select('filter_id')
        .eq('item_id', initialData.id)
        .then(({ data }: { data: { filter_id: string }[] | null }) => setSelectedFilters((data || []).map((row) => row.filter_id)))
    }
  }, [initialData?.id])

  const toggleFilter = (id: string) =>
    setSelectedFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))

  const handleAddFilter = async () => {
    setFilterError(null)
    const { filter, error: err } = await createGalleryFilter(supabase, newFilterName, filters)
    if (err || !filter) return setFilterError(err || 'Could not add the filter.')
    setFilters((prev) => [...prev, filter])
    setSelectedFilters((prev) => [...prev, filter.id])
    setNewFilterName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const payload = {
      ...formData,
      // Kept in step with the filters for anything that still reads the old text field
      service_category: filters.filter((f) => selectedFilters.includes(f.id)).map((f) => f.name).join(', '),
      updated_at: new Date().toISOString(),
    }

    let result
    if (initialData?.id) {
      result = await supabase
        .from('gallery_items')
        .update(payload)
        .eq('id', initialData.id)
        .select('id')
        .single()
    } else {
      result = await supabase
        .from('gallery_items')
        .insert([payload])
        .select('id')
        .single()
    }

    let saveError = result.error?.message
    if (!saveError && result.data) {
      const itemId = result.data.id
      const { error: clearErr } = await supabase.from('gallery_item_filters').delete().eq('item_id', itemId)
      const { error: tagErr } = selectedFilters.length > 0
        ? await supabase.from('gallery_item_filters').insert(selectedFilters.map((filter_id) => ({ item_id: itemId, filter_id })))
        : { error: null }
      saveError = clearErr?.message || tagErr?.message
    }

    if (saveError) {
      setError(saveError)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/admin/gallery')
        router.refresh()
      }, 1500)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Project Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="e.g. Modern Backyard Pool Renovation"
                required
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-slate-700">Gallery Filters</legend>
              <p className="text-xs text-slate-500">Visitors can filter the gallery by these. Tick every one that fits this project.</p>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => {
                  const on = selectedFilters.includes(filter.id)
                  return (
                    <label
                      key={filter.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                        on ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleFilter(filter.id)}
                        className="w-4 h-4 accent-purple-600"
                      />
                      {filter.name}
                    </label>
                  )
                })}
                {filters.length === 0 && <p className="text-sm text-slate-500 italic">No filters yet. Add one below.</p>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddFilter()
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                  placeholder="Add a new filter, e.g. Concrete"
                  aria-label="New filter name"
                />
                <button
                  type="button"
                  onClick={handleAddFilter}
                  disabled={!newFilterName.trim()}
                  className="flex items-center gap-1 px-4 py-2 border border-purple-200 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-50 disabled:opacity-50"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              {filterError && <p className="text-xs font-medium text-red-600">{filterError}</p>}
            </fieldset>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Location (Optional)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="e.g. Waco, TX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none h-32"
                placeholder="Describe the project goals and results..."
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-4">Before & After Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Before Image</p>
                <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group relative overflow-hidden">
                  {formData.before_image ? (
                    <>
                      <img src={formData.before_image} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, before_image: '' }))}
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
                      >
                        <X size={14} className="text-red-500" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-xs">Upload Before Photo</span>
                    </>
                  )}
                </div>
                <ImageUpload
                  onUpload={(url) => setFormData(prev => ({ ...prev, before_image: url }))}
                  label="Upload Before Photo"
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">After Image</p>
                <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 group relative overflow-hidden">
                   {formData.after_image ? (
                    <>
                      <img src={formData.after_image} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, after_image: '' }))}
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
                      >
                        <X size={14} className="text-red-500" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-xs">Upload After Photo</span>
                    </>
                  )}
                </div>
                <ImageUpload
                  onUpload={(url) => setFormData(prev => ({ ...prev, after_image: url }))}
                  label="Upload After Photo"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="is_published" className="text-sm font-bold text-slate-700">Published</label>
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="is_featured" className="text-sm font-bold text-slate-700 flex items-center">
                  <Star size={14} className="mr-1 text-yellow-400" fill="currentColor" />
                  Featured
                </label>
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                  className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-50">
              <label className="text-sm font-bold text-slate-700">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Completion Date</label>
              <input
                type="date"
                value={formData.completion_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, completion_date: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span>{initialData?.id ? 'Update Project' : 'Save Project'}</span>
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all bg-white"
            >
              <X size={20} />
              <span>Cancel</span>
            </button>
            {error && <p className="text-red-600 text-center text-xs font-medium">{error}</p>}
            {success && <p className="text-green-600 text-center text-xs font-medium">Saved successfully!</p>}
          </div>
        </div>
      </div>
    </form>
  )
}
