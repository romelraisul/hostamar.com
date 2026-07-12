export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// Proxy storage requests to MinIO with correct bucket path
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params
  const path = pathSegments.join('/')
  
  // MinIO endpoint
  const minioEndpoint = process.env.R2_ENDPOINT || 'http://hostamar-minio:9000'
  const bucket = process.env.R2_BUCKET || 'hostamar-videos'
  
  // Construct MinIO URL with bucket as first path segment
  const minioUrl = `${minioEndpoint}/${bucket}/${path}`
  
  try {
    // Forward request to MinIO
    const response = await fetch(minioUrl, {
      method: 'GET',
      headers: {
        // Forward relevant headers
        'Range': req.headers.get('Range') || '',
        'If-None-Match': req.headers.get('If-None-Match') || '',
        'If-Modified-Since': req.headers.get('If-Modified-Since') || '',
      },
      // Don't follow redirects automatically
      redirect: 'manual',
    })
    
    // Create response with MinIO's headers
    const headers = new Headers()
    
    // Copy relevant headers from MinIO response
    const copyHeaders = [
      'Content-Type',
      'Content-Length',
      'Content-Range',
      'Accept-Ranges',
      'ETag',
      'Last-Modified',
      'Cache-Control',
      'Expires',
    ]
    
    for (const header of copyHeaders) {
      const value = response.headers.get(header)
      if (value) {
        headers.set(header, value)
      }
    }
    
    // Add CORS headers for browser video playback
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Range, If-None-Match, If-Modified-Since')
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified')
    
    // Return streamed response
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch (error) {
    console.error('Storage proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 })
  }
}

// Handle HEAD requests for video metadata
export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return GET(req, { params })
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, If-None-Match, If-Modified-Since',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag, Last-Modified',
      'Access-Control-Max-Age': '86400',
    },
  })
}