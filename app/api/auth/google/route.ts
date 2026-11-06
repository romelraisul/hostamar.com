import { NextResponse } from 'next/server'
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostamar.com'}/api/auth/callback/google`
  const scope = encodeURIComponent('openid email profile')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`
  return NextResponse.redirect(url)
}
