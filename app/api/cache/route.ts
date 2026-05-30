import { NextRequest, NextResponse } from 'next/server'
import { responseCache } from '@/lib/cache'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  const stats = responseCache.stats()
  return NextResponse.json({
    success: true,
    stats,
  })
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { action, key } = body

  if (action === 'clear') {
    responseCache.clear()
    return NextResponse.json({ success: true, message: 'Cache cleared' })
  }

  if (action === 'delete' && key) {
    const deleted = responseCache.delete(key)
    return NextResponse.json({ success: deleted, message: deleted ? 'Key deleted' : 'Key not found' })
  }

  if (action === 'stats') {
    const stats = responseCache.stats()
    return NextResponse.json({ success: true, stats })
  }

  return NextResponse.json({ success: false, error: 'Invalid action. Use: clear, delete, or stats' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  responseCache.clear()
  return NextResponse.json({ success: true, message: 'Cache cleared' })
}
