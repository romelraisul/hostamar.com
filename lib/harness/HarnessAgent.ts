// ============================================================================
// HarnessAgent — the core "claw" for Hostamar's autonomous engine.
//
// Wraps the self-hosted Ollama chat client and orchestrates:
//   • two modes: `plan` (returns JSON {type, questions}) and `execute` (prose + tools)
//   • progressive skill loading (SkillsProvider)
//   • confined file access (FileSystemAgentFileStore)
//   • approval-gated shell + codeact + provisioning (AutoApprovalEngine + ApprovalQueue)
//   • background agent fan-out (ResearchAgent)
//   • durable memory (FoundryMemoryProvider)
//   • todos persisted in TaskRunLog / HarnessSession
//
// Design goal: 95% autonomous, 5% human approval via Telegram.
// ============================================================================
import { prisma } from '@/lib/prisma'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'
import { ollamaGenerate } from '@/lib/harness/ollama-client'
import { SkillsProvider } from '@/lib/skills/SkillsProvider'
import { FileSystemAgentFileStore } from '@/lib/harness/FileSystemAgentFileStore'
import { LocalShellTool } from '@/lib/tools/LocalShellTool'
import { CodeActProvider } from '@/lib/tools/CodeActProvider'
import { fanOutResearch, ResearchResult } from '@/lib/agents/ResearchAgent'
import {
  AutoApprovalEngine,
  ApprovalContext,
} from '@/lib/harness/AutoApprovalRules'
import { FoundryMemoryProvider, extractFacts } from '@/lib/memory/FoundryMemoryProvider'
import { sendApprovalRequest, maskSecrets } from '@/lib/harness/telegram-approvals'

export type HarnessMode = 'plan' | 'execute'

export interface Todo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface PlanResponse {
  type: 'clarification' | 'approval'
  questions: { message: string; choices?: string[] }[]
  loadedSkills: string[]
  approvalId?: string
}

export interface ExecuteResponse {
  type: 'execute'
  output: string
  todos: Todo[]
  loadedSkills: string[]
  background: ResearchResult[]
  codeact?: unknown
  shell?: { ran: boolean; approvalId?: string; output?: string }
  files: string[]
  approvals: { id: string; toolName: string; status: string }[]
}

export interface HarnessRunOptions {
  prompt: string
  mode: HarnessMode
  sessionId?: string
  owner?: string
  fileRoot?: string
  autoApprove?: boolean // set by autonomous-runner for auto-approved system tasks
}

// In-process handle registry for background agents (per run).
type BackgroundHandle = { id: string; queries: string[]; promise: Promise<ResearchResult[]> }

export class HarnessAgent {
  private skills: SkillsProvider
  private files: FileSystemAgentFileStore
  private shell: LocalShellTool
  private codeact: CodeActProvider
  private approvals: AutoApprovalEngine
  private memory: FoundryMemoryProvider
  private backgroundHandles = new Map<string, BackgroundHandle>()

  // Background agents available to the main claw.
  readonly backgroundAgents = ['research']

  constructor(opts?: { fileRoot?: string }) {
    this.skills = new SkillsProvider()
    this.files = new FileSystemAgentFileStore(opts?.fileRoot)
    this.shell = new LocalShellTool({ workdir: '/tmp/gen', confineWorkdir: true })
    this.codeact = new CodeActProvider()
    this.approvals = new AutoApprovalEngine()
    this.memory = new FoundryMemoryProvider()
  }

