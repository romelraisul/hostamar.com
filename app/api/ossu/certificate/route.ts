import { NextRequest, NextResponse } from "next/server";

// Certificate generation endpoint
export async function POST(req: NextRequest) {
  const { userId, courseId, userName } = await req.json();

  // Verify completion (in production, check DB for 100% progress)
  const certificate = {
    id: `${userId}-${courseId}-${Date.now()}`,
    userId,
    courseId,
    userName,
    issuedAt: new Date().toISOString(),
    verificationUrl: `https://hostamar.com/ossu/certificate/${userId}/${courseId}`,
  };

  return NextResponse.json({ success: true, certificate });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const courseId = searchParams.get("courseId");

  // Return certificate if exists
  return NextResponse.json({
    certificate: {
      id: `${userId}-${courseId}`,
      name: "OSSU Academy Certificate",
      course: courseId,
      issued: new Date().toISOString(),
    }
  });
}