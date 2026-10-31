'use client'

import React from 'react'
import { useWebsiteBuilder } from '@/context/WebsiteBuilderContext'
import { isLightColor } from '@/utils/siteTheme'
import HeroBlock from './HeroBlock'
import TextImageBlock from './TextImageBlock'
import FeaturesBlock from './FeaturesBlock'
import TeamBlock from './TeamBlock'
import GalleryGridBlock from './GalleryGridBlock'
import ServicesGridBlock from './ServicesGridBlock'
import ContactInfoBlock from './ContactInfoBlock'
import ContactFormBlock from './ContactFormBlock'
import RequestFormBlock from './RequestFormBlock'
import CtaBannerBlock from './CtaBannerBlock'
import ImageBlock from './ImageBlock'
import SpacerBlock from './SpacerBlock'
import type { BlockProps, PageBlock } from './types'

const COMPONENTS: Record<string, React.ComponentType<BlockProps>> = {
  hero: HeroBlock,
  text_image: TextImageBlock,
  features: FeaturesBlock,
  team: TeamBlock,
  gallery_grid: GalleryGridBlock,
  services_grid: ServicesGridBlock,
  contact_info: ContactInfoBlock,
  contact_form: ContactFormBlock,
  request_form: RequestFormBlock,
  cta_banner: CtaBannerBlock,
  image: ImageBlock,
  spacer: SpacerBlock
}

export function BlockRenderer({ block }: { block: PageBlock }) {
  const { editMode, previewMode, updateBlockData } = useWebsiteBuilder()
  const Component = COMPONENTS[block.block_type]
  const editable = editMode && !previewMode

  if (!Component) {
    return editable ? (
      <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-amber-700">
        Unknown section type “{block.block_type}”. Delete it or add a component for it in BlockRenderer.
      </div>
    ) : null
  }

  const data = (editMode ? block.draft_data : block.published_data) || {}
  const content = (
    <Component block={block} data={data} editable={editable} update={(patch) => updateBlockData(block.id, patch)} />
  )

  // The hero draws its own background
  const style = data._style
  if (block.block_type === 'hero' || !style) return content

  const color = /^#[0-9a-f]{6}$/i.test(style.bgColor || '') ? style.bgColor : ''
  const overlay = style.bgImage ? style.overlay || 'dark' : ''
  const onDark = overlay === 'dark' || (!style.bgImage && !!color && !isLightColor(color))

  return (
    <div
      className={`relative ${onDark ? 'block-on-dark' : ''} ${style.align ? `block-align-${style.align}` : ''} ${
        style.spacing && style.spacing !== 'normal' ? `block-space-${style.spacing}` : ''
      }`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {style.bgImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={style.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {overlay === 'dark' && <div className="absolute inset-0 bg-black/55" />}
      {overlay === 'light' && <div className="absolute inset-0 bg-white/75" />}
      <div className="relative">{content}</div>
    </div>
  )
}