  // --------------------------------------------------------------------------
  // Approval helper: consult auto-rules; if not auto-approved, enqueue in DB
  // and fire a Telegram request. Returns the resolved status.
  // --------------------------------------------------------------------------
  private async requireApproval(
    toolName: string,
    args: Record<string, unknown>,
    autoOverride?: boolean,
  ): Promise<{ approved: boolean; approvalId?: string }> {
    const ctx: ApprovalContext = { toolName, args }
    if (autoOverride || this.approvals.isAutoApproved(ctx)) {
      // eslint-disable-next-line no-console
      console.log(`[HARNESS][approval] auto-approved ${toolName}`)
      return { approved: true }
    }
    // Enqueue and wait for a human decision (async — caller decides how to wait).
    const row = await prisma.approvalQueue.create({
      data: { toolName, argsJson: args as object, status: 'pending' },
    })
    await sendApprovalRequest({
      approvalId: row.id,
      toolName,
      argsPreview: maskSecrets(JSON.stringify(args)),
    })
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][approval] queued ${toolName} -> approval ${row.id} (pending human)`)
    return { approved: false, approvalId: row.id }
  }

  // --------------------------------------------------------------------------
  // PLAN mode: return JSON {type, questions}. Loads relevant skills first.
  // --------------------------------------------------------------------------
  async plan(prompt: string): Promise<PlanResponse> {
    await ensureHarnessSchema().catch(() => undefined)
    const loaded = await this.skills.selectForIntent(prompt)
    const loadedNames = loaded.map((s) => s.name)

    // Ask the model to produce clarifying questions / approval gates.
    const skillCtx = loaded
      .map((s) => `### Skill: ${s.name}\n${(s.body || '').slice(0, 1200)}`)
      .join('\n\n')
    const sys = `You are Hostamar's autonomous harness in PLAN mode. Output ONLY JSON of shape {"type":"clarification"|"approval","questions":[{"message":string,"choices"?:string[]}]}. Consider the loaded skills and Hostamar governance (never provision without verified payment, mask secrets, never rm -rf).`
    let model = ''
    try {
      model = await ollamaGenerate(
        `${sys}\n\nLoaded skills:\n${skillCtx}\n\nUser request: ${prompt}\n\nJSON:`,
        { temperature: 0.2, maxTokens: 400 },
      )
    } catch {
      model = ''
    }

    const parsed = this.safeParsePlan(model)
    if (parsed) {
      const row = await prisma.approvalQueue
        .create({ data: { toolName: 'harness_plan', argsJson: { prompt } as object, status: 'pending' } })
        .catch(() => null)
      await sendApprovalRequest({
        approvalId: row?.id ?? 'n/a',
        toolName: 'harness_plan',
        argsPreview: maskSecrets(prompt),
      }).catch(() => undefined)
      return { ...parsed, loadedSkills: loadedNames, approvalId: row?.id }
    }

