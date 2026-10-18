'use client'

// Live PC-side render status for /admin/videos.
//
// Runs in the ADMIN's browser (not on the Worker): the Video OS session cookie
// flows through the same-origin /api/comfy proxy, so this sees the live
// ComfyUI queue + every customer's upload folder (server.py already
// restricts non-admins to their own folder). When the PC is off the fetches
// fail — we show that honestly instead of fake zeros.
// ponytail: counts + folders only; per-job prompt display would mean parsing
// ComfyUI queue graphs — add then if ever needed (the /video-os iframe below
// already shows full live detail).

import { useEffect, useState } from 'react'

type Cust = { id: string; email: string | null; name: string | null }

export default function LiveStatus({ customers }: { customers: Cust[] }) {
  const [running, setRunning] = useState<number | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  const [folders, setFolders] = useState<{ uid: string; who: string }[]>([])
  const [pcOff, setPcOff] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [status, uploads] = await Promise.all([
          fetch('/api/comfy/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/comfy/files?root=output&sub=customer_uploads', { cache: 'no-store' }).then((r) =>
            r.ok ? r.json() : null
          ),
        ])
        if (!alive) return
        setPcOff(false)
        const q = (status && status.queue) || {}
        setRunning((q.queue_running || []).length)
        setPending((q.queue_pending || []).length)
        const byId = new Map(customers.map((c) => [c.id, c.email || c.name || c.id]))
        setFolders(
          ((uploads && uploads.items) || [])
            .filter((i: any) => i.dir)
            .map((i: any) => ({ uid: i.name, who: byId.get(i.name) || i.name }))
        )
      } catch {
        if (alive) setPcOff(true)
      }
    }
    load()
    const t = setInterval(load, 15000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [customers])

  return (
    <div className="text-xs bg-white border p-2 rounded max-w-xl">
      {pcOff ? (
        <p className="font-bold text-red-700">
          Video OS backend offline — PC off or tunnel down. Render list below is the last synced DB state.
        </p>
      ) : (
        <p className="font-bold">
          ComfyUI live — running {running ?? '…'} · pending {pending ?? '…'} · customer upload folders:{' '}
          {folders.length ? folders.map((f) => f.who).join(', ') : 'none yet'}
        </p>
      )}
    </div>
  )
}
