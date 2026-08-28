/**
 * Storage API Route Handler
 *
 * File storage service for Hostamar customers.
 * Files are stored locally at STORAGE_ROOT/customers/{userId}/.
 * Optional sync to Backblaze B2 via rclone.
 *
 * Runtime: Node.js (requires fs and child_process).
 * Do NOT deploy to Vercel Edge runtime.
 *
 * Environment variables:
 *   STORAGE_ROOT        - Local storage root (default: /mnt/c/hostamar/customer-storage)
 *   B2_ACCOUNT_ID       - Backblaze B2 account ID (optional)
 *   B2_APPLICATION_KEY - Backblaze B2 application key (optional)
 *   B2_BUCKET           - Backblaze B2 bucket (default: hostamar-prod)
 *   B2_ENDPOINT         - Backblaze B2 S3 endpoint (optional, region-specific)
 *   B2_REGION           - Backblaze B2 region (default: us-west-004)
 *   QUOTA_FREE_GB       - Free tier quota in GB (default: 5)
 *   MAX_FILE_SIZE       - Maximum upload size in bytes (default: 50MB)
 *
 * Endpoints:
 *   POST   /api/storage           - Upload file
 *   GET    /api/storage           - List files + usage
 *   DELETE /api/storage?filename=  - Delete file
 *
 * File download: /api/storage/[userId]/[filename] (separate route)
 */

// Node.js runtime imports (these work on Vercel Node.js runtime)
import { NextRequest, NextResponse } from 'next/server'
import * as s3mod from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { extname, basename } from 'path'

// Force Node.js runtime (this route uses S3 - not Edge compatible)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================================
// Configuration from environment variables
// ============================================================================

const env = {
  b2AccountId: process.env.B2_ACCOUNT_ID ?? '',
  b2ApplicationKey: process.env.B2_APPLICATION_KEY ?? '',
  b2Bucket: process.env.B2_BUCKET ?? 'hostamar-prod',
  b2Endpoint: process.env.B2_ENDPOINT ?? 'https://s3.us-west-004.backblazeb2.com',
  b2Region: process.env.B2_REGION ?? 'us-west-004',
  quotaFreeGb: Number(process.env.QUOTA_FREE_GB ?? 5),
  maxFileSize: Number(process.env.MAX_FILE_SIZE ?? 52428800), // 50MB default
}

const S3Client = (s3mod as any).S3Client
const PutObjectCommand = (s3mod as any).PutObjectCommand
const ListObjectsV2Command = (s3mod as any).ListObjectsV2Command
const DeleteObjectCommand = (s3mod as any).DeleteObjectCommand
const HeadObjectCommand = (s3mod as any).HeadObjectCommand

// B2 S3 client (initialized lazily)
let _s3: any = null
function getS3(): any {
  if (_s3) return _s3
  _s3 = new S3Client({
    endpoint: env.b2Endpoint,
    region: env.b2Region,
    credentials: {
      accessKeyId: env.b2AccountId,
      secretAccessKey: env.b2ApplicationKey,
    },
    forcePathStyle: true, // B2 requires path-style URLs
  })
  return _s3
}

function userKey(userId: string, filename: string): string {
  return `customers/${userId}/${filename}`
}

// ============================================================================
// Helper: list files for a user (from B2 S3)
// ============================================================================

async function listUserFiles(userId: string): Promise<
  Array<{
    filename: string
    size: number
    createdAt: string
    path: string
  }>
> {
  const s3 = getS3()
  const files: Array<{ filename: string; size: number; createdAt: string; path: string }> = []
  let continuationToken: string | undefined = undefined

  do {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.b2Bucket,
        Prefix: `customers/${userId}/`,
        ContinuationToken: continuationToken,
      })
    )
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key) continue
      const filename = obj.Key.split('/').pop() || obj.Key
      files.push({
        filename,
        size: obj.Size ?? 0,
        createdAt: (obj.LastModified ?? new Date()).toISOString(),
        path: obj.Key,
      })
    }
    continuationToken = resp.NextContinuationToken
  } while (continuationToken)

  // Sort by creation time, newest first
  files.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })

  return files
}

// ============================================================================
// Helper: get storage usage for a user
// ============================================================================

async function getStorageUsage(userId: string): Promise<number> {
  const files = await listUserFiles(userId)
  return files.reduce((sum, f) => sum + f.size, 0)
}

// ============================================================================
// Helper: write file to B2 S3
// ============================================================================

async function writeFileToB2(key: string, content: Uint8Array, contentType: string): Promise<void> {
  const s3 = getS3()
  await s3.send(
    new PutObjectCommand({
      Bucket: env.b2Bucket,
      Key: key,
      Body: content,
      ContentType: contentType,
    })
  )
}

// ============================================================================
// Helper: delete file from B2 S3
// ============================================================================

async function deleteFileFromB2(key: string): Promise<void> {
  const s3 = getS3()
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.b2Bucket,
      Key: key,
    })
  )
}

