import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import MarketingClient from './marketing-client'

export const dynamic = 'force-dynamic'

/**
 * /dashboard/marketing — ডিজিটাল মার্কেটিং (আলাদা মডিউল) — V29.
 *
 * Per-owner decision: customer videos NEVER auto-publish to FB/YT/IG/TikTok.
 * This module is where publishing lives — explicitly manual, per video, per
 * click, with the customer's OWN connected accounts.
 */
export default async function MarketingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  return <MarketingClient />
}
