import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // this is the code_verifier
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?twitter_error=${error || 'auth_failed'}`, process.env.NEXTAUTH_URL)
    )
  }

  // Retrieve and clear the code verifier from cookie
  const cookie = request.cookies.get('twitter_code_verifier')
  const codeVerifier = cookie?.value

  if (!codeVerifier || codeVerifier !== state) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?twitter_error=invalid_verifier', process.env.NEXTAUTH_URL)
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
        new URL('/dashboard/settings?twitter_error=token_exchange_failed', process.env.NEXTAUTH_URL)
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
      where: { email: session.user.email },
      data: {
        twitterAccessToken: access_token,
        twitterAccessTokenExpiry: new Date(Date.now() + expires_in * 1000),
        twitterUserId,
        twitterUsername,
      },
    })

    const response = NextResponse.redirect(
      new URL('/dashboard/settings?twitter_connected=1', process.env.NEXTAUTH_URL)
    )
    response.cookies.delete('twitter_code_verifier')
    return response
  } catch (err) {
    console.error('Twitter OAuth error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/settings?twitter_error=server_error', process.env.NEXTAUTH_URL)
    )
  }
}