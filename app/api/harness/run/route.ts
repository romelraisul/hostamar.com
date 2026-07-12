// POST /api/harness/run — run the harness in plan or execute mode.
// Guarded by x-internal-api-key (this path is whitelisted in middleware exactly
// like /api/internal/provision — self-guarded server-to-server).
import { NextRequest, NextResponse } from 'next/server'
import { guardInternal } from '@/lib/harness/guard'
import { HarnessAgent } from '@/lib/harness/HarnessAgent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const denied = guardInternal(req)
  if (denied) return denied

  let body: { prompt?: string; mode?: 'plan' | 'execute'; sessionId?: string; owner?: string; autoApprove?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const prompt = (body.prompt || '').trim()
  const mode = body.mode === 'execute' ? 'execute' : 'plan'
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  try {
    const agent = new HarnessAgent({ fileRoot: process.env.HARNESS_FILE_ROOT || undefined })
    const result = await agent.run({
      prompt,
      mode,
      sessionId: body.sessionId,
      owner: body.owner || 'customer',
      autoApprove: body.autoApprove === true,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'harness error' },
      { status: 500 },
    )
  }
}
