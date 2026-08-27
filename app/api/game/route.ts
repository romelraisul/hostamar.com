export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

export async function GET(request: NextRequest) {
  const _auth = await getAuthUser(request);
  if (!_auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, message: 'Game API is healthy.' })
}