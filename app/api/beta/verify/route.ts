export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    // Validate input
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Normalize the code
    const normalizedCode = code.trim().toUpperCase();

    // Find the invite
    const invite = await prisma.betaInvite.findUnique({
      where: { code: normalizedCode },
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    // Check if expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      // Auto-expire if past expiry
      if (invite.status === 'PENDING') {
        await prisma.betaInvite.update({
          where: { id: invite.id },
          data: { status: 'EXPIRED' },
        });
      }
      return NextResponse.json(
        { success: false, error: 'Invite code has expired' },
        { status: 410 }
      );
    }

    // Check current status
    switch (invite.status) {
      case 'ACTIVE':
        return NextResponse.json(
          {
            success: true,
            message: 'Invite code is already active',
            invite: {
              code: invite.code,
              name: invite.name,
              email: invite.email,
              status: invite.status,
              discountPercent: invite.discountPercent,
            },
          },
          { status: 200 }
        );

      case 'USED':
        return NextResponse.json(
          { success: false, error: 'Invite code has already been used' },
          { status: 410 }
        );

      case 'EXPIRED':
        return NextResponse.json(
          { success: false, error: 'Invite code has expired' },
          { status: 410 }
        );

      case 'PENDING':
        // Activate the invite
        const activated = await prisma.betaInvite.update({
          where: { id: invite.id },
          data: {
            status: 'ACTIVE',
            usedAt: new Date(),
          },
        });

        return NextResponse.json(
          {
            success: true,
            message: 'Invite code activated successfully',
            invite: {
              code: activated.code,
              name: activated.name,
              email: activated.email,
              status: activated.status,
              discountPercent: activated.discountPercent,
              usedAt: activated.usedAt,
            },
          },
          { status: 200 }
        );

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown invite status' },
          { status: 500 }
        );
    }
  } catch (e) {
    console.error('Beta verify error:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to verify invite code' },
      { status: 500 }
    );
  }
}