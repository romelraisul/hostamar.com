export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { PRODUCTS } from '@/lib/products'

/**
 * 2026 feature flags per product (market-leader parity).
 * true = shipped, 'beta' = partial, false = roadmap.
 */
const FEATURE_FLAGS: Record<string, Record<string, boolean | 'beta'>> = {
  'ai-video': {
    credits: true,
    apiKeys: true,
    webhooks: true,
    affiliate: true,
    templates: 'beta',
    stockIntegration: false,
    voiceClone: false,
    autoCaptions: 'beta',
    bulkGeneration: false,
  },
  'cloud-hosting': {
    credits: true,
    apiKeys: true,
    webhooks: true,
    affiliate: true,
    freeSsl: true,
    waf: 'beta',
    malwareScan: false,
    fileManager: false,
    uptimeBadge: true,
    nvme: true,
  },
  'ai-chat': {
    credits: true,
    apiKeys: true,
    webhooks: true,
    affiliate: true,
    modelSelector128: true,
    historySearch: 'beta',
    exportChat: false,
    shareLink: false,
    promptMarketplace: false,
  },
  'ai-browser': {
    credits: true,
    apiKeys: true,
    webhooks: true,
    affiliate: true,
    aiAgentTasks: 'beta',
    sessionHistory: 'beta',
    proxySelector: false,
  },
  game: {
    credits: true,
    apiKeys: true,
    webhooks: true,
    affiliate: true,
    dailyRewards: 'beta',
    leaderboard: 'beta',
  },
  'dev-ide': {
    credits: true,
    apiKeys: true,
    webhooks: true,
    affiliate: true,
    dockerProvisioning: false,
    terminalWebsocket: false,
  },
}

/**
 * GET /api/products
 * Returns the canonical 6-product catalog (lib/products.ts — single source of
 * truth used by the overview page, navbar, and /products/[slug] detail pages),
 * plus 2026 feature flags. Local route: no proxy to api.hostamar.com.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      count: PRODUCTS.length,
      products: PRODUCTS.map((p) => ({
        slug: p.slug,
        order: p.order,
        emoji: p.emoji,
        nameBn: p.nameBn,
        nameEn: p.nameEn,
        taglineBn: p.taglineBn,
        taglineEn: p.taglineEn,
        description: p.description,
        features: p.features,
        badge: p.badge,
        status: p.status,
        ctaLabel: p.ctaLabel,
        ctaHref: p.ctaHref,
        demoUrl: p.demoUrl,
        featureFlags: FEATURE_FLAGS[p.slug] || {},
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
  )
}
