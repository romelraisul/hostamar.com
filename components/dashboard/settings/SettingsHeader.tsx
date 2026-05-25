'use client'

import { Check } from 'lucide-react'

interface Props {
  saved: boolean
}

export default function SettingsHeader({ saved }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and business settings
        </p>
      </div>
      {saved && (
        <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <Check className="w-4 h-4" />
          Saved
        </div>
      )}
    </div>
  )
}
