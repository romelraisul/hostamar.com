// app/docs/sops/[service]/page.tsx — read-only SOP detail (renders markdown).
import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SOPS_DIR = path.resolve(process.cwd(), 'working', 'sops')

export function generateStaticParams() {
  return []
}

export default function SopDetail({ params }: { params: { service: string } }) {
  const file = path.join(SOPS_DIR, `${params.service}.md`)
  if (!fs.existsSync(file)) notFound()
  const md = fs.readFileSync(file, 'utf8')
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/docs/sops" className="text-blue-600 text-sm">← All SOPs</Link>
      <pre className="mt-4 whitespace-pre-wrap bg-white border rounded-lg p-4 text-sm leading-relaxed">{md}</pre>
    </div>
  )
}
