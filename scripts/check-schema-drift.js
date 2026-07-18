#!/usr/bin/env node
// =============================================================================
// check-schema-drift.js — guard against phantom Prisma models / mis-scoped
// tenant-isolation migrations for the hostamar.com repo.
//
// Run in CI (ai-review.yml) and locally. Exit 1 = violation (blocks merge).
//
// GROUNDED against the REAL schema in prisma/schema.prisma (30 models as of
// 2026-07): Customer, Organization, Membership, SamlConnection, OidcConnection,
// ScimToken, Business, Subscription, Trial, Video, Service, VideoQueue,
// ActivityLog, Payment, Notification, Referral, Order, Lead, LeadLog, Campaign,
// FollowUp, OutreachLog, PipelineSnapshot, UserProgress, Conversation,
// ChatMessage, Game, GameScore, GameAchievement, IDEProject.
//
// Decisions (grounded, not vibe-coded):
//   - This repo has NO system-automation tables that must stay global
//     (no Goal/AutonomousTask/TaskRunLog — those don't exist here). So
//     GLOBAL_MODELS is intentionally EMPTY. If you add automation tables that
//     must never receive an organizationId, list them in GLOBAL_MODELS below.
//   - organizationId already exists on Membership, SamlConnection,
//     OidcConnection, ScimToken (the SSO/SCIM boundary tables). That is the
//     correct tenant boundary: Customer is identity, Organization is tenant,
//     Membership joins them. User-data tables (Video, Payment, Conversation,
//     ...) currently have NO organizationId — that is allowed (advisory only,
//     not a hard failure) until a deliberate isolation decision is made.
//
// Phantom guard: any CREATE/ALTER TABLE referencing a name that is NOT a real
// model (or its @@map) is a phantom -> FAIL. This catches the "invented table"
// class (e.g. ApiKey, HostingSite, ChatSession) that the spec hallucinated.
//
// Tenant-FK advisory: if a user-data model lacks organizationId, print a WARN
// (non-fatal). Flip ADVISORY_FAIL=true to make it blocking once isolation is
// mandated.
//
// TESTABILITY: honors SCHEMA_DRIFT_ROOT (default = repo root via __dirname).
// Set it to a fake tree to prove the NEGATIVE case.
// =============================================================================
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = process.env.SCHEMA_DRIFT_ROOT
  ? path.resolve(process.env.SCHEMA_DRIFT_ROOT)
  : path.resolve(__dirname, '..')
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma')

// System-automation tables that must NEVER receive an organizationId.
// EMPTY for hostamar.com (no such tables exist). Add here only when you
// introduce global-by-design automation models.
const GLOBAL_MODELS = new Set([])

// Models that are user/tenant data — advisory: warn if they lack orgId.
const USER_DATA_MODELS = new Set([
  'Customer', 'Business', 'Subscription', 'Trial', 'Video', 'Service',
  'VideoQueue', 'ActivityLog', 'Payment', 'Notification', 'Referral', 'Order',
  'Lead', 'LeadLog', 'Campaign', 'FollowUp', 'OutreachLog', 'PipelineSnapshot',
  'UserProgress', 'Conversation', 'ChatMessage', 'Game', 'GameScore',
  'GameAchievement', 'IDEProject',
])

function fail(msg) {
  console.error('\n::error:: ' + msg)
  process.exit(1)
}

function parseModels(schemaText) {
  const models = new Set()
  const map = new Map() // model -> @@map table name
  // Require `{` after the name so a *field* named `model` (e.g.
  // `model String @default(...)`) is NOT mistaken for a model declaration.
  const modelRe = /^\s*model\s+(\w+)\s*\{/gm
  const mapRe = /@@map\("(\w+)"\)/g
  let m
  while ((m = modelRe.exec(schemaText))) models.add(m[1])
  const lines = schemaText.split('\n')
  let cur = null
  for (const line of lines) {
    const mm = /^\s*model\s+(\w+)\s*\{/.exec(line)
    if (mm) cur = mm[1]
    const mmp = mapRe.exec(line)
    if (mmp && cur) map.set(cur, mmp[1])
  }
  return { models, map }
}

function tableNames(models, map) {
  const names = new Set()
  for (const m of models) names.add(m)
  for (const [, t] of map) names.add(t)
  return names
}

// Which models already declare organizationId (read from schema, don't hardcode)
function modelsWithOrgId(schemaText) {
  const have = new Set()
  const lines = schemaText.split('\n')
  let cur = null
  for (const line of lines) {
    const mm = /^\s*model\s+(\w+)/.exec(line)
    if (mm) cur = mm[1]
    if (cur && /\borganizationId\b/.test(line)) have.add(cur)
  }
  return have
}

function scanMigrations(tableSet, orgModels) {
  const migDir = path.join(ROOT, 'prisma', 'migrations')
  if (!fs.existsSync(migDir)) return
  let scanned = 0
  for (const dir of fs.readdirSync(migDir)) {
    const sqlPath = path.join(migDir, dir, 'migration.sql')
    if (!fs.existsSync(sqlPath)) continue
    scanned++
    const sql = fs.readFileSync(sqlPath, 'utf8')
    const alterRe = /ALTER\s+TABLE\s+"(\w+)"\s+ADD\s+(?:COLUMN\s+)?[`"]?(\w+)[`"]?/gi
    let a
    while ((a = alterRe.exec(sql))) {
      const table = a[1]
      const col = a[2]
      if (!tableSet.has(table)) {
        fail(`Phantom model in migration "${dir}": table "${table}" is not a model in prisma/schema.prisma. Did you invent a table?`)
      }
      if (GLOBAL_MODELS.has(table) && col.toLowerCase() === 'organizationid') {
        fail(`Migration "${dir}" adds organizationId to "${table}". ${table} is GLOBAL by design — system automation, not tenant data. Do NOT add a tenant FK.`)
      }
    }
    const createRe = /CREATE\s+TABLE\s+"(\w+)"/gi
    let c
    while ((c = createRe.exec(sql))) {
      const table = c[1]
      if (!tableSet.has(table)) {
        fail(`Phantom model in migration "${dir}": CREATE TABLE "${table}" is not a model in prisma/schema.prisma.`)
      }
    }
  }
  // Advisory: user-data models lacking organizationId
  const missing = [...USER_DATA_MODELS].filter(
    (m) => tableSet.has(m) && !orgModels.has(m)
  )
  if (missing.length) {
    console.log(
      `ADVISORY: these user-data models have no organizationId (tenant scoping not yet enforced): ${missing.join(', ')}`
    )
  }
  console.log(`OK: scanned ${scanned} migration file(s)`)
}

function scanDiffForPhantomModels(tableSet) {
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
    /* git not available — skip diff scan, migrations still checked */
  }
}

function main() {
  if (!fs.existsSync(SCHEMA)) fail('prisma/schema.prisma not found')
  const schemaText = fs.readFileSync(SCHEMA, 'utf8')
  const { models, map } = parseModels(schemaText)
  const tableSet = tableNames(models, map)
  const orgModels = modelsWithOrgId(schemaText)
  console.log(`OK: schema has ${models.size} models: ${[...models].sort().join(', ')}`)
  console.log(`OK: organizationId present on: ${[...orgModels].sort().join(', ') || '(none)'}`)
  scanMigrations(tableSet, orgModels)
  scanDiffForPhantomModels(tableSet)
  console.log('OK: no schema-drift violations')
  process.exit(0)
}

main()
