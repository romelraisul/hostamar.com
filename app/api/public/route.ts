import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    public: true,
    message: 'Hostamar public API access',
    endpoints: {
      landing: '/',
      pricing: '/dashboard/pricing',
      payment_crypto: '/dashboard/payment/crypto',
      login: '/login'
    }
  })
}
