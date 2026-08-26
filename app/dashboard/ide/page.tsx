'use client'

/**
 * In-dashboard IDE tab — embeds the existing /ide workspace inside the
 * dashboard shell so customers never leave /dashboard/*.
 */
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function DashboardIdePage() {
  const [ready, setReady] = useState(false)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="relative min-h-[75vh] flex-1 overflow-hidden rounded-xl border bg-white">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/90 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#0E7C3A]" /> Loading IDE…
          </div>
        )}
        <iframe
          src="/ide?embed=1"
          title="Hostamar IDE"
          onLoad={() => setReady(true)}
          className="h-[80vh] w-full"
        />
      </div>
    </div>
  )
}
