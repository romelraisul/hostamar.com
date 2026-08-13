import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { getCreditAccount, deductCredits, CREDIT_COSTS } from '@/lib/credits'

export type CreditPolicy = {
  product: keyof typeof CREDIT_COSTS
  cost: number
  getRequestBody?: (req: NextRequest) => Promise<{ [key: string]: any }>
}

export async function requireCredits(request: NextRequest, policy: CreditPolicy) {
  const user = await getAuthUser(request)
  const customerId = user?.id

  let body: { [key: string]: any } = {}
  if (policy.getRequestBody) {
    body = await policy.getRequestBody(request)
  }

  if (!customerId) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const account = await getCreditAccount(customerId)
  if (account.credits < policy.cost) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Insufficient credits', required: policy.cost, balance: account.credits },
        { status: 402 },
      ),
    }
  }

  await deductCredits(customerId, policy.cost, policy.product, `${policy.product} usage`)
  return { ok: true as const, customerId, balance: account.credits - policy.cost }
}
