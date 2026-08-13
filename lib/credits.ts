import { prisma } from '@/lib/prisma'

export const CREDIT_COSTS = {
  // Base units per product action.
  video_wan_5s: 100,
  video_hunyuan_5s: 180,
  image_sd: 15,
  image_flux: 25,
  chat_message: 2,
  browser_search: 5,
  ide_task: 10,
  game_spin: 5,
  hosting_check: 8,
} as const

export type CreditProduct = keyof typeof CREDIT_COSTS | 'bonus' | 'purchase' | 'refund' | 'admin'

export async function getCreditAccount(customerId: string) {
  const account = await prisma.creditAccount.findUnique({
    where: { customerId },
  })
  if (!account) {
    return prisma.creditAccount.create({
      data: { customerId, credits: 0, consumed: 0 },
    })
  }
  return account
}

function productUpdates(product: CreditProduct, amount: number, current: any) {
  const updates: any = {}
  if (product === 'video_wan_5s' || product === 'video_hunyuan_5s') updates.videoCredits = current.videoCredits + amount
  if (product === 'image_sd' || product === 'image_flux') updates.imageCredits = current.imageCredits + amount
  if (product === 'chat_message') updates.chatCredits = current.chatCredits + amount
  if (product === 'browser_search') updates.browserCredits = current.browserCredits + amount
  if (product === 'ide_task') updates.ideCredits = current.ideCredits + amount
  if (product === 'game_spin') updates.gameCredits = current.gameCredits + amount
  if (product === 'hosting_check') updates.hostingCredits = current.hostingCredits + amount
  return updates
}

export async function addCredits(customerId: string, amount: number, product: CreditProduct, description?: string) {
  if (amount <= 0) return await getCreditAccount(customerId)

  const account = await prisma.$transaction(async (tx) => {
    const current = await tx.creditAccount.findUnique({ where: { customerId } })
    if (!current) {
      return tx.creditAccount.create({
        data: {
          customerId,
          credits: amount,
          consumed: 0,
          ...productUpdates(product, amount, { videoCredits: 0, imageCredits: 0, chatCredits: 0, browserCredits: 0, ideCredits: 0, gameCredits: 0, hostingCredits: 0 }),
        },
      })
    }

    const newCredits = current.credits + amount
    const updates: any = { credits: newCredits }
    Object.assign(updates, productUpdates(product, amount, current))

    return tx.creditAccount.update({
      where: { customerId },
      data: updates,
    })
  })

  await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      amount,
      balanceAfter: account.credits,
      product,
      description: description || `+${amount} credits (${product})`,
    },
  })

  return account
}

export async function deductCredits(customerId: string, amount: number, product: CreditProduct, description?: string) {
  if (amount <= 0) return await getCreditAccount(customerId)

  const account = await prisma.$transaction(async (tx) => {
    const current = await tx.creditAccount.findUnique({ where: { customerId } })
    if (!current) {
      throw new Error('No credit account found')
    }

    if (current.credits < amount) {
      throw new Error('Insufficient credits')
    }

    const newCredits = current.credits - amount
    const newConsumed = current.consumed + amount
    const updates: any = { credits: newCredits, consumed: newConsumed }
    Object.assign(updates, productUpdates(product, -amount, current))

    return tx.creditAccount.update({
      where: { customerId },
      data: updates,
    })
  })

  await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      amount: -amount,
      balanceAfter: account.credits,
      product,
      description: description || `-${amount} credits (${product})`,
    },
  })

  return account
}

export async function ensureFreeCredits(customerId: string, amount = 6000) {
  const account = await getCreditAccount(customerId)
  if (account.credits < amount) {
    return addCredits(customerId, amount - account.credits, 'bonus', 'Welcome bonus credits')
  }
  return account
}
