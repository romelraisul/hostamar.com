import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/error
 *
 * NextAuth's built-in error page redirects here on auth failure.
 * We redirect to the login page with the error parameter so the
 * frontend can display a user-friendly Bengali error message.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const error = url.searchParams.get('error') || 'CredentialsSignin'
  // Use 302 (not 307) to force browser to navigate to login page
  return NextResponse.redirect(new URL(`/login?error=${error}`, req.url), 302)
}
