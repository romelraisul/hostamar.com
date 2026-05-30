import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const courseId = searchParams.get("courseId");

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  try {
    const progress = await prisma.userProgress.findMany({
      where: {
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
  const { userId, courseId, lessonId, completed, quizScore } = await req.json();

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