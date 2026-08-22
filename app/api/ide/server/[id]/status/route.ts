export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { env } from '@/lib/env'

/**
 * GET /api/ide/server/[id]/status — workspace readiness check.
 * Honest status: without a configured container host the workspace is never
 * "ready"; we report beta so the client shows the real state, not a fake one.
 */

const IDE_PROVIDER_CONFIGURED = !!(
  env.IDE_DOCKER_HOST || env.IDE_PROVIDER_URL
);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  if (!IDE_PROVIDER_CONFIGURED) {
    return NextResponse.json({
      success: true,
      serverId: id,
      status: 'beta',
      ready: false,
      message: 'Docker workspace provisioning is in beta and not yet available.',
    });
  }

  try {
    const providerUrl = env.IDE_PROVIDER_URL || env.IDE_DOCKER_HOST;
    const res = await fetch(`${providerUrl}/servers/${encodeURIComponent(id)}/status`);
    if (!res.ok) {
      return NextResponse.json({ success: true, serverId: id, status: 'unknown', ready: false });
    }
    const data = (await res.json()) as { status?: string; ready?: boolean; url?: string };
    return NextResponse.json({
      success: true,
      serverId: id,
      status: data.status || 'pending',
      ready: !!data.ready,
      url: data.url,
    });
  } catch {
    return NextResponse.json({ success: true, serverId: id, status: 'unknown', ready: false });
  }
}
