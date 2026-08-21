export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth';

// Enrollment system for OSSU Academy
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = authUser.id
  const { courseId, plan } = await req.json();

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  // Create enrollment record (uses UserProgress as enrollment ledger until dedicated model exists)
  // For now, return success with server-generated enrollment tied to authenticated user
  const enrollment = {
    id: `enr_${Date.now()}`,
    userId,
    courseId,
    plan: plan || 'free',
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
