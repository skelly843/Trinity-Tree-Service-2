'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { pathToPageId, type PageId } from '@/utils/pages'
import { getBlockDefinition } from '@/components/blocks/registry'
import type { PageBlock } from '@/components/blocks/types'
import { ToastViewport, type Toast } from '@/components/admin/ToastViewport'
import { DEFAULT_BRAND, type SiteBrand } from '@/utils/siteTheme'

export type { PageBlock } from '@/components/blocks/types'

interface History {
  past: PageBlock[][]
  present: PageBlock[]
  future: PageBlock[][]
}

interface WebsiteBuilderContextType {
  /** true only for an active global admin who has switched the editor on */
  editMode: boolean
  setEditMode: (mode: boolean) => void
  previewMode: boolean
  setPreviewMode: (mode: boolean) => void
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void
  /** page id for the current path, or null when the path is not an editable page */
  currentPage: PageId | null
  /** page whose blocks are loaded into the editor */
  loadedPage: PageId | null
  registerPage: (pageId: PageId, blocks: PageBlock[], persisted: boolean) => void
  blocks: PageBlock[]
  /** site-wide brand & theme; edits preview live until saved */
  styles: SiteBrand
  setStyles: React.Dispatch<React.SetStateAction<SiteBrand>>
  brandDirty: boolean
  saveBrand: () => Promise<void>
  resetBrand: () => void
  isGlobalAdmin: boolean
  saving: boolean
  isDirty: boolean
  saveDraft: () => Promise<void>
  publishLive: () => Promise<void>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  updateBlockData: (id: string, patch: Record<string, any>) => void
  moveBlock: (index: number, direction: 'up' | 'down') => void
  moveBlockTo: (from: number, insertAt: number) => void
  addBlock: (blockType: string) => string
  deleteBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  toggleBlockVisibility: (id: string) => void
  showToast: (kind: Toast['kind'], message: string) => void
}

const WebsiteBuilderContext = createContext<WebsiteBuilderContextType | undefined>(undefined)

const HISTORY_LIMIT = 100

const serialize = (blocks: PageBlock[]) =>
  JSON.stringify(
    blocks.map((b) => [b.id, b.block_type, b.display_order, b.is_visible, b.draft_data])
  )

const renumber = (blocks: PageBlock[]) =>
  blocks.map((b, i) => (b.display_order === (i + 1) * 10 ? b : { ...b, display_order: (i + 1) * 10 }))

const newId = () =>
  `new-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36)}`

/** Turns a Supabase/PostgREST error into a message that says what to do next. */
function describeError(error: any): string {
  const message = error?.message || String(error)
  const code = error?.code
  if (code === 'PGRST205' || code === 'PGRST204' || code === '42P01' || code === '42703' || /does not exist|schema cache/i.test(message)) {
    return `${message} — run supabase/migrations/003_page_editor.sql and 004_site_branding.sql in the Supabase SQL Editor.`
  }
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return `${message} — your profile must be an active global_admin, and migration 003 must be applied.`
  }
  return message
}

const RLS_SILENT_BLOCK =
  'Supabase accepted the request but changed no rows — row-level security blocked the write. Your profile must be an active global_admin.'

