/**
 * Storage file download route
 *
 * GET /api/storage/[userId]/[filename]
 *   - Download a specific file from B2 cloud storage
 *
 * Environment variables:
 *   B2_ACCOUNT_ID     - Backblaze B2 account ID
 *   B2_APPLICATION_KEY - Backblaze B2 application key
 *   B2_BUCKET         - Backblaze B2 bucket name
 *   B2_ENDPOINT       - Backblaze B2 S3 endpoint
 *   B2_REGION         - Backblaze B2 region (default: us-west-004)
 */

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// Force Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const env = {
  b2AccountId: process.env.B2_ACCOUNT_ID ?? '',
  b2ApplicationKey: process.env.B2_APPLICATION_KEY ?? '',
  b2Bucket: process.env.B2_BUCKET ?? 'hostamar-prod',
  b2Endpoint: process.env.B2_ENDPOINT ?? 'https://s3.us-east-005.backblazeb2.com',
  b2Region: process.env.B2_REGION ?? 'us-east-005',
}

let _s3: S3Client | null = null
function getS3(): S3Client {
  if (_s3) return _s3
  _s3 = new S3Client({
    endpoint: env.b2Endpoint,
    region: env.b2Region,
    credentials: {
      accessKeyId: env.b2AccountId,
      secretAccessKey: env.b2ApplicationKey,
    },
    forcePathStyle: true,
  })
  return _s3
}

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const map: Record<string, string> = {
    txt: 'text/plain',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    tgz: 'application/x-tar',
    doc: 'application/msword',
    docx: 'application/msword',
  }
  return map[ext] ?? 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; filename: string }> }
) {
  try {
    const { userId, filename } = await params
    const decodedFilename = decodeURIComponent(filename)

    // SECURITY (IDOR fix): the {userId} in the URL path must match the
    // middleware-verified identity — nobody can download another user's file.
    const authedUser = request.headers.get('x-user-id')
    if (!authedUser || authedUser === 'anonymous') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (userId !== authedUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!userId || !decodedFilename) {
      return NextResponse.json(
        { error: 'userId and filename are required' },
        { status: 400 }
      )
    }

    // Validate filename (no path traversal)
    if (
      decodedFilename.includes('/') ||
      decodedFilename.includes('\\') ||
      decodedFilename.includes('..')
    ) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const key = `customers/${userId}/${decodedFilename}`

    // Fetch from B2 S3
    let response
    try {
      response = await getS3().send(
        new GetObjectCommand({
          Bucket: env.b2Bucket,
          Key: key,
        })
      )
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey') {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
      throw err
    }

    if (!response.Body) {
      return NextResponse.json(
        { error: 'Empty file body' },
        { status: 500 }
      )
    }

    // Convert stream to Uint8Array
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const fileBuffer = new Uint8Array(
      chunks.reduce((acc, c) => acc + c.length, 0)
    )
    let offset = 0
    for (const chunk of chunks) {
      fileBuffer.set(chunk, offset)
      offset += chunk.length
    }

    const contentType = response.ContentType || getContentType(decodedFilename)
    const size = response.ContentLength ?? fileBuffer.length

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${decodedFilename}"`)
    headers.set('Content-Length', String(size))
    headers.set('Cache-Control', 'public, max-age=31536000')

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    )
  }
}
