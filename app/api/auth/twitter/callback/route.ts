export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { env } from '@/lib/env'

const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID!
const TWITTER_CLIENT_SECRET = env.TWITTER_CLIENT_SECRET!
const REDIRECT_URI = `${env.NEXTAUTH_URL}/api/auth/twitter/callback`

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return NextResponse.redirect(new URL('/login', env.NEXTAUTH_URL))
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // this is the code_verifier
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?twitter_error=${error || 'auth_failed'}`, env.NEXTAUTH_URL)
    )
  }

  // Retrieve and clear the code verifier from cookie
  const cookie = req.cookies.get('twitter_code_verifier')
  const codeVerifier = cookie?.value

  if (!codeVerifier || codeVerifier !== state) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?twitter_error=invalid_verifier', env.NEXTAUTH_URL)
    )
  }

  // Exchange authorization code for access token
  try {
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Twitter token exchange failed:', err)
      return NextResponse.redirect(
        new URL('/dashboard/settings?twitter_error=token_exchange_failed', env.NEXTAUTH_URL)
      )
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in, scope, id: twitterUserId } = tokenData

    // Get user info to fetch username
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=username', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })
    const userData = userRes.ok ? await userRes.json() : null
    const twitterUsername = userData?.data?.username || null

    // Store in database
    await prisma.customer.update({
      where: { email: authUser.email },
      data: {
        twitterAccessToken: access_token,
        twitterAccessTokenExpiry: new Date(Date.now() + expires_in * 1000),
        twitterUserId,
        twitterUsername,
      },
    })

    const response = NextResponse.redirect(
      new URL('/dashboard/settings?twitter_connected=1', env.NEXTAUTH_URL)
    )
    response.cookies.delete('twitter_code_verifier')
    return response
  } catch (err) {
    console.error('Twitter OAuth error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/settings?twitter_error=server_error', env.NEXTAUTH_URL)
    )
  }
}