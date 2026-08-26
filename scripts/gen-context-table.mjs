// Emit docs/MODEL_CONTEXT_TABLE.md from the generated catalog.
// Run after: node scripts/gen-model-catalog.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const src = fs.readFileSync(path.join(ROOT, 'lib/gateway/model-catalog.generated.ts'), 'utf8')

// crude but reliable parse of the CATALOG_MODELS array from the generated file
const rows = [...src.matchAll(/\{\s*id:\s*(".*?"),\s*provider:\s*(".*?"),\s*context:\s*(".*?"),\s*context_length:\s*(\d+),\s*free:\s*(true|false),\s*displayName:\s*(".*?")\s*\}/g)]
  .map(m => ({ id: JSON.parse(m[1]), provider: m[2], ctx: parseInt(m[4]), free: m[5] === 'true', display: JSON.parse(m[6]) }))

const lines = [
  '# Model Context Table',
  '',
  `Generated ${new Date().toISOString()} by scripts/gen-context-table.mjs from model-catalog.generated.ts.`,
  'Context values are LIVE upstream values (kilo/openrouter metadata) or empirical probes (opencode zen).',
  'Every served label ends with `[ctx]`; /v1/chat/completions strips it before forwarding.',
  '',
  '| Model | Label | Context | Free | Route |',
  '|---|---|---|---|---|',
]
for (const r of rows.sort((a, b) => b.ctx - a.ctx || a.id.localeCompare(b.id))) {
  const label = r.ctx ? `[${r.display.match(/\[(.*)\]$/)?.[1] || '?'}]` : '[?]'
  lines.push(`| ${r.id} | ${label} | ${r.ctx.toLocaleString('en-US')} tok | ${r.free ? 'yes' : ''} | ${r.provider} |`)
}
lines.push('')
lines.push(`Total: **${rows.length}** models · free: **${rows.filter(r => r.free).length}** · ≥1M: **${rows.filter(r => r.ctx >= 900_000).length}**`)

fs.writeFileSync(path.join(ROOT, 'docs/MODEL_CONTEXT_TABLE.md'), lines.join('\n') + '\n')
console.log(`wrote docs/MODEL_CONTEXT_TABLE.md (${rows.length} rows)`)
