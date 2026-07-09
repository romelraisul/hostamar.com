'use client'

import Link from 'next/link'

// /gaming/play — the actual game surface linked 11x from the /gaming lander.
// Embeds the playable iframe (or a coming-soon shell) and cross-sells
// AI promo-video creation back into the studio funnel.
export default function GamingPlayPage() {
  return (
    <div className="min-h-screen bg-[#0E0F13] text-zinc-200">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <Link href="/gaming" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded bg-[#0E7C3A] text-white">H</span>
          Hostamar Gaming
        </Link>
        <Link
          href="/generate"
          className="rounded-full bg-[#0E7C3A] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0A5A2B]"
        >
          এই গেমের প্রোমো ভিডিও বানান
        </Link>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Play surface */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
            {/* Real game embeds here once a title is wired. Shell for now. */}
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="text-5xl">🎮</div>
              <p className="mt-3 text-sm text-zinc-400">
                গেম লোড হচ্ছে… একটি টাইটেল সিলেক্ট করুন।
              </p>
            </div>
            <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-zinc-300">
              Hostamar Cloud Game • low-latency BD node
            </div>
          </div>

          {/* Side panel */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#121419] p-4">
              <h2 className="text-sm font-semibold">আপনার গেমের প্রোমো ভিডিও</h2>
              <p className="mt-1 text-xs text-zinc-500">
                AI দিয়ে ৩০ সেকেন্ডে গেম ট্রেলার বানান, সরাসরি Facebook/YouTube এ শেয়ার করুন।
              </p>
              <Link
                href="/generate"
                className="mt-3 block rounded-full bg-[#0E7C3A] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                ভিডিও বানান
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121419] p-4">
              <h2 className="text-sm font-semibold">হোস্টিং</h2>
              <p className="mt-1 text-xs text-zinc-500">
                গেম সার্ভার হোস্ট করুন — ৫GB ফ্রি, bKash পেমেন্ট।
              </p>
              <Link
                href="/hosting"
                className="mt-3 block rounded-full border border-white/15 px-4 py-2 text-center text-sm font-medium text-zinc-200"
              >
                হোস্টিং দেখুন
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
