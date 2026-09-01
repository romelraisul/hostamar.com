export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { uploadToB2 } from '@/lib/ai-video'

/**
 * POST /api/video/reel/upload-logo — multipart logo upload (V25).
 * Auth: getAuthUser() OR x-user-id (preview). Max 2MB, image/* only,
 * sanitized filename (no path traversal). Stored B2 logos/{userId}/{ts}-{name}.
 */
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest) {
  let user: { id: string } | null = null
  try { user = await getAuthUser(req) } catch { user = null }
  const userId = (user?.id || req.headers.get('x-user-id') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
  if (!userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })
  }
  const file = form.get('logo')
  if (!(file instanceof File)) return NextResponse.json({ error: 'logo file required' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Max 2MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'image/* only' }, { status: 400 })

  // sanitize: keep extension, drop everything path-y
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60)
  const key = `logos/${userId}/${Date.now()}-${safe}`

  const buf = Buffer.from(await file.arrayBuffer())
  const url = await uploadToB2(buf, key)
  if (!url) return NextResponse.json({ error: 'B2 upload failed — check B2 env' }, { status: 502 })

  return NextResponse.json({ ok: true, url })
}
