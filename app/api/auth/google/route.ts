import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET() {
  const clientId = env.GOOGLE_CLIENT_ID || env.SSO_CLIENT_ID
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
  const redirectUri = `${baseUrl}/api/auth/callback/google`
  const scope = encodeURIComponent('openid email profile')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`
  return NextResponse.redirect(url)
}
