// app/docs/sops/page.tsx — read-only SOP viewer. Lists generated runbooks from
// working/sops/ and renders the selected one as preformatted markdown.
import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SOPS_DIR = path.resolve(process.cwd(), 'working', 'sops')

function listSops(): string[] {
  try {
    return fs
      .readdirSync(SOPS_DIR)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort()
  } catch {
    return []
  }
}

export default function SopsPage() {
  const sops = listSops()
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Service SOPs</h1>
      <p className="text-sm text-slate-500 mb-6">
        Auto-generated from <code>docker-compose.vps.yml</code> at build time. Read-only.
      </p>
      {sops.length === 0 ? (
        <p className="text-slate-500">No SOPs generated yet. Run the build or <code>npx tsx lib/support/sopGenerator.ts</code>.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sops.map((s) => (
            <li key={s}>
              <Link href={`/docs/sops/${s.replace(/\.md$/, '')}`} className="block border rounded-lg px-4 py-3 bg-white shadow-sm hover:bg-slate-50">
                {s.replace(/\.md$/, '')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
