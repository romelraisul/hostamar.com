import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    BREVO_API_KEY: process.env.BREVO_API_KEY ? `present (${process.env.BREVO_API_KEY.length} chars) starts=${process.env.BREVO_API_KEY.slice(0, 10)}` : 'MISSING',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL_HOST: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'no DATABASE_URL',
  })
}
