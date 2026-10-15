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

  // Same-tab embed of the Video OS. SSO cookie (Domain=.hostamar.com,
  // HttpOnly) travels automatically — no token in URL, no repeated login.
  // ponytail: no postMessage token dance; cookie SSO + comfy's own 401
  // interceptor covers the fallback.
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      <iframe
        src="https://comfy.hostamar.com/"
        title="Hostamar Video OS"
        className="h-full w-full"
        style={{ border: 0 }}
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </div>
  )
}
