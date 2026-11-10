'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { StoredFileLink } from '@/components/StoredFileLink'
import { Loader2, FolderOpen, FileText } from 'lucide-react'

export default function CustomerDocumentsPage() {
  const supabase = createClient()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDocs() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', user.email || '')
          .limit(1)
          .maybeSingle()

        if (customer) {
          const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
          setDocuments(data || [])
        }
      }
      setLoading(false)
    }
    loadDocs()
  }, [])

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Shared Documents</h1>
          <p className="text-slate-500 mt-1">Download contracts, plumbing specs, architectural guidelines, or official authorizations.</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Shared Project Documentation</span>
              <span className="text-xs font-semibold text-slate-500">{documents.length} Files Shared</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <FolderOpen size={22} />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">{doc.file_name || 'Specification Document'}</p>
                      <p className="text-xs text-slate-400">File Type: {doc.file_type || 'PDF'} &bull; Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <StoredFileLink value={doc.file_url} label="Open Document" />
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No contracts or authorizations shared with this account yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
