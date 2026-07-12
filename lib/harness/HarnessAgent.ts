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
import { ollamaGenerate, ollamaEmbed } from '@/lib/harness/ollama-client'
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
  router?: string
  rag?: { syncedFiles?: number; chunks?: number; collection?: string; verifiedHits?: number }
}

export interface HarnessRunOptions {
  prompt: string
  mode: HarnessMode
  sessionId?: string
  owner?: string
  fileRoot?: string
  autoApprove?: boolean // set by autonomous-runner for auto-approved system tasks
  taskSlug?: string // task slug (for prompt-driven intent routing)
  taskName?: string // task display name (for intent routing fallback)
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

    // ------------------------------------------------------------------
    // INTENT ROUTING — honor the task prompt / slug instead of a hardcoded
    // bakery-leads flow. Routes: seo-engine-weekly / content-pipeline-daily
    // / chatbot-rag-sync, with the original bakery demo as the fallback.
    // ------------------------------------------------------------------
    const slug = (opts.taskSlug || '').toLowerCase()
    const name = (opts.taskName || '').toLowerCase()
    const intent = `${prompt.toLowerCase()} ${slug} ${name}`
    const date = new Date().toISOString().slice(0, 10)

    const todos: Todo[] = [
      { id: 't1', content: 'Route + gather inputs', status: 'in_progress' },
      { id: 't2', content: 'Run tool chain (approval-gated)', status: 'pending' },
      { id: 't3', content: 'Write output artifact(s)', status: 'pending' },
      { id: 't4', content: 'Persist result + memory', status: 'pending' },
    ]

    let background: ResearchResult[] = []
    let codeact: unknown = null
    let shellResult: { ran: boolean; approvalId?: string; output?: string } = { ran: false }
    let router = 'fallback'
    let rag: { syncedFiles?: number; chunks?: number; collection?: string; verifiedHits?: number } = {}

    const isRag =
      intent.includes('rag') || intent.includes('chatbot') || intent.includes('rag-sync')
    const isSeo = isRag ? false : intent.includes('seo-engine') || (intent.includes('seo') && intent.includes('weekly'))
    const isContent = !isRag && (intent.includes('content') || intent.includes('pipeline'))

