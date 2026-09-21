#!/usr/bin/env node
/**
 * Secret-in-client scan (replaces the old grep gate).
 *
 * Fails if a credential-bearing name reaches a client component
 * (app/** and components/** *.tsx / *.jsx) as a HARDCODED LITERAL VALUE,
 * e.g.  NEXTAUTH_SECRET = "abc123..."   or   "S3_SECRET_KEY": "abc123..."
 *
 * Why the change: the previous gate flagged any occurrence of the NAME,
 * including UI labels ("NEEDS YOU: TURNSTILE_SECRET_KEY") and doc comments
 * ("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET"). Those carry no secret, so they
 * were noise that failed every PR. This version still catches real leaks
 * (a literal value assigned to a sensitive name) but ignores prose mentions.
 *
 * Reading process.env.X in a client component is NOT flagged: server-only
 * values are undefined in the browser, so it is not a credential leak.
 *
 * Exclusions kept from the original gate: server-only locations
 * (route.tsx / lib/ / server/), the dev-tools documentation page, and
 * NEXT_PUBLIC_* (intended to be exposed).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['app', 'components']
const EXT = /\.(tsx|jsx)$/

// Credential-bearing names (same family as before).
const SENSITIVE =
  /(LIVEKIT_[A-Z0-9_]+|NEXTAUTH_SECRET|DATABASE_URL|STRIPE_[A-Z0-9_]+|[A-Z][A-Z0-9_]*_(?:SECRET|API_KEY|PRIVATE_KEY)|PRIVATE_KEY)/

// A sensitive name followed by = or : and a quoted literal of 8+ chars.
// (No backreference: SENSITIVE.source already contains capture groups.)
const LITERAL_ASSIGN = new RegExp(
  SENSITIVE.source + '["\'`]?\\s*[:=]\\s*["\'`][^"\'`\\n]{8,}["\'`]'
)

const SKIP_PATH = /(^|\/)(route\.tsx?|lib|server)(\/|$)|dev-tools/
const ALLOW_LINE = /NEXT_PUBLIC_/

function walk(dir, out = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (EXT.test(e.name)) out.push(p)
  }
  return out
}

function stripComment(line) {
  const t = line.trimStart()
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return ''
  return line
}

const findings = []
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = path.relative(process.cwd(), file).split(path.sep).join('/')
    if (SKIP_PATH.test(rel)) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((raw, i) => {
      if (ALLOW_LINE.test(raw)) return
      const line = stripComment(raw)
      if (!line || !SENSITIVE.test(line)) return
      if (LITERAL_ASSIGN.test(line)) {
        findings.push(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`)
      }
    })
  }
}

if (findings.length) {
  console.error('::error:: Possible hardcoded credential in client code:')
  for (const f of findings) console.error('  ' + f)
  process.exit(1)
}
console.log('OK: no hardcoded credentials in client components')
