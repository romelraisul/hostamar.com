export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost')) return true;
  if (h === '169.254.169.254' || h === 'metadata.google.internal') return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (h.match(/^172\.(1[6-9]|2\d|3[0-1])\./)) return true;
  if (h === '0.0.0.0') return true;
  return false;
}
;

export async function POST(request: NextRequest) {
  const _auth = await getAuthUser(request);
  if (!_auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const target = new URL(url);
    if (isBlockedHost(target.hostname)) return NextResponse.json({ error: 'Blocked host' }, { status: 403 });

    const canvasServer = `${process.env.CAMOFOX_HOST || 'http://localhost:4000'}/api/canvas`;
    const canvasRes = await fetch(canvasServer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target.href, width: 1280, height: 900 }),
    }).catch(() => undefined);

    if (canvasRes && canvasRes.ok) {
      const data = await canvasRes.json().catch(() => ({}));
      const image = data?.image || data?.screenshot || data?.canvas || null;
      if (image) {
        return NextResponse.json({ image });
      }
    }

    const screenshotServer = `${process.env.CAMOFOX_HOST || 'http://localhost:4000'}/api/screenshot`;
    const screenshotRes = await fetch(screenshotServer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target.href, width: 1280, height: 900 }),
    }).catch(() => undefined);

    if (screenshotRes && screenshotRes.ok) {
      const data = await screenshotRes.json().catch(() => ({}));
      const image = data?.image || data?.screenshot || null;
      if (image) {
        return NextResponse.json({ image });
      }
    }

    return NextResponse.json(
      { error: 'Screenshot service unavailable. Ensure camofox/canvas service is running.' },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Browser screenshot error:', error);
    return NextResponse.json({ error: 'Invalid request', message: error?.message }, { status: 400 });
  }
}