// ============================================================================
// POST /api/storage — Upload file
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Determine user identity
    // In production, get from session/cookies. For now, use header.
    const userId =
      request.headers.get('x-user-id') ??
      request.headers.get('x-user-email') ??
      'anonymous'

    // Parse form data
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const filenameOverride = (formData.get('filename') as string) ?? undefined
    let metadata: Record<string, unknown> = {}

    // Parse optional metadata
    const metadataStr = formData.get('metadata') as string | null
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr)
      } catch {
        metadata = {}
      }
    }

    // Validate file presence
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided in form data' },
        { status: 400 }
      )
    }

    // Validate file size against max
    if (file.size > env.maxFileSize) {
      const maxMB = Math.round(env.maxFileSize / 1024 / 1024)
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${maxMB}MB`,
          received: file.size,
          maxAllowed: env.maxFileSize,
        },
        { status: 413 }
      )
    }

    // Check quota
    const currentUsage = await getStorageUsage(userId)
    const newTotal = currentUsage + file.size
    const quotaBytes = env.quotaFreeGb * 1024 * 1024 * 1024

    if (newTotal > quotaBytes) {
      return NextResponse.json(
        {
          error: 'Storage quota exceeded',
          message: 'You have reached your storage limit. Upgrade your plan or delete old files.',
          currentUsage,
          quotaBytes,
          uploadSize: file.size,
          remaining: quotaBytes - currentUsage,
        },
        { status: 413 }
      )
    }

    // Determine filename
    let filename: string
    if (filenameOverride && filenameOverride.trim().length > 0) {
      // Sanitize user-provided filename
      const sanitized = filenameOverride
        .replace(/[^\w\-.() ]/g, '_') // Keep alphanumeric, dash, dot, underscore, parens, space
        .replace(/\.+/g, '.') // Collapse multiple dots
        .replace(/^\.+/, '') // Remove leading dots
        .replace(/\.+$/, '') // Remove trailing dots
        .slice(0, 200) // Limit length

      if (sanitized.length === 0) {
        filename = `${randomUUID()}.bin`
      } else {
        // Add timestamp to avoid collisions
        const ext = extname(sanitized) || ''
        const base = basename(sanitized, ext)
        filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${base}${ext}`
      }
    } else {
      // Auto-generate filename
      const ext = file.name ? extname(file.name) || '.bin' : '.bin'
      filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`
    }

    // Write file directly to B2 S3
    const uint8Array = await file.arrayBuffer()
    const buffer = new Uint8Array(uint8Array)
    const fileKey = userKey(userId, filename)
    await writeFileToB2(fileKey, buffer, file.type ?? 'application/octet-stream')

    // Calculate remaining quota
    const remaining = quotaBytes - newTotal

    // Build response
    const response: {
      success: boolean
      filename: string
      size: number
      mimeType: string
      createdAt: string
      storage: {
        used: number
        quota: number
        remaining: number
        files: number
      }
    } = {
      success: true,
      filename,
      size: file.size,
      mimeType: file.type ?? 'application/octet-stream',
      createdAt: new Date().toISOString(),
      storage: {
        used: newTotal,
        quota: quotaBytes,
        remaining: Math.max(0, remaining),
        files: (await listUserFiles(userId)).length + 1,
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('POST /api/storage error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/storage — List files and show usage
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId =
      request.headers.get('x-user-id') ??
      request.headers.get('x-user-email') ??
      'anonymous'

    const files = await listUserFiles(userId)
    const usage = await getStorageUsage(userId)
    const quotaBytes = env.quotaFreeGb * 1024 * 1024 * 1024

    return NextResponse.json({
      files,
      storage: {
        used: usage,
        quota: quotaBytes,
        remaining: Math.max(0, quotaBytes - usage),
        files: files.length,
      },
    })
  } catch (err) {
    console.error('GET /api/storage error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/storage — Delete a file
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId =
      request.headers.get('x-user-id') ??
      request.headers.get('x-user-email') ??
      'anonymous'

    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json(
        { error: 'filename query parameter is required' },
        { status: 400 }
      )
    }

    // Validate filename to prevent path traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      )
    }

    // Check file exists in B2
    const fileKey = userKey(userId, filename)
    try {
      await getS3().send(new HeadObjectCommand({ Bucket: env.b2Bucket, Key: fileKey }))
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete file from B2
    await deleteFileFromB2(fileKey)

    // Get updated usage
    const newUsage = await getStorageUsage(userId)
    const quotaBytes = env.quotaFreeGb * 1024 * 1024 * 1024
    const remaining = quotaBytes - newUsage

    return NextResponse.json({
      success: true,
      deleted: filename,
      storage: {
        used: newUsage,
        quota: quotaBytes,
        remaining: Math.max(0, remaining),
        files: (await listUserFiles(userId)).length,
      },
    })
  } catch (err) {
    console.error('DELETE /api/storage error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
// Sat Aug 29 07:49:38 +06 2026
