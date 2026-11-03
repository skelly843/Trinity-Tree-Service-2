'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import { InlineText } from '@/components/admin/InlineText'
import { EditableLink } from './shared'
import type { BlockProps } from './types'

export default function CtaBannerBlock({ data, editable, update }: BlockProps) {
  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-blue-600 text-white rounded-3xl px-8 py-12 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-xl shadow-blue-100">
          <div className="space-y-2 max-w-2xl">
            <InlineText
              element="h2"
              value={data.title || ''}
              onChange={(title) => update({ title })}
              placeholder="Banner headline"
              className="text-2xl md:text-3xl font-extrabold tracking-tight block"
            />
            <InlineText
              element="p"
              value={data.body || ''}
              onChange={(body) => update({ body })}
              placeholder="Supporting text"
              className="text-white block"
            />
          </div>
          <EditableLink
            href={data.buttonUrl}
            text={data.buttonText || ''}
            editable={editable}
            onChange={({ text, href }) =>
              update({ ...(text !== undefined && { buttonText: text }), ...(href !== undefined && { buttonUrl: href }) })
            }
            icon={<ArrowRight size={16} />}
            className="shrink-0 bg-white text-blue-700 hover:bg-blue-50 px-6 py-3.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-1.5 shadow"
          />
        </div>
      </div>
    </section>
  )
}
