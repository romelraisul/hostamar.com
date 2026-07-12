// ============================================================================
// SkillsProvider — progressive skill loading (Microsoft Foundry pattern).
//
// The LLM is initially given ONLY skill names + descriptions (cheap context).
// When the agent's intent matches a description, the full SKILL.md body is
// loaded on demand and injected. This keeps token usage low while still
// giving the model deep instructions when relevant.
//
// Sources are aggregated:
//   • FileSkillsSource   — discovers /skills/*/SKILL.md on disk
//   • MCPSkillsSource     — stub for future Foundry MCP skill servers
//   • AggregatingSkillsSource — merges all sources, de-duplicated by name
// ============================================================================
import { promises as fs } from 'fs'
import path from 'path'

export interface Skill {
  name: string
  description: string
  body?: string // loaded lazily
  source: string
}

export interface SkillsSource {
  name: string
  list(): Promise<Skill[]>
  loadBody(_skill: Skill): Promise<string | null>
}

// ----------------------------------------------------------------------------
// File-based skills source — scans <repo>/skills/<name>/SKILL.md
// ----------------------------------------------------------------------------
export class FileSkillsSource implements SkillsSource {
  name = 'file'
  private rootDir: string
  constructor(rootDir: string = path.join(process.cwd(), 'skills')) {
    this.rootDir = rootDir
  }

  async list(): Promise<Skill[]> {
    try {
      const entries = await fs.readdir(this.rootDir, { withFileTypes: true })
      const skills: Skill[] = []
      for (const e of entries) {
        if (!e.isDirectory()) continue
        const md = path.join(this.rootDir, e.name, 'SKILL.md')
        try {
          const raw = await fs.readFile(md, 'utf8')
          skills.push({ ...parseSkillMarkdown(e.name, raw), source: 'file' })
        } catch {
          // no SKILL.md in this dir, skip
        }
      }
      return skills
    } catch {
      return []
    }
  }

  async loadBody(skill: Skill): Promise<string | null> {
    const md = path.join(this.rootDir, skill.name, 'SKILL.md')
    try {
      return await fs.readFile(md, 'utf8')
    } catch {
      return null
    }
  }
}

// ----------------------------------------------------------------------------
// MCP skills source (stub) — future: pull skills from a Foundry MCP server.
// ----------------------------------------------------------------------------
export class MCPSkillsSource implements SkillsSource {
  name = 'mcp'
  constructor(_endpoint?: string) {}
  async list(): Promise<Skill[]> {
    // TODO: connect to Foundry MCP skill registry at this endpoint. Empty for now.
    return []
  }
  async loadBody(_skill: Skill): Promise<string | null> {
    return null
  }
}

// ----------------------------------------------------------------------------
// Aggregating source — merge all sources, de-dup by name (file wins).
// ----------------------------------------------------------------------------
export class AggregatingSkillsSource implements SkillsSource {
  name = 'aggregated'
  private sources: SkillsSource[]
  constructor(sources: SkillsSource[]) {
    this.sources = sources
  }
  async list(): Promise<Skill[]> {
    const map = new Map<string, Skill>()
    for (const src of this.sources) {
      const list = await src.list()
      for (const s of list) {
        if (!map.has(s.name)) map.set(s.name, s) // first source wins
      }
    }
    return [...map.values()]
  }
  async loadBody(skill: Skill): Promise<string | null> {
    for (const src of this.sources) {
      const body = await src.loadBody(skill)
      if (body) return body
    }
    return skill.body ?? null
  }
}

function parseSkillMarkdown(name: string, raw: string): Skill {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  let description = ''
  if (fm) {
    const m = fm[1].match(/description:\s*(.+)/)
    if (m) description = m[1].trim()
  }
  return { name, description, body: raw, source: 'file' }
}

// ----------------------------------------------------------------------------
// SkillsProvider — the public API used by HarnessAgent.
// ----------------------------------------------------------------------------
export class SkillsProvider {
  private source: AggregatingSkillsSource
  private cache: Skill[] | null = null

  constructor(source?: AggregatingSkillsSource) {
    this.source =
      source ??
      new AggregatingSkillsSource([new FileSkillsSource(), new MCPSkillsSource()])
  }

  /** Cheap view: names + descriptions only. Passed to the LLM initially. */
  async listSummaries(): Promise<{ name: string; description: string }[]> {
    const all = await this.all()
    return all.map(({ name, description }) => ({ name, description }))
  }

  /** Select skills whose description matches the prompt; load full bodies. */
  async selectForIntent(prompt: string, k = 3): Promise<Skill[]> {
    const all = await this.all()
    const lower = prompt.toLowerCase()
    const scored = all.map((s) => {
      const hay = `${s.name} ${s.description}`.toLowerCase()
      let score = 0
      for (const token of hay.split(/\W+/).filter(Boolean)) {
        if (lower.includes(token)) score += 1
      }
      // governance always loaded (it is the safety net)
      if (s.name === 'hostamar-governance') score += 1000
      return { s, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const chosen = scored.slice(0, k).filter((x) => x.score > 0).map((x) => x.s)
    const loaded: Skill[] = []
    for (const s of chosen) {
      const body = await this.source.loadBody(s)
      loaded.push({ ...s, body: body ?? s.body })
      // eslint-disable-next-line no-console
      console.log(`[HARNESS] Loaded skill: ${s.name}`)
    }
    return loaded
  }

  private async all(): Promise<Skill[]> {
    if (!this.cache) this.cache = await this.source.list()
    return this.cache
  }

  /** Reload skills from disk (call after adding/ editing a SKILL.md). */
  invalidate() {
    this.cache = null
  }
}
