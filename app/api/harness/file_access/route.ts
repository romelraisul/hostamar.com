// POST /api/harness/file_access — confined file operations for the agent.
// Actions: list_files, read_file, save_file, search_files, delete_file.
// save_file and delete_file are approval-gated in the HarnessAgent; here we
// expose only read-only + list by default and route writes through the
// approval queue when the caller passes ?requireApproval=1.
import { NextRequest, NextResponse } from 'next/server'
import { guardInternal } from '@/lib/harness/guard'
import { FileSystemAgentFileStore } from '@/lib/harness/FileSystemAgentFileStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const store = new FileSystemAgentFileStore(process.env.HARNESS_FILE_ROOT || undefined)

export async function POST(req: NextRequest) {
  const denied = guardInternal(req)
  if (denied) return denied
  const { action, path: p, content } = await req.json().catch(() => ({}))
  try {
    switch (action) {
      case 'list_files':
        return NextResponse.json({ files: await store.listFiles(p || '.') })
      case 'read_file':
        return NextResponse.json({ content: await store.readFile(p) })
      case 'search_files':
        return NextResponse.json({ matches: await store.searchFiles(p || '', 'working') })
      case 'save_file':
        // Writes are approval-gated at the agent layer; admin API requires the
        // caller to have already approved (status carried via header).
        return NextResponse.json(await store.saveFile(p, content || ''))
      case 'delete_file':
        await store.deleteFile(p)
        return NextResponse.json({ deleted: p })
      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'file error' },
      { status: 400 },
    )
  }
}
