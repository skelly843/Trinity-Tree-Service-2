'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from 'lucide-react'

export interface GalleryFilter {
  id: string
  name: string
  sort_order: number
}

/** Loads the gallery filters in display order. */
export async function loadGalleryFilters(supabase: ReturnType<typeof createClient>): Promise<GalleryFilter[]> {
  const { data } = await supabase
    .from('gallery_filters')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return data || []
}

/** Creates a filter at the end of the list. Returns it, or an error message. */
export async function createGalleryFilter(
  supabase: ReturnType<typeof createClient>,
  name: string,
  existing: GalleryFilter[]
): Promise<{ filter?: GalleryFilter; error?: string }> {
  const clean = name.trim()
  if (!clean) return { error: 'Enter a filter name.' }
  if (existing.some((f) => f.name.trim().toLowerCase() === clean.toLowerCase())) {
    return { error: `There is already a filter called "${clean}".` }
  }
  const sort_order = existing.reduce((max, f) => Math.max(max, f.sort_order), 0) + 1
  const { data, error } = await supabase
    .from('gallery_filters')
    .insert([{ name: clean, sort_order }])
    .select('id, name, sort_order')
    .single()
  if (error) return { error: error.message }
  return { filter: data }
}

/** Panel on the admin gallery page for adding, renaming and deleting gallery filters. */
export default function GalleryFiltersManager() {
  const supabase = createClient()
  const router = useRouter()
  const [filters, setFilters] = useState<GalleryFilter[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setFilters(await loadGalleryFilters(supabase))
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await createGalleryFilter(supabase, newName, filters)
    if (err) setError(err)
    else {
      setNewName('')
      await reload()
    }
    setBusy(false)
  }

  const handleRename = async (id: string) => {
    const clean = editName.trim()
    if (!clean) return setError('Enter a filter name.')
    if (filters.some((f) => f.id !== id && f.name.trim().toLowerCase() === clean.toLowerCase())) {
      return setError(`There is already a filter called "${clean}".`)
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.from('gallery_filters').update({ name: clean }).eq('id', id)
    if (err) setError(err.message)
    else {
      setEditingId(null)
      await reload()
      router.refresh()
    }
    setBusy(false)
  }

  const handleDelete = async (filter: GalleryFilter) => {
    if (!confirm(`Delete the "${filter.name}" filter? Projects keep their photos; they just lose this tag.`)) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.from('gallery_filters').delete().eq('id', filter.id)
    if (err) setError(err.message)
    else {
      await reload()
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Tag size={18} className="text-purple-600" /> Gallery Filters
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Visitors use these buttons to filter the gallery, for example &quot;Tree Services&quot; or &quot;Concrete&quot;. Tag each project with one or more when you edit it.
        </p>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-purple-600" size={20} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) =>
            editingId === filter.id ? (
              <div key={filter.id} className="flex items-center gap-1 border border-purple-300 rounded-full pl-3 pr-1 py-1">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleRename(filter.id)
                    }
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="text-sm font-semibold text-slate-800 focus:outline-none w-36"
                  aria-label={`New name for ${filter.name}`}
                  autoFocus
                />
                <button type="button" onClick={() => handleRename(filter.id)} disabled={busy} className="p-1 text-green-600 hover:bg-green-50 rounded-full" aria-label="Save name">
                  <Check size={14} />
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full" aria-label="Cancel rename">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div key={filter.id} className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full pl-3 pr-1 py-1">
                <span className="text-sm font-semibold">{filter.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(filter.id)
                    setEditName(filter.name)
                    setError(null)
                  }}
                  className="p-1 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-full"
                  aria-label={`Rename ${filter.name}`}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(filter)}
                  disabled={busy}
                  className="p-1 text-purple-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                  aria-label={`Delete ${filter.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          )}
          {filters.length === 0 && <p className="text-sm text-slate-500 italic">No filters yet.</p>}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New filter, e.g. Tree Services"
          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
          aria-label="New filter name"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="flex items-center justify-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          <Plus size={16} /> Add Filter
        </button>
      </form>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
