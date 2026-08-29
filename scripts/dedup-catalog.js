#!/usr/bin/env node
/**
 * Dedup the 110-raw Fiverr job list against the existing 50-service catalog.
 * Two-layer dedup:
 *   L1: exact normalized-slug match
 *   L2: semantic overlap map (Fiverr job concept already covered by an
 *       existing service with a different name — e.g. "Thumbnail Design" ≈
 *       "YouTube Thumbnail Studio"). L2 keeps ONE card: the EXISTING service
 *       (its creditCost/benefit/promptTemplate stay authoritative).
 *
 * Outputs:
 *   lib/services/fiverr/catalog-110-deduped.json  (only NEW unique jobs)
 *   docs/product-list-deduped-120.md              (transparent dedup report)
 */
const fs = require('fs')
const path = require('path')

const RAW = require('../scripts/fiverr-110-raw.json')

// L2 semantic overlap: fiverr slug → existing catalog slug that already
// covers the job. Anything listed here is SKIPPED (existing card wins).
const SEMANTIC_OVERLAP = {
  'logo-design': 'brand-identity-starter',
  'thumbnail-design': 'youtube-thumbnail-studio',
  'business-card': 'ai-business-card-designer',
  'flyer': 'event-social-kit',
  'social-post': 'social-caption-bank',
  'infographic': 'certificate-generator',
  'menu-design': 'menu-card-creator',
  'resume-design': 'resume-revamp-ai',
  'blog-writing': 'blog-post-expander',
  'seo-blog': 'blog-post-expander',
  'product-desc': 'product-description-writer',
  'website-copy': 'portfolio-website-copy',
  'resume-cover': 'cover-letter-studio',
  'linkedin-bio': 'linkedin-banner-bio',
  'youtube-script': 'youtube-script-writer',
  'podcast-notes': 'podcast-show-notes-maker',
  'ebook': 'blog-post-expander',
  'lead-magnet': 'newsletter-engine',
  'hashtag': 'hashtag-trend-research',
  'social-calendar': 'content-calendar-planner',
  'instagram-captions': 'social-caption-bank',
  'marketing-proposal': 'business-proposal-builder',
  'short-video-ad': 'ecom-ad-creative-pack',
  'text-to-video': 'tiktok-shop-video-kit',
  'reels-edit': 'viral-reel-hooks-generator',
  'sop': 'sop-document-creator',
  'landing-html': 'portfolio-website-copy',
  'portfolio-site': 'portfolio-website-copy',
  'shopify-page': 'shopify-banner-set',
  'app-desc': 'amazon-listing-optimizer',
  'meeting-notes': 'ngo-annual-report',
}

const norm = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// existing 50 catalog slugs (source: live /api/services/catalog 2026-08-30)
const EXISTING = require('./existing-50-slugs.json').map(norm)
const existingSet = new Set(EXISTING)

const skippedExact = []
const skippedSemantic = []
const unique = []

for (const item of RAW) {
  const slug = norm(item.id || item.name)
  if (existingSet.has(slug)) { skippedExact.push({ slug, reason: 'exact-slug-exists' }); continue }
  if (SEMANTIC_OVERLAP[slug]) { skippedSemantic.push({ slug, coveredBy: SEMANTIC_OVERLAP[slug] }); continue }
  unique.push({ ...item, id: slug })
}

// guard: no dupes inside the unique list itself
const seen = new Set()
const deduped = unique.filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true })

fs.writeFileSync(path.join(__dirname, '..', 'lib', 'services', 'fiverr', 'catalog-110-deduped.json'), JSON.stringify(deduped, null, 2))

const report = [
  '# Product List — Deduped ~110 Unique (2026-08-30)',
  '',
  `Raw Fiverr jobs: **${RAW.length}** · Existing catalog: **${EXISTING.length}**`,
  `Duplicates skipped (semantic, existing card wins): **${skippedSemantic.length}**`,
  `Duplicates skipped (exact slug): **${skippedExact.length}**`,
  `New unique jobs added: **${deduped.length}**`,
  `**FINAL TOTAL: ${EXISTING.length + deduped.length} unique services — NOT 160+**`,
  '',
  '## Skipped as semantic duplicates (existing service already covers the job)',
  ...skippedSemantic.map(s => `- ~~${s.slug}~~ → covered by existing \`${s.coveredBy}\``),
  '',
  '## New unique jobs added',
  ...deduped.map(s => `- ${s.id} (${s.category}, ${s.creditCost}cr, ${s.fiverrPrice}, model: ${s.model})`),
  '',
  'Rule: when a Fiverr concept matched an existing service, the EXISTING card was kept with its own creditCost / benefit / perfectFor / promptTemplate — the new entry was skipped. Customers see one card per concept.',
].join('\n')

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'product-list-deduped-120.md'), report)

console.log(`raw=${RAW.length} exactDupes=${skippedExact.length} semanticDupes=${skippedSemantic.length} newUnique=${deduped.length} finalTotal=${EXISTING.length + deduped.length}`)
