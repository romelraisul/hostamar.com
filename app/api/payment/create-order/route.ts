export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const SSL_STORE_ID = process.env.SSL_STORE_ID || ''
const SSL_STORE_PASS = process.env.SSL_STORE_PASS || ''
const SSL_BASE = process.env.SSL_SANDBOX === 'true'
  ? 'https://sandbox.sslcommerz.com'
  : 'https://secure.sslcommerz.com'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { package: pkg, amount } = await req.json()

    if (!pkg || !amount) {
      return NextResponse.json({ error: 'Package and amount required' }, { status: 400 })
    }

    const creditsMap: Record<string, number> = { starter: 10, growth: 30, pro: 100 }
    const credits = creditsMap[pkg] || 0

    // Create transaction in our DB
    const transaction = await prisma.transaction.create({
      data: {
        customerId: authUser.id,
        amount,
        currency: 'BDT',
        status: 'pending',
        gateway: 'sslcommerz',
        videoPackage: pkg,
        creditsAdded: credits,
      },
    })

    const tranId = `HOSTAMAR-${transaction.id}-${Date.now()}`
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // SSLCOMMERZ session initialization
    const formData = new URLSearchParams()
    formData.append('store_id', SSL_STORE_ID)
    formData.append('store_passwd', SSL_STORE_PASS)
    formData.append('total_amount', amount.toString())
    formData.append('currency', 'BDT')
    formData.append('tran_id', tranId)
    formData.append('success_url', `${appUrl}/api/payment/ipn?type=success`)
    formData.append('fail_url', `${appUrl}/api/payment/ipn?type=fail`)
    formData.append('cancel_url', `${appUrl}/api/payment/ipn?type=cancel`)
    formData.append('cus_name', authUser.name || 'Customer')
    formData.append('cus_email', authUser.email || '')
    formData.append('cus_add1', 'N/A')
    formData.append('cus_city', 'Dhaka')
    formData.append('cus_country', 'Bangladesh')
    formData.append('cus_phone', 'N/A')
    formData.append('product_name', `Hostamar ${pkg} Package`)
    formData.append('product_category', 'Video Credits')
    formData.append('product_profile', 'general')
    formData.append('shipping_method', 'NO')

    const sslRes = await fetch(`${SSL_BASE}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const sslData = await sslRes.json()

    if (sslData.status === 'SUCCESS' && sslData.GatewayPageURL) {
      // Update transaction with session key
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { sessionKey: sslData.sessionkey || null },
      })

      return NextResponse.json({ url: sslData.GatewayPageURL })
    }

    // If sandbox mode and no real credentials, simulate success
    if (SSL_SANDBOX_CHECK()) {
      const simulatedUrl = `${appUrl}/api/payment/ipn?type=success&tran_id=${tranId}&amount=${amount}&currency=BDT`
      return NextResponse.json({ url: simulatedUrl })
    }

    // Failed to create session
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'failed' },
    })

    console.error('SSLCOMMERZ error:', sslData)
    return NextResponse.json({ error: 'Payment gateway unavailable. Please try again.' }, { status: 502 })
  } catch (error: any) {
    console.error('Payment create error:', error?.message || error)
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 })
  }
}

function SSL_SANDBOX_CHECK() {
  return process.env.SSL_SANDBOX === 'true' && (!SSL_STORE_ID || SSL_STORE_ID === 'test')
}