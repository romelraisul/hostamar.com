// app/docs/sops/page.tsx — ALL SERVICES as searchable cards (the AI Store index).
//
// Replaces the old support-runbook viewer (fs.readdirSync on working/sops —
// workerd has no fs, so it always showed "No SOPs generated yet"). Content
// comes from the BUNDLED lib/docs/content.json (resolveJsonModule — no fs on
// the request path): 63 real service guides + ecosystem pages.
//
// Funnel: /docs/sops → /docs/sops/[service] → "Try it" → /api/v1 (billed
// 1cr=1TK) or /pricing (6000cr signup bonus via bKash 01822417463).
import Link from 'next/link'
import type { Metadata } from 'next'
import content from '@/lib/docs/content.json'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'All Services — 106+ Services, 120 Models | Hostamar',
  description: 'Every Hostamar service — 106+ services, 120 models, 1cr=1TK=1COIN, 6000cr signup bonus, bKash 01822417463.',
}

const BKASH = '01822417463'

export default function SopsPage() {
  const sections = (content.sections || []).filter((s: any) => s?.id && s?.title)
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <p className="text-sm mb-2"><Link href="/docs" className="underline">← /docs</Link></p>
      <h1 className="text-3xl font-bold mb-2">All Services — {sections.length} live</h1>
      <p className="text-sm text-slate-500 mb-6">
        1cr = 1TK = 1 future HOST coin · 6000cr signup bonus · bKash {BKASH} ·
        Starter 599→6000cr · Pro 1299→13000cr · Business 2999→30000cr ·
        API: OPENAI_BASE_URL=https://hostamar.com/api/v1
      </p>
      <input
        id="sops-search"
        type="search"
        placeholder="Search services…"
        className="mb-6 w-full max-w-md rounded border px-3 py-2 text-sm outline-none"
      />
      <div id="sops-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s: any) => (
          <Link
            key={s.id}
            href={`/docs/sops/${s.id}`}
            data-name={s.title.toLowerCase()}
            className="sops-card block rounded-lg border px-4 py-3 bg-white shadow-sm hover:bg-slate-50"
          >
            <div className="font-semibold text-sm">
              {s.title.replace(/\s*[—-]\s*Complete Guide[\s\S]*$/i, '')}
            </div>
            <div className="mt-1 text-xs text-slate-500">Guide · billed per call at 1cr=1TK</div>
          </Link>
        ))}
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var i=document.getElementById('sops-search'),g=document.getElementById('sops-grid');if(!i||!g)return;i.addEventListener('input',function(){var q=i.value.toLowerCase();Array.prototype.forEach.call(g.children,function(c){c.style.display=!q||c.getAttribute('data-name').indexOf(q)>=0?'':'none'})})})()`,
        }}
      />
    </div>
  )
}