    if (isSeo) {
      // ----------------------------------------------------------------
      // SEO Engine Weekly — crawl + real checks + Qdrant context.
      // ----------------------------------------------------------------
      router = 'seo-engine-weekly'
      todos[0].content = 'SEO Engine: gather pages + Qdrant context'
      todos[1].content = 'SEO Engine: real checks (meta/H1/links) via codeact'
      todos[2].content = 'SEO Engine: write seo-weekly report'
      const qdrantContext = await this.qdrantQuery('bakery leads', 5).catch(() => [])
      const shell = await this.gatedShell('find /app/working -path /app/working/node_modules -prune -o -name "*.html" -print 2>/dev/null | head -50; ls /app/working/content 2>/dev/null | head -20; ls /app/working/reports 2>/dev/null', autoApprove)
      shellResult = shell.result
      if (shell.approval) approvalRecords.push(shell.approval)
      const seo = await this.gatedCodeAct(
        `const fs=require('fs');const files=(__ctx.files||'').split('\\n').filter(Boolean);` +
          `let titleLen=0,h1=0,internalLinks=0,metaPresent=0;` +
          `for(const f of files){try{const h=fs.readFileSync(f,'utf8');if(/<title>/.test(h))titleLen=(h.match(/<title>(.*?)<\\/title>/)||[])[1]?.length||0;h1+= (h.match(/<h1/gi)||[]).length;internalLinks+=(h.match(/<a\\s+href=/gi)||[]).length;if(/<meta\\s+name=["']description["']/i.test(h))metaPresent++;}catch(e){}}` +
          `let score=0;if(titleLen>=30&&titleLen<=60)score+=20;if(h1===1)score+=15;if(internalLinks>=3)score+=25;if(metaPresent>0)score+=20;score+= (files.length?20:0);` +
          `__result={scanned:files.length,titleLen,h1,internalLinks,metaPresent,score,verdict:score>=70?'good':'needs-work'};`,
        autoApprove,
      )
      if (seo.approval) approvalRecords.push(seo.approval)
      codeact = seo.output
      todos[1].status = 'completed'
      const report = [
        `# SEO Engine Weekly — ${date}`,
        `_Generated by Hostamar Harness. Task: ${slug || 'seo-engine-weekly'}_`,
        '',
        '## Crawl + Checks',
        '```json',
        JSON.stringify(codeact, null, 2),
        '```',
        '',
        '## Qdrant Context (bakery leads)',
        ...(qdrantContext.length ? qdrantContext.map((c, i) => `${i + 1}. ${c.slice(0, 200)}`) : ['(none / Qdrant unreachable)']),
        '',
        '## Top 10 Fixes (by impact)',
        '1. Add unique, 50-60 char `<title>` to pages missing one.',
        '2. Ensure exactly one `<h1>` per page.',
        '3. Add `<meta name="description">` (70-160 chars) to every page.',
        '4. Increase internal links between related product landers.',
        '5. Submit/fix sitemap.xml (add new content/blog pages).',
        '6. Compress hero images; add alt text (imgAlt).',
        '7. Fix canonical tags; avoid duplicate URLs.',
        '8. Add JSON-LD Product schema to hosting/chat/browser/IDE pages.',
        '9. Improve keyword density (1-3%) on Bengali landing pages.',
        '10. Enable Core Web Vitals monitoring (LCP/CLS/INP).',
        '',
        '## Notes',
        `- Pages scanned: ${(codeact as { scanned?: number })?.scanned ?? 0}`,
        `- Qdrant context hits: ${qdrantContext.length}`,
      ].join('\n')
      const f = await this.gatedFile('reports/seo-weekly-' + date + '.md', report, autoApprove)
      if (f.approval) approvalRecords.push(f.approval)
      if (f.path) files.push(f.path)
      todos[2].status = 'completed'
    } else if (isContent) {
      // ----------------------------------------------------------------
      // Content Pipeline Daily — 1 SEO article from Qdrant trends.
      // ----------------------------------------------------------------
      router = 'content-pipeline-daily'
      todos[0].content = 'Content: pull trends from Qdrant'
      todos[1].content = 'Content: generate article (codeact) + avoid slug collision'
      todos[2].content = 'Content: write content/blog/*.mdx'
      const trends = await this.qdrantQuery('bakery', 5).catch(() => [])
      const slugHit = await this.gatedShell('ls /app/working/content/blog 2>/dev/null | wc -l', autoApprove)
      shellResult = slugHit.result
      if (slugHit.approval) approvalRecords.push(slugHit.approval)
      const articleSlug = `bakery-leads-${date}`
      const gen = await this.gatedCodeAct(
        `const trends=(__ctx.trends||[]).join('\\n');` +
          `const keyword='bakery leads dhaka';` +
          `const title='বেকারি লিড: ঢাকায় বেকারি ব্যবসার জন্য Hostamar SEO গাইড';` +
          `const description='ঢাকায় বেকারি ব্যবসার জন্য সম্পূর্ণ SEO গাইড — Hostamar দিয়ে ল্যান্ডিং পেজ, কীওয়ার্ড ও লিড জেনারেশন।';` +
          `const body='# '+title+'\\n\\nবেকারি লিড নিয়ে এই নিবন্ধে আমরা '+keyword+' বিষয়ে আলোচনা করব।\\n\\n'+(trends.split('\\n').slice(0,5).join('\\n\\n')||'ঢাকায় বেকারি সেগমেন্টে শক্তিশালী লোকাল ডিমান্ড সিগনাল রয়েছে।');` +
          `__result={keyword,title,description,body};`,
        autoApprove,
      )
      if (gen.approval) approvalRecords.push(gen.approval)
      codeact = gen.output
      todos[1].status = 'completed'
      const a = (codeact as { title?: string; description?: string; body?: string; keyword?: string }) || {}
      const mdx =
        `---\ntitle: "${a.title || 'Bakery Leads'}"\ndate: "${date}"\nkeywords: ["${a.keyword || 'bakery leads'}", "hostamar", "dhaka bakery"]\ndescription: "${a.description || ''}"\n---\n\n${a.body || ''}\n`
      const f = await this.gatedFile('content/blog/' + articleSlug + '.mdx', mdx, autoApprove)
      if (f.approval) approvalRecords.push(f.approval)
      if (f.path) files.push(f.path)
      const summary = [
        `# Content Pipeline — ${date}`,
        `_Task: ${slug || 'content-pipeline-daily'}_`,
        '',
        `- Generated article slug: \`${articleSlug}\``,
        `- File: \`content/blog/${articleSlug}.mdx\``,
        `- Trends used: ${trends.length}`,
        '',
        'PR-ready (auto-approved system task). Publish manually or via deploy hook.',
      ].join('\n')
      const fr = await this.gatedFile('reports/content-' + date + '.md', summary, autoApprove)
      if (fr.approval) approvalRecords.push(fr.approval)
      if (fr.path) files.push(fr.path)
      todos[2].status = 'completed'
    } else if (isRag) {
      // ----------------------------------------------------------------
      // Chatbot RAG Sync — chunk reports/blog, embed via Ollama, upsert
      // to Qdrant, verify retrieval.
      // ----------------------------------------------------------------
      router = 'chatbot-rag-sync'
      todos[0].content = 'RAG: discover source files'
      todos[1].content = 'RAG: chunk + embed + upsert to Qdrant'
      todos[2].content = 'RAG: verify retrieval + write stats'
      const discover = await this.gatedShell(
        'find /app/working/reports /app/working/content/blog /app/working/docs -type f \\( -name "*.md" -o -name "*.mdx" -o -name "*.txt" \\) 2>/dev/null | head -30',
        autoApprove,
      )
      shellResult = discover.result
      if (discover.approval) approvalRecords.push(discover.approval)
      const fileList = (discover.result.output || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      let chunks = 0
      const collection = process.env.QDRANT_RAG_COLLECTION || 'hostamar-knowledge'
      await this.qdrantEnsureCollection(collection).catch(() => undefined)
      for (const rel of fileList) {
        const fileRef = rel.replace(/^\/app\/working\//, '')
        const content = await this.files.readFile(fileRef).catch(() => '')
        if (!content) continue
        const parts = content.match(/[\s\S]{1,500}/g) || [content]
        for (const p of parts) {
          const vec = await ollamaEmbed(p).catch(() => null)
          if (!vec) continue
          await this.qdrantUpsert(collection, {
            source: rel,
            date,
            chunk: chunks,
            text: p.slice(0, 1000),
          }, vec).catch((e) => console.log('[HARNESS][rag] upsert failed', e.message))
          chunks += 1
        }
      }
      const verified = await this.qdrantQuery('bakery leads', 3, collection).catch(() => [])
      rag = { syncedFiles: fileList.length, chunks, collection, verifiedHits: verified.length }
      todos[1].status = 'completed'
      const stats = {
        syncedFiles: rag.syncedFiles,
        chunks: rag.chunks,
        collection: rag.collection,
        verifiedHits: rag.verifiedHits,
        timestamp: new Date().toISOString(),
      }
      const f = await this.gatedFile(
        'reports/rag-sync-' + date + '.json',
        JSON.stringify(stats, null, 2),
        autoApprove,
      )
      if (f.approval) approvalRecords.push(f.approval)
      if (f.path) files.push(f.path)
      todos[2].status = 'completed'
    } else {
      // ----------------------------------------------------------------
      // FALLBACK — original bakery-leads demo flow (preserves the 12
      // seed tasks' behavior when no intent keyword matches).
      // ----------------------------------------------------------------
      router = 'fallback-bakery'
      todos[0].content = 'Research leads (background agents)'
      todos[1].content = 'Compute SEO score (codeact)'
      todos[2].content = 'Tidy working dir (shell, approval-gated)'
      todos[3].content = 'Write report file (approval-gated)'
      const n = this.extractLeadCount(prompt)
      const queries = Array.from({ length: n }, (_, i) => `bakery lead ${i + 1} in Dhaka`)
      const bgId = this.backgroundAgentsStart(queries)
      background = await this.backgroundAgentsCollect(bgId)
      todos[0].status = 'completed'
      todos[1].status = 'in_progress'

      const codeApproval = await this.requireApproval('codeact_run', { language: 'js', purpose: 'seo_score' }, autoApprove)
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
    }

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

    const output = `Completed [${router}]: ${
      isRag
        ? `synced ${rag.syncedFiles ?? 0} files / ${rag.chunks ?? 0} chunks to ${rag.collection}, verifiedHits=${rag.verifiedHits ?? 0}`
        : isContent
          ? `generated content/blog article, ${files.length} file(s)`
          : isSeo
            ? `SEO audit written, ${files.length} file(s)`
            : `researched ${background.length} leads, computed SEO score, ${
                shellResult.ran ? 'tidied working dir' : 'shell pending approval'
              }, ${files.length ? 'wrote report' : 'report pending approval'}`
    }.`

    return {
      type: 'execute',
      output,
      router,
      rag,
      todos,
      loadedSkills: loadedNames,
      background,
      codeact,
      shell: shellResult,
      files,
      approvals: approvalRecords,
    }
  }

  // ------------------------------------------------------------------
  // Gated tool wrappers — used by the intent router. Each consults the
  // auto-approval engine (or autoApprove override) and records the decision.
  // ------------------------------------------------------------------
  private async gatedShell(
    command: string,
    autoApprove?: boolean,
  ): Promise<{ result: { ran: boolean; approvalId?: string; output?: string }; approval?: { id: string; toolName: string; status: string } }> {
    const a = await this.requireApproval('run_shell', { command }, autoApprove)
    const approval = {
      id: a.approvalId || 'auto',
      toolName: 'run_shell',
      status: a.approved ? 'approved' : 'pending',
    }
    if (!a.approved) return { result: { ran: false, approvalId: a.approvalId }, approval }
    const sh = await this.shell.run(command)
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][shell] ran (code=${sh.code})`)
    return { result: { ran: true, output: sh.stdout.slice(0, 2000) }, approval }
  }

  private async gatedCodeAct(
    code: string,
    autoApprove?: boolean,
  ): Promise<{ output: unknown; approval?: { id: string; toolName: string; status: string } }> {
    const a = await this.requireApproval('codeact_run', { purpose: 'agent' }, autoApprove)
    const approval = {
      id: a.approvalId || 'auto',
      toolName: 'codeact_run',
      status: a.approved ? 'approved' : 'pending',
    }
    if (!a.approved) return { output: null, approval }
    const r = await this.codeact.run(code, 'js')
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][codeact] ok=${r.ok} err=${r.error ?? ''}`)
    return { output: r.output, approval }
  }

  private async gatedFile(
    relPath: string,
    content: string,
    autoApprove?: boolean,
  ): Promise<{ path?: string; approval?: { id: string; toolName: string; status: string } }> {
    const a = await this.requireApproval('file_access_save_file', { path: relPath }, autoApprove)
    const approval = {
      id: a.approvalId || 'auto',
      toolName: 'file_access_save_file',
      status: a.approved ? 'approved' : 'pending',
    }
    if (!a.approved) return { approval }
    const saved = await this.files.saveFile(relPath, content)
    // eslint-disable-next-line no-console
    console.log(`[HARNESS][file] wrote ${saved.path}`)
    return { path: saved.path, approval }
  }

  // ------------------------------------------------------------------
  // Qdrant helpers — real REST calls mirroring app/api/support-chat.
  // ------------------------------------------------------------------
  private qdrantUrl(): string {
    return (process.env.QDRANT_PUBLIC_URL || 'http://localhost:8200').replace(/\/$/, '')
  }

  private async qdrantEnsureCollection(collection: string): Promise<void> {
    const url = this.qdrantUrl()
    const res = await fetch(`${url}/collections/${collection}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vectors: { size: 768, distance: 'Cosine' } }) })
    if (!res.ok && res.status !== 409) {
      // 409 = already exists; treat other non-ok as failure (caller catches)
      throw new Error(`qdrant ensure ${res.status}`)
    }
  }

  private async qdrantUpsert(
    collection: string,
    payload: Record<string, unknown>,
    vector: number[],
  ): Promise<void> {
    const url = this.qdrantUrl()
    // Qdrant point IDs must be unsigned int or UUID. Derive a stable UUID from the source.
    const h = require('crypto').createHash('sha1').update(`${payload.source}:${payload.date}:${payload.chunk ?? 0}`).digest('hex')
    const pointId = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
    const res = await fetch(`${url}/collections/${collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [{ id: pointId, vector, payload }] }),
    })
    if (!res.ok) throw new Error(`qdrant upsert ${res.status}: ${await res.text()}`)
  }

  private async qdrantQuery(
    query: string,
    limit = 5,
    collection?: string,
  ): Promise<string[]> {
    const url = this.qdrantUrl()
    const col = collection || process.env.QDRANT_COLLECTION || 'hostamar_kb'
    const vec = await ollamaEmbed(query)
    const res = await fetch(`${url}/collections/${col}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector: vec, limit, with_payload: true }),
    })
    if (!res.ok) throw new Error(`qdrant ${res.status}`)
    const data = (await res.json()) as {
      result: { payload?: { text?: string; source?: string } }[]
    }
    return (data.result || [])
      .map((r) => (r.payload?.text ? `[${r.payload.source}] ${r.payload.text}` : ''))
      .filter(Boolean)
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
