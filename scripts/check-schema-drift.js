#!/usr/bin/env node
// =============================================================================
// check-schema-drift.js — guard against phantom Prisma models / mis-scoped
// tenant isolation migrations.
//
// Run in CI (ai-review.yml) and locally. Exit 1 = violation (blocks merge).
//
// Grounded against the REAL schema (not the hallucinated isolation prompt):
//   - GLOBAL_MODELS (Goal, AutonomousTask, TaskRunLog) are SYSTEM automation.
//     They must NEVER receive an `organizationId` column (decision B).
//   - Only user-data tables may get `organizationId`. If a migration adds it
//     to a GLOBAL model, fail loudly.
//   - Any CREATE/ALTER referencing a table name that does NOT exist as a model
//     in prisma/schema.prisma is a phantom model -> fail (decision: ApiKey/
//     HostingSite/ChatSession/BrowserSession/IDESession/GameTournament do not
//     exist, so migrations must not reference them).
// =============================================================================
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = process.env.SCHEMA_DRIFT_ROOT
  ? path.resolve(process.env.SCHEMA_DRIFT_ROOT)
  : path.resolve(__dirname, '..')
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma')

// System automation — intentionally global, no tenant FK.
const GLOBAL_MODELS = new Set(['Goal', 'AutonomousTask', 'TaskRunLog'])

function fail(msg) {
  console.error('\n::error:: ' + msg)
  process.exit(1)
}

function parseModels(schemaText) {
  const models = new Set()
  const map = new Map() // model -> table (@@map) when present
  const modelRe = /^\s*model\s+(\w+)/gm
  const mapRe = /@@map\("(\w+)"\)/g
  let m
  let current = null
  for (const line of schemaText.split('\n')) {
    const mm = modelRe.exec(line)
    if (mm) {
      current = mm[1]
      models.add(current)
      continue
    }
    if (current) {
      const mp = mapRe.exec(line)
      if (mp) map.set(current, mp[1])
    }
  }
  return { models, map }
}

function tableNames(models, map) {
  const names = new Set()
  for (const m of models) names.add(m) // default table name == model name
  for (const [, t] of map) names.add(t)
  return names
}

function scanMigrations(tableSet) {
  const migDir = path.join(ROOT, 'prisma', 'migrations')
  if (!fs.existsSync(migDir)) return
  let scanned = 0
  for (const dir of fs.readdirSync(migDir)) {
    const sqlPath = path.join(migDir, dir, 'migration.sql')
    if (!fs.existsSync(sqlPath)) continue
    scanned++
    const sql = fs.readFileSync(sqlPath, 'utf8')
    // ALTER TABLE "X" ADD [COLUMN] "Y"
    const alterRe = /ALTER\s+TABLE\s+"(\w+)"\s+ADD\s+(?:COLUMN\s+)?"?(\w+)"?/gi
    let a
    while ((a = alterRe.exec(sql))) {
      const table = a[1]
      const col = a[2]
      if (!tableSet.has(table)) {
        fail(`Phantom model in migration "${dir}": table "${table}" is not a model in prisma/schema.prisma. Did you invent a table?`)
      }
      if (GLOBAL_MODELS.has(table) && col.toLowerCase() === 'organizationid') {
        fail(`Migration "${dir}" adds organizationId to "${table}". ${table} is GLOBAL by design (decision B) — system automation, not tenant data. Do NOT add a tenant FK.`)
      }
    }
    // CREATE TABLE "X"
    const createRe = /CREATE\s+TABLE\s+"(\w+)"?/gi
    let c
    while ((c = createRe.exec(sql))) {
      const table = c[1]
      if (!tableSet.has(table)) {
        fail(`Phantom model in migration "${dir}": CREATE TABLE "${table}" is not a model in prisma/schema.prisma.`)
      }
    }
  }
  console.log(`OK: scanned ${scanned} migration file(s)`)
}

function scanDiffForPhantomModels(tableSet) {
  // Best-effort: a diff that introduces a reference to a non-existent table is
  // a red flag. We only inspect added migration SQL lines (where phantom
  // columns actually land). Keep it cheap and non-fatal-on-missing-git.
  try {
    const files = execSync('git diff --name-only origin/main...HEAD 2>/dev/null || true', { cwd: ROOT })
      .toString()
      .split('\n')
      .filter((f) => f.trim().endsWith('migration.sql'))
    for (const f of files) {
      const sql = fs.readFileSync(path.join(ROOT, f), 'utf8')
      const re = /(?:ALTER\s+TABLE|CREATE\s+TABLE)\s+"(\w+)"/gi
      let m
      while ((m = re.exec(sql))) {
        if (!tableSet.has(m[1])) {
          fail(`Phantom model in diff "${f}": table "${m[1]}" is not a model in prisma/schema.prisma.`)
        }
      }
    }
  } catch {
    /* git not available in this context — skip diff scan, migrations still checked */
  }
}

function main() {
  if (!fs.existsSync(SCHEMA)) fail('prisma/schema.prisma not found')
  const schemaText = fs.readFileSync(SCHEMA, 'utf8')
  const { models, map } = parseModels(schemaText)
  const tableSet = tableNames(models, map)
  console.log(`OK: schema has ${models.size} models: ${[...models].sort().join(', ')}`)
  scanMigrations(tableSet)
  scanDiffForPhantomModels(tableSet)
  console.log('OK: no schema-drift violations')
  process.exit(0)
}

main()
