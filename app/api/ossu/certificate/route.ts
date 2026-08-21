export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';

// Certificate generation endpoint — requires auth + real completed progress.
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id
  const { courseId } = await req.json();

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  // Verify real completion from DB — at least one completed lesson in this course.
  const completedCount = await prisma.userProgress.count({
    where: { userId, courseId, completed: true },
  });
  if (completedCount === 0) {
    return NextResponse.json(
      { success: false, error: 'No completed lessons found for this course. Complete lessons before requesting a certificate.' },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const userName = customer?.name || customer?.email || 'Student';

  const certificate = {
    id: `${userId}-${courseId}-${Date.now()}`,
    userId,
    courseId,
    userName,
    completedLessons: completedCount,
    issuedAt: new Date().toISOString(),
    verificationUrl: `${SITE_URL}/ossu/certificate/${userId}/${courseId}`,
  };

  return NextResponse.json({ success: true, certificate });
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id
  const { searchParams } = req.nextUrl;
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  // Only return a certificate if the user has real completed progress.
  const completedCount = await prisma.userProgress.count({
    where: { userId, courseId, completed: true },
  });
  if (completedCount === 0) {
    return NextResponse.json({ certificate: null, message: 'No certificate yet — complete lessons first.' });
  }

  const customer = await prisma.customer.findUnique({ where: { id: userId }, select: { name: true, email: true } });

  return NextResponse.json({
    certificate: {
      id: `${userId}-${courseId}`,
      name: "OSSU Academy Certificate",
      course: courseId,
      userName: customer?.name || customer?.email || 'Student',
      completedLessons: completedCount,
      issued: new Date().toISOString(),
    }
  });
}
