'use client'

import React, { useEffect } from 'react'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { EditableBlockWrapper } from '@/components/admin/EditableBlockWrapper'
import type { PageId } from '@/utils/pages'
import { BlockRenderer } from './BlockRenderer'
import { PageDataProvider, type PageData } from './PageData'
import type { PageBlock } from './types'

const NO_DATA: PageData = {}

const hasContent = (data: any) => !!data && typeof data === 'object' && Object.keys(data).length > 0

/** Renders a public page from its blocks; becomes the in-context editor for global admins. */
export default function EditablePage({
  pageId,
  initialBlocks,
  persisted,
  data = NO_DATA
}: {
  pageId: PageId
  initialBlocks: PageBlock[]
  persisted: boolean
  data?: PageData
}) {
  const { registerPage, loadedPage, blocks, editMode, previewMode, previewDevice } = useWebsiteBuilder()

  useEffect(() => {
    registerPage(pageId, initialBlocks, persisted)
  }, [pageId, initialBlocks, persisted, registerPage])

  const list = loadedPage === pageId ? blocks : initialBlocks
  const showControls = editMode && !previewMode

  // Visitors (and admins outside edit mode) only see visible, published sections
  const visible = editMode
    ? list.filter((b) => showControls || b.is_visible)
    : list.filter((b) => b.is_visible && hasContent(b.published_data))

  const frame =
    editMode && previewDevice !== 'desktop'
      ? `${previewDevice === 'mobile' ? 'max-w-[390px]' : 'max-w-[820px]'} mx-auto my-6 border-8 border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden bg-slate-50`
      : ''

  return (
    <PageDataProvider value={data}>
      <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
        <div className={frame}>
          {visible.map((block, index) =>
            showControls ? (
              <EditableBlockWrapper key={block.id} block={block} index={index} total={visible.length}>
                <BlockRenderer block={block} />
              </EditableBlockWrapper>
            ) : (
              <BlockRenderer key={block.id} block={block} />
            )
          )}

          {showControls && visible.length === 0 && (
            <div className="max-w-xl mx-auto my-24 text-center border-2 border-dashed border-slate-300 rounded-3xl p-12 text-slate-500">
              <p className="font-bold text-slate-700">This page has no sections yet.</p>
              <p className="text-sm mt-1">Use “Add Section” in the editor toolbar to start building it.</p>
            </div>
          )}
        </div>
      </div>
    </PageDataProvider>
  )
}
