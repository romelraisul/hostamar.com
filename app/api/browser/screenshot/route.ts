export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const target = new URL(url);

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