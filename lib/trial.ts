import prisma from '@/lib/prisma'

// Phase 0.1: lib/trial.ts interfaces with the prisma client. The bundled
// Prisma version in the build image is 7.x which uses prisma.config.ts;
// we use the v6 schema datasource URL still. Until prisma-cli regen runs
// (Phase 0.5), `prisma.trial` and `customer.trial` are not in generated
// types but ARE in the database. We type the call signatures locally so
// runtime works and TypeScript is happy.

// Type alias for the parts of prisma we touch in this file. Once the
// regenerated types include Trial + Customer.trial, this can collapse to
// `import { PrismaClient } from '...'`.
type TrialRow = {
  id: string
  customerId: string
  startedAt: Date
  expiresAt: Date
  convertedAt: Date | null
  planChosen: string | null
  source: string | null
  status: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
type CustomerWithTrial = { id: string; trial: TrialRow | null }

const db = prisma as unknown as {
  customer: {
    findUnique: (args: { where: { id: string }; include: { trial: true } }) => Promise<CustomerWithTrial | null>
  }
  trial: {
    findUnique: (args: { where: { customerId: string } }) => Promise<TrialRow | null>
    create: (args: { data: Partial<TrialRow> }) => Promise<TrialRow>
    update: (args: { where: { customerId: string }; data: Partial<TrialRow> }) => Promise<TrialRow>
  }
}

export const TRIAL_DURATION_DAYS = 7

/**
 * Trial status shape returned to UI for banners/badges/countdown.
 * Use this in components, not the raw DB row.
 */
export interface TrialStatus {
  exists: boolean
  customerId: string
  status: 'active' | 'expired' | 'converted' | 'cancelled' | 'missing'
  daysLeft: number
  hoursLeft: number
  startedAt: Date | null
  expiresAt: Date | null
  convertedAt: Date | null
  planChosen: string | null
  isActive: boolean
  isExpired: boolean
  isConverted: boolean
  source: string | null
}

/**
 * Read-only: returns the current trial state for a customer.
 * If no Trial row exists, returns a synthetic 'missing' status (legacy user).
 */
export async function getTrialStatus(customerId: string): Promise<TrialStatus | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: { trial: true },
  })
  if (!customer) {
    console.warn(`[trial] getTrialStatus: customer ${customerId} not found`)
    return null
  }

  const trial = customer.trial
  const now = new Date()

  if (!trial) {
    return {
      exists: false,
      customerId,
      status: 'missing',
      daysLeft: 0,
      hoursLeft: 0,
      startedAt: null,
      expiresAt: null,
      convertedAt: null,
      planChosen: null,
      isActive: false,
      isExpired: true,
      isConverted: false,
      source: null,
    }
  }

  const expiresAt = new Date(trial.expiresAt)
  const startedAt = new Date(trial.startedAt)
  const msLeft = expiresAt.getTime() - now.getTime()
  const isActive = trial.status === 'active' && msLeft > 0
  const isExpired = trial.status === 'expired' || (trial.status === 'active' && msLeft <= 0)
  const isConverted = trial.status === 'converted'

  const daysLeft = isActive
    ? Math.max(0, Math.ceil(msLeft / 86_400_000))
    : isExpired
      ? Math.floor(msLeft / 86_400_000)
      : 0
  const hoursLeft = isActive
    ? Math.max(0, Math.ceil(msLeft / 3_600_000))
    : isExpired
      ? Math.floor(msLeft / 3_600_000)
      : 0

  return {
    exists: true,
    customerId,
    status: trial.status as TrialStatus['status'],
    daysLeft,
    hoursLeft,
    startedAt,
    expiresAt,
    convertedAt: trial.convertedAt,
    planChosen: trial.planChosen,
    isActive,
    isExpired,
    isConverted,
    source: trial.source,
  }
}

/**
 * Idempotent: creates a Trial row if missing, otherwise returns existing.
 * Called on signup/register so every customer gets 7 days free.
 */
export async function ensureTrial(customerId: string): Promise<TrialStatus | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: { trial: true },
  })
  if (!customer) {
    console.warn(`[trial] ensureTrial: customer ${customerId} not found`)
    return null
  }

  if (customer.trial) {
    return getTrialStatus(customerId)
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000)
  const id = `trial_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

  await db.trial.create({
    data: {
      id,
      customerId,
      startedAt: now,
      expiresAt,
      source: 'signup',
      status: 'active',
    },
  })

  return getTrialStatus(customerId)
}

/**
 * Mark a trial as converted once a Subscription is created.
 * Called from the bKash/stripe/Rocket success flow.
 */
export async function markTrialConverted(
  customerId: string,
  plan: string,
): Promise<TrialStatus | null> {
  const existing = await db.trial.findUnique({ where: { customerId } })
  if (!existing) return getTrialStatus(customerId)
  if (existing.status === 'converted') return getTrialStatus(customerId)

  await db.trial.update({
    where: { customerId },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      planChosen: plan,
    },
  })
  return getTrialStatus(customerId)
}

/**
 * Manually cancel a trial (e.g. customer explicitly skips the trial).
 */
export async function cancelTrial(customerId: string): Promise<TrialStatus | null> {
  const existing = await db.trial.findUnique({ where: { customerId } })
  if (!existing) return getTrialStatus(customerId)

  await db.trial.update({
    where: { customerId },
    data: { status: 'cancelled' },
  })
  return getTrialStatus(customerId)
}

/**
 * Format helpers for UI display.
 */
export function trialBannerMessage(status: TrialStatus): {
  headline: string
  subline: string
  cta: string
  tone: 'live' | 'urgent' | 'expired' | 'converted' | 'none'
} {
  if (status.isConverted) {
    return {
      headline: 'আপনি সাবস্ক্রাইব করেছেন',
      subline: 'প্রতি মাসে আনলিমিটেড ভিডিও',
      cta: '',
      tone: 'converted',
    }
  }
  if (status.isExpired) {
    return {
      headline: 'আপনার ফ্রি ট্রায়াল শেষ',
      subline: 'আজই সাবস্ক্রাইব করুন — মাসে মাত্র ৳১,০০০',
      cta: 'এখনই ৫০% ছাড়ে নিন',
      tone: 'expired',
    }
  }
  if (status.isActive && status.daysLeft > 1) {
    return {
      headline: `আপনার ট্রায়াল — দিন ${TRIAL_DURATION_DAYS - status.daysLeft + 1} / ${TRIAL_DURATION_DAYS}`,
      subline: `${status.daysLeft} দিন বাকি। EARLY50 দিয়ে ৫০% ছাড় পেতে পারেন।`,
      cta: 'এখনই সাবস্ক্রাইব করুন',
      tone: 'live',
    }
  }
  return {
    headline: `আপনার ট্রায়াল আজ শেষ হচ্ছে`,
    subline: `${status.hoursLeft} ঘণ্টা বাকি — এর পর অটো ফ্রি টায়ারে চলে যাবেন।`,
    cta: 'আগেই সাবস্ক্রাইব করুন — ৫০% ছাড়',
    tone: 'urgent',
  }
}
