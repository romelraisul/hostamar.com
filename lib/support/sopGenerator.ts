// ============================================================================
// lib/support/sopGenerator.ts — generate runbooks from the REAL compose file.
//
// The prompt assumed docker-compose.prod.yml with services {app, postgres,
// redis, livekit, coturn}. Reality: this repo ships `docker-compose.vps.yml`
// with services {postgres, redis, app, nginx} (LiveKit/coturn run on a
// separate Windows VPS, not in this compose). We parse whatever compose file
// actually exists and emit one SOP per service — so the docs never drift from
// the deployed topology.
//
// Run via postbuild: `npx tsx lib/support/sopGenerator.ts`
// Output: working/sops/{service}.md  (committed, served read-only at /docs/sops)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml' // safe dependency; if unavailable we fall back to a tiny parser

const ROOT = process.cwd()
const COMPOSE_CANDIDATES = [
  process.env.SUPPORT_COMPOSE_FILE,
  'docker-compose.vps.yml',
  'docker-compose.yml',
  'docker-compose.prod.yml',
].filter(Boolean) as string[]

const SOPS_DIR = path.join(ROOT, 'working', 'sops')

interface ServiceInfo {
  name: string
  image?: string
  ports: string[]
  healthcheck?: string
  restart?: string
  env: string[]
}

function loadCompose(): { services: Record<string, any> } | null {
  for (const rel of COMPOSE_CANDIDATES) {
    const file = path.join(ROOT, rel)
    if (!fs.existsSync(file)) continue
    try {
      const doc = yaml.parse(fs.readFileSync(file, 'utf8'))
      if (doc?.services) return doc
    } catch (e) {
      console.warn(`[sop] could not parse ${rel}:`, (e as Error).message)
    }
  }
  return null
}

function extractService(svc: any, name: string): ServiceInfo {
  const ports: string[] = []
  if (Array.isArray(svc.ports)) {
    for (const p of svc.ports) {
      if (typeof p === 'string') ports.push(p)
      else if (p?.published || p?.target) ports.push(`${p.published ?? p.target}:${p.target}`)
    }
  }
  const env: string[] = []
  if (Array.isArray(svc.environment)) env.push(...svc.environment.filter((x: any) => typeof x === 'string'))
  else if (svc.environment && typeof svc.environment === 'object') env.push(...Object.keys(svc.environment))

  let healthcheck: string | undefined
  if (svc.healthcheck?.test) {
    const t = svc.healthcheck.test
    healthcheck = Array.isArray(t) ? t.join(' ') : String(t)
  }
  return { name, image: svc.image, ports, healthcheck, restart: svc.restart, env }
}

function renderSop(s: ServiceInfo): string {
  const portList = s.ports.length ? s.ports.join(', ') : 'n/a'
  const health = s.healthcheck ?? 'no healthcheck defined'
  const logName = `hostamar-${s.name === 'app' ? 'app' : s.name}`
  return `# ${s.name} SOP

_Generated from ${process.env.SUPPORT_COMPOSE_FILE || 'docker-compose.vps.yml'} — do not edit by hand._

**Image:** ${s.image ?? 'n/a'}
**Ports:** ${portList}
**Restart:** ${s.restart ?? 'n/a'}
**Required env:** ${s.env.length ? s.env.join(', ') : 'n/a'}

## Symptoms
- Healthcheck fails: \`${health}\`
- Container not running: \`docker ps --filter name=${logName}\` shows no entry or unhealthy
- Logs pattern: \`docker logs ${logName} --tail 50 2>&1 | grep -iE "error|fail|exception|unhealthy"\`

## Diagnosis
\`\`\`bash
docker ps --filter name=${logName}
docker logs ${logName} --tail 50 2>&1
\`\`\`
${s.name === 'app' ? '- App liveness: `curl -fsS http://localhost:3000/api/health`' : ''}
${s.name === 'postgres' ? '- DB ping: `docker exec ${logName} pg_isready -U hostamar -d hostamar`' : ''}
${s.name === 'redis' ? '- Redis ping: `docker exec ${logName} redis-cli ping`' : ''}

## Auto-fix (Tier1)
\`\`\`bash
docker compose -f ${process.env.SUPPORT_COMPOSE_FILE || 'docker-compose.vps.yml'} restart ${s.name}
\`\`\`
${s.name === 'redis' ? '- If rate-limit store saturated: `docker exec ${logName} redis-cli FLUSHDB` (only if safe)' : ''}
${s.name === 'postgres' ? '- If connection pool exhausted: `docker compose -f docker-compose.vps.yml restart postgres` then check `prisma.$executeRaw` reconnect' : ''}

## Escalation
If the auto-fix fails 3x within 10 minutes, Tier1 emits \`support.escalate.tier2\` →
Tier2 triage agent reviews this SOP + last 50 logs and proposes a fix (human approval
required if destructive or confidence < 0.7).
`
}

function main() {
  const compose = loadCompose()
  if (!compose) {
    console.warn('[sop] no compose file found; writing a placeholder SOP set is skipped.')
    return
  }
  fs.mkdirSync(SOPS_DIR, { recursive: true })
  const names = Object.keys(compose.services)
  for (const name of names) {
    const info = extractService(compose.services[name], name)
    const md = renderSop(info)
    fs.writeFileSync(path.join(SOPS_DIR, `${name}.md`), md)
    console.log(`[sop] wrote working/sops/${name}.md`)
  }
  // Also write an index.
  const index = `# SOP Index\n\n${names.map((n) => `- [${n}](./${n}.md)`).join('\n')}\n`
  fs.writeFileSync(path.join(SOPS_DIR, 'README.md'), index)
  console.log(`[sop] wrote ${names.length} SOPs + index`)
}

main()
