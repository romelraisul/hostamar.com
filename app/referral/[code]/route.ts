import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// GET /referral/[code]
// Referral landing page — shown when someone visits /referral/XXXXXX
// Sets a cookie and renders a branded invite page.
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const normalizedCode = code?.toUpperCase().trim()

  // Validate code format (basic check)
  if (!normalizedCode || normalizedCode.length < 4) {
    return NextResponse.redirect(new URL('/signup', req.url))
  }

  // Look up the referrer
  const referrer = await prisma.customer.findFirst({
    where: { referralCode: normalizedCode },
    select: { id: true, name: true, referralCode: true },
  })

  // Build response with the landing HTML
  const referrerName = referrer?.name ? ` by ${referrer.name}` : ''
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to Hostamar${referrerName ? ' by ' + (referrer?.name ?? '') : ''}</title>
  <meta name="description" content="Join Hostamar — AI-powered video creation platform. Get ${referrerName ? 'bonus credits' : 'started for free'}!" />
  <meta property="og:title" content="You've been invited to Hostamar${referrerName ? ' by ' + (referrer?.name ?? '') : ''}" />
  <meta property="og:description" content="AI-powered video creation platform. Create professional videos with AI in minutes." />
  <meta property="og:type" content="website" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(59,130,246,0.15);
      border: 1px solid rgba(59,130,246,0.3);
      color: #60a5fa;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      line-height: 1.2;
    }
    h1 span { background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
    .referral-code {
      display: inline-block;
      background: rgba(168,85,247,0.15);
      border: 1px solid rgba(168,85,247,0.3);
      color: #c084fc;
      font-family: monospace;
      font-size: 18px;
      font-weight: 700;
      padding: 8px 20px;
      border-radius: 10px;
      letter-spacing: 2px;
      margin-bottom: 32px;
    }
    .cta {
      display: inline-block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      border-radius: 14px;
      text-decoration: none;
      transition: opacity 0.2s;
      margin-bottom: 16px;
    }
    .cta:hover { opacity: 0.9; }
    .note { color: #64748b; font-size: 13px; }
    .features {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin: 32px 0;
    }
    .feature {
      background: rgba(255,255,255,0.04);
      border-radius: 12px;
      padding: 16px 12px;
    }
    .feature-icon { font-size: 24px; margin-bottom: 8px; }
    .feature-label { font-size: 12px; color: #94a3b8; }
    .banner { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; padding: 10px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
      Invitation
    </div>

    ${referrer ? `<div class="banner">🎁 Referred by <strong>${referrer.name}</strong> — you'll both get bonus credits!</div>` : ''}

    <h1>You've been invited to try <span>Hostamar</span></h1>
    <p class="subtitle">AI-powered video creation platform. Create professional videos with AI avatars, subtitles, and voiceovers — in minutes.</p>

    ${referrer ? `<div class="referral-code">${normalizedCode}</div>` : ''}

    <a href="/signup?ref=${encodeURIComponent(normalizedCode)}" class="cta">Join Hostamar — It's Free</a>
    <p class="note">No credit card required · Free tier available</p>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">🎬</div>
        <div class="feature-label">AI Video</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🌍</div>
        <div class="feature-label">Multi-language</div>
      </div>
      <div class="feature">
        <div class="feature-icon">⚡</div>
        <div class="feature-label">Instant Export</div>
      </div>
    </div>
  </div>

  <script>
    // Auto-apply referral code cookie (lasts 7 days)
    document.cookie = 'referral_code=${normalizedCode}; max-age=${7 * 24 * 60 * 60}; path=/; SameSite=Lax';
  </script>
</body>
</html>`

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  })

  // Clear the referral code from URL
  // We intentionally keep it in the URL so social shares show the right info
  return response
}