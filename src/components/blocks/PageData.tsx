'use client'

import { createContext, useContext } from 'react'

/** Records that blocks list (services, gallery items), loaded on the server so they are in the first paint. */
export interface PageData {
  services?: any[]
  gallery?: any[]
}

const PageDataContext = createContext<PageData>({})

export const PageDataProvider = PageDataContext.Provider
export const usePageData = () => useContext(PageDataContext)
