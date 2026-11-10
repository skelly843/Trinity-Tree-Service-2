import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteTheme from "@/components/SiteTheme";
import { WebsiteBuilderProvider } from '@/context/WebsiteBuilderContext'
import { VisualEditorToolbar } from '@/components/admin/VisualEditorToolbar'
import GlobalEditorButton from '@/components/admin/GlobalEditorButton'
import { loadSiteBrand } from '@/utils/supabase/loadSiteBrand'
import { siteUrl } from '@/utils/seo'

// Geist is only used when picked in Brand & Theme (and for code-style text), so it is not
// preloaded: a preload holds back the first paint of every page.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadSiteBrand()
  const base = siteUrl()
  return {
    // Each public page sets its own title, description and canonical link; these are the defaults
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: brand.seo_title || brand.site_name,
    description: brand.seo_description,
    robots: { index: true, follow: true },
    openGraph: { type: 'website', siteName: brand.seo_title || brand.site_name, locale: 'en_US' },
    ...(brand.favicon_url ? { icons: { icon: brand.favicon_url } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // No cookies here, so public pages stay cacheable. Who is signed in is checked in the browser.
  const brand = await loadSiteBrand()

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <WebsiteBuilderProvider initialBrand={brand}>
          <SiteTheme />
          <VisualEditorToolbar />
          <Header />
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
          <GlobalEditorButton />
        </WebsiteBuilderProvider>
      </body>
    </html>
  );
}
