import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  return NextResponse.json({
    success: true,
    serverId: id,
    status: 'running',
    ready: true,
    url: `/ide/preview?serverId=${encodeURIComponent(id)}`,
  });
}
