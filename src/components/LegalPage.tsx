import type { ReactNode } from 'react'

/** Shared layout for the Privacy Policy and Terms of Service. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="bg-slate-50">
      <article className="max-w-3xl mx-auto px-6 py-14 space-y-6 text-slate-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-blue-700 [&_a]:underline">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">Last updated {updated}</p>
        </header>
        {children}
      </article>
    </main>
  )
}

/** "Trinity Enterprise", "support@…", "(254) …" as one contact line. */
export function contactLine(company: { company_name?: string; email?: string; phone?: string; address?: string } | null, fallbackName: string) {
  return [company?.company_name || fallbackName, company?.address, company?.phone, company?.email].filter(Boolean).join(' · ')
}
