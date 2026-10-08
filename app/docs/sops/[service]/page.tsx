// app/docs/sops/[service]/page.tsx — ONE service page: full 9k-word guide
// (rendered from the BUNDLED lib/docs/content.json — workerd-safe, no fs) +
// AI Store monetization card: Try-it curl against /api/v1 (billed 1cr=1TK),
// bKash top-up, pricing tiers.
//
// Replaces the old fs.existsSync/readFileSync runbook viewer (always notFound
// on workerd). 63 real services resolve here; unknown slugs → notFound().
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import content from '@/lib/docs/content.json'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return (content.sections || [])
    .filter((s: any) => s?.id && s?.title)
    .map((s: any) => ({ service: s.id }))
}

const BKASH = '01822417463'

// ponytail: render guide HTML with dangerouslySetInnerHTML — content.json is
// first-party build output, not user input. Sanitize if it ever takes user data.
export function generateMetadata({ params }: { params: { service: string } }): Metadata {
  const s = (content.sections || []).find((x: any) => x?.id === params.service)
  if (!s) return { title: 'Service | Hostamar' }
  const name = s.title.replace(/\s*[—-]\s*Complete Guide[\s\S]*$/i, '')
  return {
    title: `${name} — Complete Guide | Hostamar`,
    description: `${name}: full guide, API access at 1cr=1TK, 6000cr signup bonus.`,
  }
}

export default function SopDetail({ params }: { params: { service: string } }) {
  const s = (content.sections || []).find((x: any) => x?.id === params.service)
  if (!s) notFound()
  const name = s.title.replace(/\s*[—-]\s*Complete Guide[\s\S]*$/i, '')
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <p className="text-sm mb-2">
        <Link href="/docs/sops" className="underline">← All Services</Link>
        <span className="mx-2 text-slate-400">·</span>
        <Link href="/docs" className="underline">/docs</Link>
      </p>
      <h1 className="text-2xl font-bold">{name}</h1>

      {/* AI Store card — the monetization funnel */}
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="font-semibold text-sm text-green-900">Use this service — billed per call at 1cr=1TK=1COIN</div>
        <pre className="mt-2 overflow-x-auto rounded bg-black text-green-400 p-3 text-xs leading-relaxed">{`curl -X POST https://hostamar.com/api/v1/chat/completions \\
  -H "Authorization: Bearer hk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"hostamar-1m-a","messages":[{"role":"user","content":"${name} — get started"}]}'`}</pre>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href="/api/keys" className="rounded bg-green-700 px-3 py-1.5 font-medium text-white hover:bg-green-800">Get API key</a>
          <a href="/pricing" className="rounded border border-green-700 px-3 py-1.5 font-medium text-green-800 hover:bg-green-100">Top-up: 6000cr — bKash {BKASH}</a>
        </div>
        <p className="mt-2 text-xs text-green-800">
          Starter 599→6000cr · Pro 1299→13000cr · Business 2999→30000cr · 120 models · 6000cr signup bonus
        </p>
      </div>

      {/* The full 9k-word guide */}
      <div
        className="sop-guide prose mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: s.html || '' }}
      />
    </div>
  )
}
