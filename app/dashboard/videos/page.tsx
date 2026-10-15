import type { Metadata } from 'next'
import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'AI Marketing Videos — Video OS | Hostamar',
  description: 'Hostamar AI Marketing Videos — ComfyUI Video OS workspace (ad generation, TTS voiceover, music).',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function VideosEmbedPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login?next=/dashboard/videos')

  // MIGRATION 2026-10-15: comfy.hostamar.com subdomain removed. The Video OS
  // is now served SAME-ORIGIN at /video-os (middleware proxies it from the
  // tunnel backend). Host-only SameSite=Lax cookie rides along natively —
  // no cross-domain cookie sharing, no SameSite=None, no login loop.
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      <iframe
        src="/video-os"
        title="Hostamar Video OS"
        className="h-full w-full"
        style={{ border: 0 }}
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  )
}
