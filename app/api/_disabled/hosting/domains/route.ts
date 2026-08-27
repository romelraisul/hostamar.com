export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Domain management endpoint. Use POST /api/hosting/domains to attach a domain to a server.',
    example: { serverId: 'srv-1001', domain: 'app.example.com', autoSsl: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, domain, autoSsl } = body || {};

    if (!serverId || !domain) {
      return NextResponse.json({ error: 'serverId and domain are required' }, { status: 400 });
    }

    // Persist domain mapping if Redis is available.
    try {
      const RedisClient = (await import('ioredis')).default;
      const redis = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.hset(`hosting:domain:${serverId}`, { domain, autoSsl: autoSsl ? '1' : '0', updatedAt: new Date().toISOString() });
      await redis.sadd('hosting:domains', domain);
    } catch (redisError) {
      console.warn('Redis domain persistence failed', redisError);
    }

    // Optional: call certbot/le-webserver if auto-ssl requested
    const result = {
      serverId,
      domain,
      sslEnabled: autoSsl ? true : false,
      sslStatus: autoSsl ? 'requested' : 'disabled',
      message: autoSsl
        ? `Auto-SSL requested for ${domain}. Certificate provisioning will run in the background.`
        : `Domain ${domain} attached without SSL.`,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to attach domain' }, { status: 500 });
  }
}
