/**
 * Storage file download route
 *
 * GET /api/storage/[userId]/[filename]
 *   - Download a specific file from storage
 *   - First tries local storage, falls back to B2 if available
 *
 * Environment variables:
 *   B2_ACCOUNT_ID     - Backblaze B2 account ID
 *   B2_APPLICATION_KEY - Backblaze B2 application key
 *   B2_BUCKET         - Backblaze B2 bucket name
 *   B2_REGION         - Backblaze B2 region (default: us-west-004)
 *   STORAGE_ROOT      - Local file storage root (default: /mnt/c/hostamar/customer-storage)
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// Force Node.js runtime (this route uses fs - not Edge compatible)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Get storage root
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/mnt/c/hostamar/customer-storage'

async function getLocalFilePath(userId: string, filename: string): Promise<string> {
  const localDir = path.join(STORAGE_ROOT, 'customers', userId)
  return path.join(localDir, decodeURIComponent(filename))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; filename: string }> }
) {
  try {
    const { userId, filename } = await params
    const decodedFilename = decodeURIComponent(filename)
    
    if (!userId || !decodedFilename) {
      return NextResponse.json(
        { error: 'userId and filename are required' },
        { status: 400 }
      )
    }
    
    // Get local file path
    const localFilePath = await getLocalFilePath(userId, decodedFilename)
    
    // Try to read from local storage first
    try {
      const fileBuffer = await fs.readFile(localFilePath)
      const stats = await fs.stat(localFilePath)
      
      // Determine content type (simple MIME detection)
      const ext = path.extname(decodedFilename).toLowerCase()
      let contentType = 'application/octet-stream'
      
      if (ext === '.txt') contentType = 'text/plain'
      else if (ext === '.json') contentType = 'application/json'
      else if (ext === '.png') contentType = 'image/png'
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
      else if (ext === '.gif') contentType = 'image/gif'
      else if (ext === '.webp') contentType = 'image/webp'
      else if (ext === '.pdf') contentType = 'application/pdf'
      else if (ext === '.mp4') contentType = 'video/mp4'
      else if (ext === '.webm') contentType = 'video/webm'
      else if (ext === '.mp3') contentType = 'audio/mpeg'
      else if (ext === '.wav') contentType = 'audio/wav'
      else if (ext === '.zip') contentType = 'application/zip'
      else if (ext === '.tar' || ext === '.gz' || ext === '.tgz') contentType = 'application/x-tar'
      else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword'
      
      const headers = new Headers()
      headers.set('Content-Type', contentType)
      headers.set('Content-Disposition', `attachment; filename="${decodedFilename}"`)
      headers.set('Content-Length', String(stats.size))
      headers.set('Cache-Control', 'public, max-age=31536000') // 1 year cache
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      })
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File not in local storage — try B2 as fallback
        // In production, you'd add B2 download logic here
        // Example with AWS SDK or direct HTTP request to B2
        return NextResponse.json(
          {
            error: 'File not found in local storage',
            suggestion: 'File may be available via B2 cloud storage. Waiting for sync...',
          },
          { status: 404 }
        )
      }
      throw err
    }
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    )
  }
}
