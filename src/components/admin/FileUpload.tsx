'use client'

import { useState } from 'react'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { shrinkImage } from '@/utils/shrinkImage'
import { storedFileName, storedFileRef } from '@/utils/storedFiles'

interface FileUploadProps {
  /** Private bucket the file goes into */
  bucket: 'receipts' | 'customer-files'
  /**
   * Folder inside the bucket. Staff other than the global admin can only upload into a
   * folder named after a customer they are assigned to, so pass the customer id when known.
   */
  folder?: string
  value: string
  onChange: (ref: string, file?: File) => void
  label?: string
  accept?: string
}

/** Uploads a photo or PDF to a private bucket and returns a storage reference for the record. */
export function FileUpload({ bucket, folder, value, onChange, label = 'Upload file', accept = 'image/*,application/pdf' }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0]
    e.target.value = ''
    if (!original) return
    setUploading(true)
    setError(null)
    try {
      const file = original.type.startsWith('image/') ? await shrinkImage(original) : original
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80)
      const path = `${folder ? `${folder}/` : ''}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const { error: uploadError } = await createClient().storage.from(bucket).upload(path, file, {
        contentType: file.type || undefined
      })
      if (uploadError) throw uploadError
      onChange(storedFileRef(bucket, path), file)
    } catch (err: any) {
      setError(err?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</span>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm">
          <FileText size={16} className="text-blue-600 shrink-0" />
          <span className="truncate flex-1">{storedFileName(value)}</span>
          <button type="button" onClick={() => onChange('')} className="text-slate-400 hover:text-red-600" aria-label="Remove file">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 cursor-pointer">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          <span>{uploading ? 'Uploading…' : 'Choose a photo or PDF'}</span>
          <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
