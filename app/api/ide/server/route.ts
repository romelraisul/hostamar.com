export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  const serverId = `ide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    success: true,
    serverId,
    status: 'provisioning',
    url: `/ide/preview?serverId=${serverId}`,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(payload, { status: 201 });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    servers: [],
    note: 'Server listing is mocked for the IDE product shell.',
  });
}