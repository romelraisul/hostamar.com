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
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
