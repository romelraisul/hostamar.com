'use client'

/**
 * In-dashboard Game tab — embeds the existing /game lab inside the shell.
 */
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function DashboardGamePage() {
  const [ready, setReady] = useState(false)

  return (
    <div className="flex h-full flex-col p-4">
      <div className="relative min-h-[75vh] flex-1 overflow-hidden rounded-xl border bg-white">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/90 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#0E7C3A]" /> Loading Game Lab…
          </div>
        )}
        <iframe
          src="/game?embed=1"
          title="Hostamar Game Lab"
          onLoad={() => setReady(true)}
          className="h-[80vh] w-full"
        />
      </div>
    </div>
  )
}
