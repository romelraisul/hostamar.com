import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { startNotebook, quota, KAGGLE_NOTEBOOKS, NotebookKey } from '@/lib/kaggle-on-demand'

export const dynamic = 'force-dynamic'

/**
 * POST /api/kaggle/start — On-Demand START.
 * Body: { "notebook": "bonsai" | "qwen27b" | "hunyuanvideo" }
 * Quota gate: 25h/30h headroom. Secrets stay in Kaggle Secrets.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { notebook } = (await req.json()) as { notebook: NotebookKey }
    if (!notebook || !(notebook in KAGGLE_NOTEBOOKS)) {
      return NextResponse.json({ ok: false, error: 'notebook must be bonsai|qwen27b|hunyuanvideo' }, { status: 400 })
    }
    const q = await quota()
    if (q.startDisabled) {
      return NextResponse.json(
        { ok: false, error: 'quota gate: 25h/30h used — start disabled, edge fallback only', quota: q },
        { status: 429 },
      )
    }
    const r = await startNotebook(notebook)
    return NextResponse.json({ ok: true, notebook, started: r, quota: q })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
