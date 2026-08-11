import { NextRequest, NextResponse } from 'next/server'

type PaymentMethod = {
  name: string
  number?: string
  address?: string
  network?: string
  type: string
  instructions: string
  qrData?: string
}

// Personal payment endpoints — no business documents required
const PERSONAL_PAYMENT_METHODS: Record<string, PaymentMethod> = {
  bkash: {
    name: 'bKash',
    number: process.env.PERSONAL_BKASH_NUMBER || '',
    type: 'personal',
    instructions: '1. Open bKash app\n2. Select "Send Money"\n3. Enter the number above\n4. Enter amount\n5. Confirm with your PIN',
  },
  nagad: {
    name: 'Nagad',
    number: process.env.PERSONAL_NAGAD_NUMBER || '',
    type: 'personal',
    instructions: '1. Open Nagad app\n2. Select "Send Money"\n3. Enter the number above\n4. Enter amount\n5. Confirm with your PIN',
  },
  rocket: {
    name: 'Rocket',
    number: process.env.PERSONAL_ROCKET_NUMBER || '',
    type: 'personal',
    instructions: '1. Open Rocket app\n2. Select "Send Money"\n3. Enter the number above\n4. Enter amount\n5. Confirm with your PIN',
  },
  usdt: {
    name: 'USDT (Binance P2P)',
    address: process.env.PERSONAL_USDT_ADDRESS || '',
    network: 'TRC20',
    type: 'crypto',
    instructions: '1. Open Binance app\n2. Go to P2P Trading\n3. Select "Sell" USDT\n4. Enter amount in BDT\n5. Choose buyer and complete trade',
  },
}

export async function GET() {
  const available: Record<string, { name: string; number?: string; address?: string; network?: string }> = {}

  for (const [key, method] of Object.entries(PERSONAL_PAYMENT_METHODS)) {
    if (method.number || method.address) {
      available[key] = {
        name: method.name,
        ...(method.number ? { number: method.number } : {}),
        ...(method.address ? { address: method.address, network: method.network } : {}),
      }
    }
  }

  return NextResponse.json({
    success: true,
    methods: available,
    note: 'Send money to the appropriate number/address, then contact support with your transaction ID.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { method, transactionId, amount, customerEmail, plan } = body

    if (!method || !transactionId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('[payment] Received payment notification:', {
      method,
      transactionId,
      amount,
      customerEmail,
      plan,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Payment notification received. We will verify and activate your subscription within 24 hours.',
    })
  } catch (error) {
    console.error('[payment] Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
