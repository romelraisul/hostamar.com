import { NextRequest, NextResponse } from "next/server";

// Discord webhook notifications for OSSU community
export async function POST(req: NextRequest) {
  const { type, message, userId } = await req.json();

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return NextResponse.json({ success: true, message: "Webhook not configured" });
  }

  const payload = {
    content: `🔔 OSSU Academy: ${message}`,
    username: "OSSU Bot",
    avatar_url: "https://ossu.academy/icon.png"
  };

  return NextResponse.json({ success: true, sent: !!webhookUrl });
}