export const WebsiteBuilderProvider: React.FC<{
  children: React.ReactNode
  initialIsGlobalAdmin?: boolean
  initialBrand?: SiteBrand
}> = ({ children, initialIsGlobalAdmin = false, initialBrand = DEFAULT_BRAND }) => {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const currentPage = pathToPageId(pathname)

  const [isGlobalAdmin, setIsGlobalAdmin] = useState(initialIsGlobalAdmin)
  const [editModeRaw, setEditModeRaw] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [savedBrand, setSavedBrand] = useState<SiteBrand>(initialBrand)
  const [styles, setStylesState] = useState<SiteBrand>(initialBrand)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const [loadedPage, setLoadedPage] = useState<PageId | null>(null)
  const [history, setHistory] = useState<History>({ past: [], present: [], future: [] })
  const [savedSnapshot, setSavedSnapshot] = useState('')
  // ids that exist in page_blocks for the loaded page; anything missing at save time is deleted
  const persistedIds = useRef<Set<string>>(new Set())
  const historyRef = useRef(history)
  historyRef.current = history

  const editMode = isGlobalAdmin && editModeRaw && currentPage !== null
  const blocks = history.present
  const stylesDirty = JSON.stringify(styles) !== JSON.stringify(savedBrand)
  const isDirty = (loadedPage !== null && serialize(blocks) !== savedSnapshot) || stylesDirty

  // ---------- toasts ----------
  const showToast = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 9000 : 4000)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  // ---------- role: server value is authoritative on load; re-check on sign in/out ----------
  useEffect(() => {
    setIsGlobalAdmin(initialIsGlobalAdmin)
  }, [initialIsGlobalAdmin])

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setIsGlobalAdmin(false)
          setEditModeRaw(false)
          return
        }
        if (event !== 'SIGNED_IN' && event !== 'USER_UPDATED') return
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', session.user.id)
          .single()
        setIsGlobalAdmin(profile?.role === 'global_admin' && profile?.is_active === true)
      })
      subscription = data?.subscription ?? null
    } catch (err) {
      console.warn('Auth listener unavailable:', err)
    }
    return () => subscription?.unsubscribe()
  }, [supabase])

  // ---------- open a page straight in the editor (links from the Website Editor dashboard) ----------
  useEffect(() => {
    if (!isGlobalAdmin || !currentPage) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('edit') !== '1') return
    setEditModeRaw(true)
    url.searchParams.delete('edit')
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [isGlobalAdmin, currentPage])

  // ---------- brand & theme (loaded on the server; edits preview live until saved) ----------
  const setStyles = setStylesState
  const resetBrand = useCallback(() => setStylesState(savedBrand), [savedBrand])

  const writeBrand = useCallback(
    async (brand: SiteBrand) => {
      const { data, error } = await supabase
        .from('global_styles')
        .upsert({ id: 'default', ...brand, updated_at: new Date().toISOString() })
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error(RLS_SILENT_BLOCK)
      setSavedBrand(brand)
    },
    [supabase]
  )

  const saveBrand = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      await writeBrand(styles)
      showToast('success', 'Brand & theme saved — visitors now see it.')
      router.refresh()
    } catch (err: any) {
      showToast('error', `Saving brand failed: ${describeError(err)}`)
    } finally {
      setSaving(false)
    }
  }, [saving, writeBrand, styles, showToast, router])

  // ---------- page registration ----------
  const registerPage = useCallback((pageId: PageId, initial: PageBlock[], persisted: boolean) => {
    persistedIds.current = new Set(persisted ? initial.map((b) => b.id) : [])
    setHistory({ past: [], present: initial, future: [] })
    setSavedSnapshot(serialize(initial))
    setLoadedPage(pageId)
  }, [])

  // ---------- history ----------
  const commit = useCallback((fn: (blocks: PageBlock[]) => PageBlock[]) => {
    setHistory((h) => {
      const next = fn(h.present)
      if (next === h.present) return h
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    })
  }, [])

  // ---------- block operations ----------
  const updateBlockData = useCallback(
    (id: string, patch: Record<string, any>) => {
      commit((bs) => {
        const target = bs.find((b) => b.id === id)
        if (!target) return bs
        const merged = { ...target.draft_data, ...patch }
        if (JSON.stringify(merged) === JSON.stringify(target.draft_data)) return bs
        return bs.map((b) => (b.id === id ? { ...b, draft_data: merged } : b))
      })
    },
    [commit]
  )

  const moveBlockTo = useCallback(
    (from: number, insertAt: number) => {
      commit((bs) => {
        if (from < 0 || from >= bs.length) return bs
        const target = Math.max(0, Math.min(bs.length, insertAt))
        if (target === from || target === from + 1) return bs
        const next = [...bs]
        const [moved] = next.splice(from, 1)
        next.splice(target > from ? target - 1 : target, 0, moved)
        return renumber(next)
      })
    },
    [commit]
  )

  const moveBlock = useCallback(
    (index: number, direction: 'up' | 'down') => {
      moveBlockTo(index, direction === 'up' ? index - 1 : index + 2)
    },
    [moveBlockTo]
  )

  const addBlock = useCallback(
    (blockType: string) => {
      const def = getBlockDefinition(blockType)
      const id = newId()
      commit((bs) =>
        renumber([
          ...bs,
          {
            id,
            page_id: loadedPage || currentPage || 'home',
            block_type: blockType,
            display_order: 0,
            is_visible: true,
            draft_data: def ? def.defaults() : {},
            published_data: {}
          }
        ])
      )
      return id
    },
    [commit, loadedPage, currentPage]
  )

  const deleteBlock = useCallback((id: string) => commit((bs) => renumber(bs.filter((b) => b.id !== id))), [commit])

  const duplicateBlock = useCallback(
    (id: string) => {
      commit((bs) => {
        const idx = bs.findIndex((b) => b.id === id)
        if (idx === -1) return bs
        const copy: PageBlock = {
          ...bs[idx],
          id: newId(),
          draft_data: JSON.parse(JSON.stringify(bs[idx].draft_data)),
          published_data: {}
        }
        const next = [...bs]
        next.splice(idx + 1, 0, copy)
        return renumber(next)
      })
    },
    [commit]
  )

  const toggleBlockVisibility = useCallback(
    (id: string) => commit((bs) => bs.map((b) => (b.id === id ? { ...b, is_visible: !b.is_visible } : b))),
    [commit]
  )

  // ---------- saving ----------
  const persist = useCallback(
    async (publish: boolean) => {
      const pageId = loadedPage
      if (!pageId || saving) return
      setSaving(true)
      try {
        const current = renumber(historyRef.current.present)
        const known = persistedIds.current
        const keep = new Set(current.filter((b) => known.has(b.id)).map((b) => b.id))
        const toDelete = [...known].filter((id) => !keep.has(id))
        const now = new Date().toISOString()

        // 1. Sections removed in the editor
        if (toDelete.length > 0) {
          const { data, error } = await supabase.from('page_blocks').delete().in('id', toDelete).select('id')
          if (error) throw error
          if (!data || data.length === 0) throw new Error(RLS_SILENT_BLOCK)
        }

        // 2. Existing sections
        const existing = current.filter((b) => known.has(b.id))
        if (existing.length > 0) {
          const rows = existing.map((b) => ({
            id: b.id,
            page_id: pageId,
            block_type: b.block_type,
            display_order: b.display_order,
            is_visible: b.is_visible,
            draft_data: b.draft_data,
            ...(publish ? { published_data: b.draft_data } : {}),
            updated_at: now
          }))
          const { data, error } = await supabase.from('page_blocks').upsert(rows, { onConflict: 'id' }).select('id')
          if (error) throw error
          if (!data || data.length !== rows.length) throw new Error(RLS_SILENT_BLOCK)
        }

        // 3. New sections (never published until Publish is pressed)
        const fresh = current.filter((b) => !known.has(b.id))
        const idMap = new Map<string, string>()
        if (fresh.length > 0) {
          const rows = fresh.map((b) => ({
            page_id: pageId,
            block_type: b.block_type,
            display_order: b.display_order,
            is_visible: b.is_visible,
            draft_data: b.draft_data,
            published_data: publish ? b.draft_data : {}
          }))
          const { data, error } = await supabase.from('page_blocks').insert(rows).select('id')
          if (error) throw error
          if (!data || data.length !== rows.length) throw new Error(RLS_SILENT_BLOCK)
          fresh.forEach((b, i) => idMap.set(b.id, data[i].id))
        }

        // 4. Re-read what the database now holds
        const { data: saved, error: readError } = await supabase
          .from('page_blocks')
          .select('id, page_id, block_type, display_order, is_visible, draft_data, published_data')
          .eq('page_id', pageId)
          .order('display_order', { ascending: true })
        if (readError) throw readError
        const savedBlocks = (saved || []) as PageBlock[]

        // 5. Revision snapshot on publish
        if (publish) {
          const { data: auth } = await supabase.auth.getUser()
          const { error } = await supabase.from('content_revisions').insert([
            { page_id: pageId, blocks_snapshot: savedBlocks, created_by: auth?.user?.id ?? null }
          ])
          if (error) throw error
        }

        if (stylesDirty) await writeBrand(styles)

        // Keep undo/redo usable: swap temporary ids for the real ones everywhere in history
        const remap = (bs: PageBlock[]) =>
          bs.map((b) => (idMap.has(b.id) ? { ...b, id: idMap.get(b.id)!, page_id: pageId } : b))
        persistedIds.current = new Set(savedBlocks.map((b) => b.id))
        setHistory((h) => ({ past: h.past.map(remap), present: savedBlocks, future: h.future.map(remap) }))
        setSavedSnapshot(serialize(savedBlocks))

        showToast('success', publish ? 'Published — visitors now see these changes.' : 'Draft saved.')
        if (publish) router.refresh()
      } catch (err: any) {
        showToast('error', `${publish ? 'Publish' : 'Save'} failed: ${describeError(err)}`)
      } finally {
        setSaving(false)
      }
    },
    [loadedPage, saving, supabase, stylesDirty, styles, writeBrand, showToast, router]
  )

  const saveDraft = useCallback(() => persist(false), [persist])
  const publishLive = useCallback(() => persist(true), [persist])

  // ---------- leave-page protection ----------
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    // Client-side <Link> navigation never fires beforeunload, so intercept link clicks too
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank') return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) return
      if (!window.confirm('You have unsaved changes on this page. Leave without saving?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [isDirty])

  // ---------- keyboard undo/redo (outside text fields, which keep native undo) ----------
  useEffect(() => {
    if (!editMode) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      if (e.key.toLowerCase() === 'y' || e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editMode, undo, redo])

  const setEditMode = useCallback(
    (mode: boolean) => {
      setEditModeRaw(mode && isGlobalAdmin)
      if (!mode) setPreviewMode(false)
    },
    [isGlobalAdmin]
  )

  return (
    <WebsiteBuilderContext.Provider
      value={{
        editMode,
        setEditMode,
        previewMode,
        setPreviewMode,
        previewDevice,
        setPreviewDevice,
        currentPage,
        loadedPage,
        registerPage,
        blocks,
        styles,
        setStyles,
        brandDirty: stylesDirty,
        saveBrand,
        resetBrand,
        isGlobalAdmin,
        saving,
        isDirty,
        saveDraft,
        publishLive,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        updateBlockData,
        moveBlock,
        moveBlockTo,
        addBlock,
        deleteBlock,
        duplicateBlock,
        toggleBlockVisibility,
        showToast
      }}
    >
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </WebsiteBuilderContext.Provider>
  )
}

export const useWebsiteBuilder = () => {
  const context = useContext(WebsiteBuilderContext)
  if (context === undefined) {
    throw new Error('useWebsiteBuilder must be used within a WebsiteBuilderProvider')
  }
  return context
}
