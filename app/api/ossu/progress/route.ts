export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id
  const { searchParams } = req.nextUrl;
  const courseId = searchParams.get("courseId");

  try {
    const progress = await prisma.userProgress.findMany({
      where: {
        userId,
        ...(courseId && { courseId }),
      },
      select: {
        id: true,
        courseId: true,
        lessonId: true,
        completed: true,
        quizScore: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    return NextResponse.json({ progress: [] });
  }
}

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id
  const { courseId, lessonId, completed, quizScore } = await req.json();

  if (!courseId || !lessonId) {
    return NextResponse.json({ error: 'courseId and lessonId required' }, { status: 400 })
  }

  try {
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_courseId_lessonId: { userId, courseId, lessonId },
      },
      update: { completed, quizScore },
      create: { userId, courseId, lessonId, completed, quizScore },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Error saving progress" });
  }
}
