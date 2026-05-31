import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

function generateInviteCode(): string {
  // Generate a secure 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Ambiguous chars (0/O, 1/I) excluded
  const buffer = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[buffer[i] % chars.length];
  }
  return `HOSTAMAR-${code}`;
}

async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateInviteCode();
    const existing = await prisma.betaInvite.findUnique({ where: { code } });
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique invite code');
}

export async function POST(request: Request) {
  try {
    const { name, email, phone } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if this email already has a pending invite
    const existingInvite = await prisma.betaInvite.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        status: { in: ['PENDING', 'ACTIVE'] }
      }
    });

    if (existingInvite) {
      return NextResponse.json(
        {
          success: false,
          error: 'An active invite already exists for this email',
          code: existingInvite.code,
        },
        { status: 409 }
      );
    }

    // Generate unique invite code
    const code = await generateUniqueCode();

    // Default expiry: 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create the beta invite
    const invite = await prisma.betaInvite.create({
      data: {
        code,
        name,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        status: 'PENDING',
        discountPercent: 10,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        invite: {
          id: invite.id,
          code: invite.code,
          name: invite.name,
          email: invite.email,
          status: invite.status,
          discountPercent: invite.discountPercent,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('Beta signup error:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to create beta invite' },
      { status: 500 }
    );
  }
}
