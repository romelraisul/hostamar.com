import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { stopNotebook, KAGGLE_NOTEBOOKS, NotebookKey } from '@/lib/kaggle-on-demand'

export const dynamic = 'force-dynamic'

/**
 * POST /api/kaggle/stop — On-Demand STOP (real CancelKernelSession).
 * Frees GPU immediately — account-safe idle = COMPLETE state.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { notebook } = (await req.json()) as { notebook: NotebookKey }
    if (!notebook || !(notebook in KAGGLE_NOTEBOOKS)) {
      return NextResponse.json({ ok: false, error: 'notebook must be bonsai|qwen27b|hunyuanvideo' }, { status: 400 })
    }
    const r = await stopNotebook(notebook)
    return NextResponse.json({ ok: true, notebook, stopped: r })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