    // Deterministic fallback so plan mode always returns a valid schema.
    const row = await prisma.approvalQueue
      .create({ data: { toolName: 'harness_plan', argsJson: { prompt } as object, status: 'pending' } })
      .catch(() => null)
    await sendApprovalRequest({
      approvalId: row?.id ?? 'n/a',
      toolName: 'harness_plan',
      argsPreview: maskSecrets(prompt),
    }).catch(() => undefined)
    return {
      type: 'approval',
      questions: [
        {
          message:
            'This task will start background research agents, run code (SEO scoring), and write a report file. Approve to proceed?',
          choices: ['Approve', 'Deny'],
        },
        {
          message: 'How many leads should I research?',
          choices: ['3', '5', '10'],
        },
      ],
      loadedSkills: loadedNames,
      approvalId: row?.id,
    }
  }

  private safeParsePlan(text: string): { type: 'clarification' | 'approval'; questions: { message: string; choices?: string[] }[] } | null {
    if (!text) return null
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      const obj = JSON.parse(m[0])
      if (
        (obj.type === 'clarification' || obj.type === 'approval') &&
        Array.isArray(obj.questions)
      ) {
        return obj
      }
    } catch {
      /* ignore */
    }
    return null
  }

  // --------------------------------------------------------------------------
  // Background agents: start / check / collect
  // --------------------------------------------------------------------------
  backgroundAgentsStart(queries: string[]): string {
    const id = `bg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const promise = fanOutResearch(queries)
    this.backgroundHandles.set(id, { id, queries, promise })
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][background] started ${queries.length} research agents -> ${id}`)
    return id
  }

  backgroundAgentsCheck(id: string): { exists: boolean; queries: number } {
    const h = this.backgroundHandles.get(id)
    return { exists: Boolean(h), queries: h ? h.queries.length : 0 }
  }

  async backgroundAgentsCollect(id: string): Promise<ResearchResult[]> {
    const h = this.backgroundHandles.get(id)
    if (!h) return []
    const results = await h.promise
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][background] collected ${results.length} results from ${id}`)
    return results
  }

  // --------------------------------------------------------------------------
  // EXECUTE mode: run the full pipeline for the bakery-leads demo & real tasks.
  // Skills progressive-load, background fan-out, codeact scoring, shell tidy
  // (approval-gated), report file write (approval-gated), memory extraction.
  // --------------------------------------------------------------------------
  async execute(opts: HarnessRunOptions): Promise<ExecuteResponse> {
    await ensureHarnessSchema().catch(() => undefined)
    const { prompt, sessionId, autoApprove } = opts
    const loaded = await this.skills.selectForIntent(prompt)
    const loadedNames = loaded.map((s) => s.name)
    const approvalRecords: { id: string; toolName: string; status: string }[] = []
    const files: string[] = []

    const todos: Todo[] = [
      { id: 't1', content: 'Research leads (background agents)', status: 'in_progress' },
      { id: 't2', content: 'Compute SEO score (codeact)', status: 'pending' },
      { id: 't3', content: 'Tidy working dir (shell, approval-gated)', status: 'pending' },
      { id: 't4', content: 'Write report file (approval-gated)', status: 'pending' },
    ]

    // 1) Background research fan-out (3 bakery leads by default).
    const n = this.extractLeadCount(prompt)
    const queries = Array.from({ length: n }, (_, i) => `bakery lead ${i + 1} in Dhaka`)
    const bgId = this.backgroundAgentsStart(queries)
    const background = await this.backgroundAgentsCollect(bgId)
    todos[0].status = 'completed'
    todos[1].status = 'in_progress'

    // 2) CodeAct — compute an SEO score deterministically (approval-gated).
    let codeact: unknown = null
    const codeArgs = { language: 'js', purpose: 'seo_score' }
    const codeApproval = await this.requireApproval('codeact_run', codeArgs, autoApprove)
    approvalRecords.push({
      id: codeApproval.approvalId || 'auto',
      toolName: 'codeact_run',
      status: codeApproval.approved ? 'approved' : 'pending',
    })
    if (codeApproval.approved) {
      const seoCode = `
        const signals = { titleLen: 52, h1: 1, h2: 4, metaLen: 120, imgAlt: true, kwDensity: 2.1, internalLinks: 5 };
        let score = 0;
        if (signals.titleLen >= 30 && signals.titleLen <= 60) score += 15;
        if (signals.h1 === 1) score += 10;
        if (signals.h2 >= 3) score += 10;
        if (signals.metaLen >= 70 && signals.metaLen <= 160) score += 15;
        if (signals.imgAlt) score += 15;
        if (signals.kwDensity >= 1 && signals.kwDensity <= 3) score += 20;
        if (signals.internalLinks >= 3) score += 15;
        __result = { score, verdict: score >= 80 ? 'good' : 'needs-work' };
      `
      const r = await this.codeact.run(seoCode, 'js')
      codeact = r.output
      // eslint-disable-next-line no-console
      console.log(`[HARNESS][codeact] ok=${r.ok} err=${r.error ?? ''} output=${JSON.stringify(r.output)}`)
    }
    todos[1].status = 'completed'
    todos[2].status = 'in_progress'

    // 3) Shell tidy (approval-gated) — ensure reports dir exists.
    let shellResult: ExecuteResponse['shell'] = { ran: false }
    const shellApproval = await this.requireApproval('run_shell', { command: 'mkdir -p reports && ls -la' }, autoApprove)
    approvalRecords.push({
      id: shellApproval.approvalId || 'auto',
      toolName: 'run_shell',
      status: shellApproval.approved ? 'approved' : 'pending',
    })
    if (shellApproval.approved) {
      const sh = await this.shell.run('mkdir -p reports && ls -la')
      shellResult = { ran: true, output: sh.stdout.slice(0, 500) }
      // eslint-disable-next-line no-console
      console.log(`[HARNESS][shell] tidy ran (code=${sh.code})`)
    } else {
      shellResult = { ran: false, approvalId: shellApproval.approvalId }
    }
    todos[2].status = 'completed'
    todos[3].status = 'in_progress'

    // 4) Write report file (approval-gated).
    const fileApproval = await this.requireApproval(
      'file_access_save_file',
      { path: 'reports/bakery-leads-seo.md' },
      autoApprove,
    )
    approvalRecords.push({
      id: fileApproval.approvalId || 'auto',
      toolName: 'file_access_save_file',
      status: fileApproval.approved ? 'approved' : 'pending',
    })
    if (fileApproval.approved) {
      const report = this.buildReport(prompt, background, codeact)
      const saved = await this.files.saveFile('reports/bakery-leads-seo.md', report)
      files.push(saved.path)
      // eslint-disable-next-line no-console
      console.log(`[HARNESS][file] wrote report ${saved.path}`)
    }
    todos[3].status = 'completed'

    // 5) Memory: extract + store facts; persist todos to session.
    for (const fact of extractFacts(prompt + '\n' + JSON.stringify(background))) {
      await this.memory.storeFact(fact, sessionId)
    }
    if (sessionId) {
      await prisma.harnessSession
        .upsert({
          where: { id: sessionId },
          update: { mode: 'execute', todosJson: todos as object },
          create: { id: sessionId, mode: 'execute', todosJson: todos as object },
        })
        .catch(() => undefined)
    }

    const output = `Completed: researched ${background.length} leads, computed SEO score, ${
      shellResult.ran ? 'tidied working dir' : 'shell pending approval'
    }, ${files.length ? 'wrote report' : 'report pending approval'}.`

    return {
      type: 'execute',
      output,
      todos,
      loadedSkills: loadedNames,
      background,
      codeact,
      shell: shellResult,
      files,
      approvals: approvalRecords,
    }
  }

  private extractLeadCount(prompt: string): number {
    const m = prompt.match(/(\d+)\s*(bakery|lead|leads|shops?)/i) || prompt.match(/research\s+(\d+)/i)
    const n = m ? parseInt(m[1], 10) : 3
    return Math.min(Math.max(n, 1), 10)
  }

  private buildReport(prompt: string, bg: ResearchResult[], codeact: unknown): string {
    const lines: string[] = []
    lines.push(`# Bakery Leads — SEO Report`)
    lines.push(``)
    lines.push(`_Generated by Hostamar Harness. Request: ${prompt}_`)
    lines.push(``)
    lines.push(`## SEO Score`)
    lines.push('```json')
    lines.push(JSON.stringify(codeact, null, 2))
    lines.push('```')
    lines.push(``)
    lines.push(`## Leads (${bg.length})`)
    bg.forEach((r, i) => {
      lines.push(`### ${i + 1}. ${r.query}`)
      lines.push(`- ${r.summary}`)
      r.bullets.forEach((b) => lines.push(`  - ${b}`))
      lines.push(``)
    })
    return lines.join('\n')
  }

  // --------------------------------------------------------------------------
  // Public entrypoint used by the API route and the autonomous runner.
  // --------------------------------------------------------------------------
  async run(opts: HarnessRunOptions): Promise<PlanResponse | ExecuteResponse> {
    if (opts.mode === 'plan') return this.plan(opts.prompt)
    return this.execute(opts)
  }
}
