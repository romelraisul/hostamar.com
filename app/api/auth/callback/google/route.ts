import { NextResponse } from 'next/server'
import { signToken } from '@/lib/auth-utils'
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=sso_callback_failed', req.url))
  }
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostamar.com'}/api/auth/callback/google`
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.id_token) throw new Error('No id_token')
    // Verify id_token via Google
    const userRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenData.id_token}`)
    const user = await userRes.json()
    if (!user.email) throw new Error('No email from Google')
    // Create custom JWT via Turso edge lib/auth-utils.ts ultra-defensive
    // Use extra parameter for picture and provider fields
    const jwt = signToken(
      { email: user.email, name: user.name, id: user.sub || user.email },
      { picture: user.picture, provider: 'google' }
    )
    const res = NextResponse.redirect(new URL('/', req.url))
    res.cookies.set('hostamar_token', jwt, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*30 })
    return res
  } catch (e) {
    console.error('Google SSO callback failed', e)
    return NextResponse.redirect(new URL('/login?error=sso_callback_failed', req.url))
  }
}
