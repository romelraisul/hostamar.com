import { NextRequest, NextResponse } from "next/server";

// Enrollment system for OSSU Academy
export async function POST(req: NextRequest) {
  const { userId, courseId, plan } = await req.json();

  // In production, save to database
  const enrollment = {
    id: `enr_${Date.now()}`,
    userId,
    courseId,
    plan,
    status: "active",
    enrolledAt: new Date().toISOString(),
    expiresAt: plan === "premium" 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
      : null
  };

  return NextResponse.json({ 
    success: true, 
    enrollment,
    message: `Successfully enrolled in ${courseId}` 
  });
}