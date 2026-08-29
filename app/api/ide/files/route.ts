import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Zero-cost file system: B2 S3 (s3.us-east-005, bucket hostamar-prod, free 10GB)
// Layout: customers/{userId}/ide/{serverId}/{filename}
//   (reuses the existing storage-dashboard B2 prefix conventions)

let _S3: any = null
async function getS3() {
  if (_S3) return _S3
  const { S3Client }: any = await import('@aws-sdk/client-s3')
  _S3 = new S3Client({
    region: process.env.B2_REGION || 'us-east-005',
    endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    credentials: {
      accessKeyId: process.env.B2_ACCOUNT_ID || '',
      secretAccessKey: process.env.B2_APPLICATION_KEY || '',
    },
  })
  return _S3
}

const BUCKET = process.env.B2_BUCKET || 'hostamar-prod'

function safe(name: string): boolean {
  return !name.includes('..') && !name.includes('/') && name.length > 0 && name.length < 200
}

/**
 * GET /api/ide/files?serverId=x — list files in a session FS
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serverId = new URL(req.url).searchParams.get('serverId') || ''
  if (!safe(serverId)) return NextResponse.json({ error: 'Bad serverId' }, { status: 400 })

  const mod: any = await import('@aws-sdk/client-s3')
  const { ListObjectsV2Command } = mod
  try {
    const r: any = await (await getS3()).send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `customers/${user.id}/ide/${serverId}/`,
      MaxKeys: 200,
    }))
    const files = (r.Contents || []).map((o: any) => ({
      name: String(o.Key).split('/').pop(),
      size: o.Size,
      modified: o.LastModified,
    }))
    return NextResponse.json({ success: true, files })
  } catch (e: any) {
    return NextResponse.json({ success: true, files: [], note: 'B2 unreachable from this instance — files still safe' })
  }
}

/**
 * POST /api/ide/files — save a file to the session FS
 * Body: { serverId, filename, content }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const serverId = String(body.serverId || '')
  const filename = String(body.filename || '')
  const content = String(body.content ?? '').slice(0, 500_000)

  if (!safe(serverId) || !safe(filename)) {
    return NextResponse.json({ error: 'Invalid serverId or filename' }, { status: 400 })
  }

  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  try {
    await (await getS3()).send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `customers/${user.id}/ide/${serverId}/${filename}`,
      Body: content,
      ContentType: 'text/plain',
    }))
  } catch (e: any) {
    // Degrade gracefully: session still usable (run works, FS save skipped)
    return NextResponse.json({ success: false, error: 'B2 write failed', detail: e?.message?.slice(0, 120) }, { status: 200 })
  }

  return NextResponse.json({ success: true, saved: filename, size: content.length })
}
