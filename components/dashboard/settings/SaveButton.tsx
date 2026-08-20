'use client'

import { Loader2 } from 'lucide-react'

interface Props {
  saving: boolean
  onSave: () => void
}

export default function SaveButton({ saving, onSave }: Props) {
  return (
    <div className="pt-4 border-t mt-6">
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0E7C3A] text-white text-sm font-medium rounded-lg hover:bg-[#0A5A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
