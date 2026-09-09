import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { KAGGLE_NOTEBOOKS, NotebookKey } from '@/lib/kaggle-on-demand'

export const dynamic = 'force-dynamic'

/**
 * GET /api/kaggle/logs?notebook=bonter&qwen27b|hunyuanvideo — tail of kernel log.
 * Uses the public kernel URL page (kaggle.com/code/<user>/<slug>) — the RPC
 * GetKernelSessionLogsStream returns a stream; here we surface the state +
 * link, keeping payload small. (Full log tail via CLI when needed.)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const nb = (req.nextUrl.searchParams.get('notebook') || '') as NotebookKey
    if (!(nb in KAGGLE_NOTEBOOKS)) {
      return NextResponse.json({ ok: false, error: 'notebook must be bonsai|qwen27b|hunyuanvideo' }, { status: 400 })
    }
    const slug = KAGGLE_NOTEBOOKS[nb].slug
    const user = process.env.KAGGLE_USERNAME || 'raisulmahmudromel'
    return NextResponse.json({
      ok: true,
      notebook: nb,
      url: `https://www.kaggle.com/code/${user}/${slug}`,
      note: 'Full log tail: kaggle kernels output raisulmahmudromel/' + slug + ' (WSL CLI) or RPC GetKernelSessionLogsStream',
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}
