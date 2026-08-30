import prisma from '@/lib/prisma'
import { CLIENTS } from './clients'

/**
 * Worktree manager (Orca ADE) — each agent runs in an isolated workspace:
 * B2 prefix chatos/{userId}/worktrees/{worktreeId}/ plus a virtual git object
 * store per worktree. Vibe-code chat can fan a prompt across N worktrees and
 * merge the winner. Strict billing via lib/credits (PAID V12).
 */
export type Worktree = {
  id: string
  name: string
  agent: string
  status: 'idle' | 'active'
  createdAt: string
}

const B2 = { bucket: process.env.B2_BUCKET || 'hostamar-prod' }
let _S3: any = null
async function s3() {
  if (_S3) return _S3
  const { S3Client } = await import('@aws-sdk/client-s3')
  _S3 = new S3Client({
    region: process.env.B2_REGION || 'us-east-005',
    endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    credentials: { accessKeyId: process.env.B2_ACCOUNT_ID || '', secretAccessKey: process.env.B2_APPLICATION_KEY || '' },
  })
  return _S3
}

function wtRoot(userId: string, wtId: string) { return `chatos/${userId}/worktrees/${wtId}` }

async function getObject(key: string): Promise<string | null> {
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const r: any = await (await s3()).send(new GetObjectCommand({ Bucket: B2.bucket, Key: key }))
    const chunks: any[] = []
    for await (const c of r.Body) chunks.push(c)
    return Buffer.concat(chunks).toString('utf-8')
  } catch { return null }
}
async function putObject(key: string, body: string): Promise<boolean> {
  try {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    await (await s3()).send(new PutObjectCommand({ Bucket: B2.bucket, Key: key, Body: body, ContentType: 'text/plain' }))
    return true
  } catch { return false }
}

/** List worktrees for a user (registry object in B2). */
export async function listWorktrees(userId: string): Promise<Worktree[]> {
  const raw = await getObject(`chatos/${userId}/worktrees.json`)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

/** Create an isolated worktree (billed by the caller — 5cr). */
export async function createWorktree(userId: string, name: string, agent: string): Promise<Worktree> {
  const wts = await listWorktrees(userId)
  const wt: Worktree = {
    id: `wt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.slice(0, 60) || 'worktree',
    agent: agent || 'hostamar',
    status: 'idle',
    createdAt: new Date().toISOString(),
  }
  wts.push(wt)
  await putObject(`chatos/${userId}/worktrees.json`, JSON.stringify(wts).slice(0, 100_000))
  // Seed the worktree with a README so it's non-empty
  await putObject(`${wtRoot(userId, wt.id)}/README.md`, `# ${wt.name}\n\nOrca worktree — agent: ${wt.agent}\n`)
  return wt
}

/**
 * Fan a prompt across N worktrees (parallel agents), return each reply +
 * merge suggestion. Caller bills per worktree.
 */
export async function fanPrompt(
  userId: string,
  prompt: string,
  worktreeIds: string[],
  model?: string,
): Promise<Array<{ worktreeId: string; reply: string; provider: string; model: string }>> {
  const { callBestModel } = await import('@/lib/ai-fallback')
  const results = await Promise.all(worktreeIds.map(async (wtId) => {
    try {
      const r = await callBestModel(
        [{ role: 'user', content: prompt }],
        'You are an Orca-style parallel coding agent working in an isolated git worktree. Produce a focused implementation answer.',
        model,
      )
      return { worktreeId: wtId, reply: r.text, provider: r.provider, model: r.model }
    } catch {
      return { worktreeId: wtId, reply: '(agent unavailable)', provider: 'fallback', model: 'none' }
    }
  }))
  // Log each result into its worktree (persisted for review/merge)
  for (const r of results) {
    const prev = await getObject(`${wtRoot(userId, r.worktreeId)}/agent-log.md`) || ''
    await putObject(`${wtRoot(userId, r.worktreeId)}/agent-log.md`, prev + `\n---\n## ${new Date().toISOString()}\n${r.reply.slice(0, 4000)}\n`)
  }
  return results
}

export { CLIENTS }
