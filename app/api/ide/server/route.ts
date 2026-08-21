export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

/**
 * /api/ide/server — browser coding workspace provisioning.
 *
 * The in-browser code editor itself is REAL (see /api/ide/run — sandboxed JS/TS
 * execution, and /api/ide/deploy — workspace tarball export). The Docker
 * container provisioning behind this endpoint requires a container host that
 * is not yet wired to Vercel, so it is explicitly BETA: we return an honest
 * status instead of fabricating server IDs.
 */

const IDE_PROVIDER_CONFIGURED = !!(
  process.env.IDE_DOCKER_HOST || process.env.IDE_PROVIDER_URL
);

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!IDE_PROVIDER_CONFIGURED) {
    return NextResponse.json(
      {
        success: false,
        error: 'IDE_NOT_CONFIGURED',
        status: 'beta',
        message:
          'Docker workspace provisioning is in beta and not yet available. Use the in-browser code editor (run/deploy) which is live.',
      },
      { status: 503 }
    );
  }

  // Real provider path (enabled once IDE_DOCKER_HOST / IDE_PROVIDER_URL is set).
  const body = await req.json().catch(() => ({}));
  const image = (body as any).image || 'openvscode/openvscode-server';
  try {
    const providerUrl = process.env.IDE_PROVIDER_URL || process.env.IDE_DOCKER_HOST;
    const res = await fetch(`${providerUrl}/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, cpu: (body as any).cpu || 2, memory: (body as any).memory || 2048, ownerId: authUser.id }),
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `IDE provider error ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { id?: string; url?: string };
    return NextResponse.json(
      { success: true, serverId: data.id, status: 'provisioning', url: data.url, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'IDE provider unreachable' }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!IDE_PROVIDER_CONFIGURED) {
    return NextResponse.json({
      success: true,
      status: 'beta',
      message: 'Docker workspace provisioning is in beta. The in-browser code editor is live.',
      servers: [],
    });
  }

  try {
    const providerUrl = process.env.IDE_PROVIDER_URL || process.env.IDE_DOCKER_HOST;
    const res = await fetch(`${providerUrl}/servers?ownerId=${encodeURIComponent(authUser.id)}`);
    if (!res.ok) {
      return NextResponse.json({ success: true, status: 'beta', servers: [] });
    }
    const data = (await res.json()) as { servers?: unknown[] };
    return NextResponse.json({ success: true, status: 'live', servers: data.servers || [] });
  } catch {
    return NextResponse.json({ success: true, status: 'beta', servers: [] });
  }
}
