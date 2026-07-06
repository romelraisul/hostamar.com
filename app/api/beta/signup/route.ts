import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';
import { sendBetaInviteEmail } from '@/lib/email';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    const existingInvite = await prisma.betaInvite.findFirst({
      where: { email: email.toLowerCase().trim(), status: { in: ['PENDING', 'ACTIVE'] } }
    });

    if (existingInvite) {
      return NextResponse.json({ success: false, error: 'An active invite already exists for this email', code: existingInvite.code }, { status: 409 });
    }

    const code = await generateUniqueCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

    // Track in CRM
    await prisma.lead.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        source: 'beta-signup',
        status: 'new',
        notes: `Beta invite: ${code} | 10% off | Expires: ${expiresAt.toISOString().split('T')[0]}`,
      },
    }).catch((leadError: any) => console.warn('[Beta Signup] CRM Lead failed:', leadError?.message));

    // Email the invite code — fails gracefully
    try {
      await sendBetaInviteEmail(invite.email, invite.name || invite.email.split('@')[0], code);
    } catch (emailError: any) {
      console.warn('[Beta Signup] Invite email failed:', emailError?.message);
    }

    return NextResponse.json({
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
    }, { status: 201 });

  } catch (e: any) {
    console.error('Beta signup error:', e);
    return NextResponse.json({ success: false, error: 'Failed to create beta invite' }, { status: 500 });
  }
}