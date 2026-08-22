export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthUser } from '@/lib/auth'
import { env } from '@/lib/env'
const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID || ''
const REDIRECT_URI = `${env.NEXTAUTH_URL}/api/auth/twitter/callback`

// Twitter OAuth 2.0 PKCE flow — redirect user to Twitter to authorize
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/dashboard/settings', env.NEXTAUTH_URL))
  }

  if (!TWITTER_CLIENT_ID) {
    return NextResponse.json(
      { error: 'CONFIG_MISSING', message: 'TWITTER_CLIENT_ID is not configured. Add Twitter API credentials to enable Twitter connect.' },
      { status: 503 }
    )
  }

  const codeVerifier = crypto.randomBytes(48).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  // Store verifier in a short-lived cookie (5 min expiry)
  const response = NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${TWITTER_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=tweet.read%20tweet.write%20users.read%20offline.access&` +
      `state=${codeVerifier}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`
  )

  response.cookies.set('twitter_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  return response
}