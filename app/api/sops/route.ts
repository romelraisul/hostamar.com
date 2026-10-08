import { NextRequest, NextResponse } from 'next/server'

/**
 * /api/sops — service index for /docs/sops/[service] pages.
 *
 * Reads lib/docs/content.json at module load — it is BUNDLED by the Next.js
 * build (resolveJsonModule), so workerd never touches fs on the request path.
 * 63 real service sections (id/title/40KB html each) + 3 ecosystem pages.
 */
import content from '@/lib/docs/content.json'

export const dynamic = 'force-static'

export async function GET() {
  const sections = (content.sections || []).filter((s: any) => s?.id && s?.title)
  return NextResponse.json({
    count: sections.length,
    services: sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      // strip the boilerplate tail so cards stay one line
      name: s.title.replace(/\s*[—-]\s*Complete Guide.*$/i, '').replace(/\s*[—-]\s*9000 Words.*$/i, ''),
      href: `/docs/sops/${s.id}`,
    })),
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
