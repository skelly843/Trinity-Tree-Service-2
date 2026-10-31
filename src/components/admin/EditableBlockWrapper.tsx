'use client'

import React, { useState } from 'react'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { getBlockDefinition } from '@/components/blocks/registry'
import type { PageBlock } from '@/components/blocks/types'
import { SectionStylePanel } from '@/components/admin/SectionStylePanel'
import {
  Paintbrush,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  GripVertical
} from 'lucide-react'

const DRAG_TYPE = 'application/x-page-block-index'

interface EditableBlockWrapperProps {
  block: PageBlock
  index: number
  total: number
  children: React.ReactNode
}

/** Edit-mode chrome around one section: drag handle, reorder, hide, duplicate, delete. */
export const EditableBlockWrapper: React.FC<EditableBlockWrapperProps> = ({ block, index, total, children }) => {
  const { moveBlock, moveBlockTo, duplicateBlock, deleteBlock, toggleBlockVisibility } = useWebsiteBuilder()
  const [dropSide, setDropSide] = useState<'before' | 'after' | null>(null)
  const [dragging, setDragging] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const label = getBlockDefinition(block.block_type)?.label || block.block_type

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, String(index))
    e.dataTransfer.effectAllowed = 'move'
    const section = (e.currentTarget as HTMLElement).closest('[data-block-wrapper]') as HTMLElement | null
    if (section) e.dataTransfer.setDragImage(section, 24, 24)
    setDragging(true)
  }

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDropSide(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
  }

  const onDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(DRAG_TYPE)
    setDropSide(null)
    if (raw === '') return
    e.preventDefault()
    const from = Number(raw)
    moveBlockTo(from, dropSide === 'after' ? index + 1 : index)
  }

  return (
    <div
      id={`block-${block.id}`}
      data-block-wrapper
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropSide(null)
      }}
      onDrop={onDrop}
      className={`relative group outline-2 outline-dashed -outline-offset-2 transition-[outline-color,opacity] ${
        block.is_visible ? 'outline-blue-300 hover:outline-blue-500' : 'outline-slate-300'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      {dropSide && (
        <div
          className={`absolute left-0 right-0 h-1.5 bg-blue-600 rounded-full z-[60] pointer-events-none ${
            dropSide === 'before' ? '-top-1' : '-bottom-1'
          }`}
        />
      )}

      {/* Section toolbar */}
      <div className="absolute top-2 left-2 z-50 bg-slate-900/95 text-white rounded-xl shadow-lg px-1.5 py-1 flex items-center gap-1 border border-slate-700 select-none text-xs">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={() => {
            setDragging(false)
            setDropSide(null)
          }}
          className="p-1 rounded hover:bg-slate-700 cursor-grab active:cursor-grabbing text-slate-300"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </span>
        <span className="font-bold text-[10px] uppercase text-blue-300 tracking-wider pr-1">{label}</span>

        <button
          type="button"
          onClick={() => setStyleOpen(!styleOpen)}
          className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${styleOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
          title="Background, alignment and spacing"
        >
          <Paintbrush size={13} />
          <span>Style</span>
        </button>

        <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1">
          <button
            type="button"
            onClick={() => moveBlock(index, 'up')}
            disabled={index === 0}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-25 text-slate-300"
            title="Move section up"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => moveBlock(index, 'down')}
            disabled={index === total - 1}
            className="p-1 hover:bg-slate-700 rounded disabled:opacity-25 text-slate-300"
            title="Move section down"
          >
            <ArrowDown size={13} />
          </button>
          <button
            type="button"
            onClick={() => toggleBlockVisibility(block.id)}
            className="p-1 hover:bg-slate-700 rounded text-slate-300"
            title={block.is_visible ? 'Hide section from visitors' : 'Show section to visitors'}
          >
            {block.is_visible ? <Eye size={13} /> : <EyeOff size={13} className="text-amber-400" />}
          </button>
          <button
            type="button"
            onClick={() => duplicateBlock(block.id)}
            className="p-1 hover:bg-slate-700 rounded text-slate-300"
            title="Duplicate section"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete this ${label} section? You can undo until you save.`)) deleteBlock(block.id)
            }}
            className="p-1 hover:bg-red-600 rounded text-red-300 hover:text-white"
            title="Delete section"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {styleOpen && <SectionStylePanel block={block} onClose={() => setStyleOpen(false)} />}

      <div className={`relative ${block.is_visible ? '' : 'opacity-50'}`}>
        {!block.is_visible && (
          <div className="absolute top-2 right-2 z-40 pointer-events-none">
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded shadow-sm">
              Hidden from visitors
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
