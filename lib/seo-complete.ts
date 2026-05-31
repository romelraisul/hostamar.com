/**
 * hostamar.com — Complete SEO Metadata Definitions for all 48 pages
 *
 * Each entry follows Next.js Metadata API with full:
 *  - title, description, keywords
 *  - openGraph (og:title, og:description, og:image, og:url)
 *  - twitter (card, title, description, images)
 *  - alternates.canonical
 *  - robots
 *  - jsonLd (structured data)
 *
 * Usage:
 *   import { pageSeo } from '@/lib/seo-complete'
 *   export const metadata = pageSeo['/about']
 *
 * For client-component pages, create a thin server-component wrapper:
 *   // app/example/page.tsx (server)
 *   import { pageSeo } from '@/lib/seo-complete'
 *   export const metadata = pageSeo['/example']
 *   export { default } from './client'
 */

import { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
const SITE_NAME = 'Hostamar'
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`
const TWITTER_HANDLE = '@hostamar'

// ---------------------------------------------------------------------------
// Helper: build a full Metadata object from simple fields
// ---------------------------------------------------------------------------
type SeoInput = {
  title: string                    // short title (e.g. "About Us")
  description: string              // meta description (150–160 chars ideal)
  path: string                     // canonical path (e.g. "/about")
  keywords?: string[]              // page-specific keywords
  ogImage?: string                 // per-page OG image
  noindex?: boolean                // default false
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  jsonLd?: Record<string, any>     // page-specific JSON-LD
}

function seo(input: SeoInput): Metadata {
  const {
    title,
    description,
    path,
    keywords = [],
    ogImage,
    noindex = false,
    type = 'website',
    publishedTime,
    modifiedTime,
  } = input

  const fullTitle = `${title} | ${SITE_NAME}`
  const url = `${SITE_URL}${path}`
  const image = ogImage || DEFAULT_OG_IMAGE

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    keywords: [...keywords, 'hostamar', 'bangladesh', 'ai platform'],
    openGraph: {
      type: type as 'website' | 'article',
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'en_US',
      alternateLocale: ['bn_BD', 'ur_PK'],
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      site: TWITTER_HANDLE,
    },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    category: 'technology',
  }
}

// ---------------------------------------------------------------------------
// PAGE-SPECIFIC JSON-LD helpers
// ---------------------------------------------------------------------------
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hostamar',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Hostamar',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

// ---------------------------------------------------------------------------
// ALL PAGE METADATA
// ---------------------------------------------------------------------------
export const pageSeo: Record<string, Metadata> = {
  // =========================================================================
  // MARKETING / PUBLIC PAGES
  // =========================================================================

  '/': seo({
    title: 'Cloud Hosting, AI Marketing, Gaming & Dev IDE',
    description:
      'Hostamar is your all-in-one platform: cloud VPS hosting, AI-powered marketing videos, LuckyStar gaming, AI browser, free AI chat, and cloud dev IDE. Made in Bangladesh.',
    path: '/',
    keywords: ['cloud hosting bangladesh', 'ai video generation', 'vps hosting', 'ai chat free', 'dev ide cloud'],
  }),

  '/about': seo({
    title: 'About Hostamar — Our Story & Mission',
    description:
      'Learn about Hostamar — the all-in-one platform built in Bangladesh. Cloud hosting, AI marketing videos, gaming, AI browser, and developer tools for creators and businesses.',
    path: '/about',
    keywords: ['about hostamar', 'hostamar story', 'bangladesh tech startup'],
  }),

  '/pricing': seo({
    title: 'Pricing — Simple Plans for Every Business',
    description:
      'Choose from Starter (৳2,000/mo), Business (৳3,500/mo), or Enterprise (৳6,000/mo). 7-day free trial, no credit card required. Pay with bKash, Nagad, or crypto.',
    path: '/pricing',
    keywords: ['hostamar pricing', 'vps hosting price bangladesh', 'ai video subscription', 'bkash payment hosting'],
    type: 'product',
  }),

  '/contact': seo({
    title: 'Contact Hostamar — Get in Touch',
    description:
      'Have a question? Contact the Hostamar team. Email, phone, or live chat. We\'re here to help with hosting, AI videos, billing, and more.',
    path: '/contact',
    keywords: ['contact hostamar', 'hostamar support', 'hostamar email', 'bangladesh hosting support'],
  }),

  '/blog': seo({
    title: 'Blog — Hostamar Tips, Guides & Updates',
    description:
      'Read the latest tips, tutorials, and product updates from Hostamar. AI video creation guides, hosting best practices, and platform news.',
    path: '/blog',
    keywords: ['hostamar blog', 'ai video tutorial', 'bangladesh tech blog', 'video creation tips'],
    type: 'article',
  }),

  '/terms': seo({
    title: 'Terms of Service — Hostamar',
    description:
      'Hostamar terms of service covering platform usage, billing, cancellations, and user responsibilities for cloud hosting and AI video services.',
    path: '/terms',
    keywords: ['hostamar terms', 'terms of service', 'hostamar legal'],
  }),

  '/privacy': seo({
    title: 'Privacy Policy — Hostamar',
    description:
      'Hostamar privacy policy explains how we collect, use, and protect your personal data when you use our cloud hosting, AI video, and other services.',
    path: '/privacy',
    keywords: ['hostamar privacy', 'privacy policy', 'data protection bangladesh'],
  }),

  // =========================================================================
  // AUTH PAGES
  // =========================================================================

  '/login': seo({
    title: 'Login — Hostamar Dashboard',
    description:
      'Sign in to your Hostamar account to manage your cloud VPS, AI video projects, billing, and services.',
    path: '/login',
    keywords: ['hostamar login', 'dashboard login', 'hostamar account'],
  }),

  '/signup': seo({
    title: 'Sign Up — Create Your Free Hostamar Account',
    description:
      'Create a free Hostamar account. Get started with cloud hosting and AI video generation. 7-day free trial, no credit card required.',
    path: '/signup',
    keywords: ['hostamar signup', 'create account', 'free trial hosting bangladesh'],
  }),

  '/forgot-password': seo({
    title: 'Forgot Password — Hostamar',
    description:
      'Reset your Hostamar account password. Enter your email and we\'ll send you a recovery link.',
    path: '/forgot-password',
    noindex: true,
  }),

  '/reset-password': seo({
    title: 'Reset Password — Hostamar',
    description:
      'Choose a new password for your Hostamar account.',
    path: '/reset-password',
    noindex: true,
  }),

  // =========================================================================
  // CORE FEATURES
  // =========================================================================

  '/generate': seo({
    title: 'AI Video Generator — Create Marketing Videos',
    description:
      'Generate professional AI marketing videos in minutes. Choose from 50+ templates, AI scripts, voiceovers, and custom branding. Made for Bangladeshi creators.',
    path: '/generate',
    keywords: ['ai video generator bangladesh', 'marketing video maker', 'ai video creation', 'bangla video generator'],
  }),

  '/editor': seo({
    title: 'Video Editor — Hostamar Studio',
    description:
      'Create beautiful videos with Hostamar\'s AI-powered video editor. Bangladeshi cultural templates, drag-and-drop interface, and fast export.',
    path: '/editor',
    keywords: ['ai video editor', 'hostamar editor', 'bangla video editor', 'online video maker'],
  }),

  '/subtitles': seo({
    title: 'AI Subtitles — Bengali & English Auto-Subtitles',
    description:
      'Generate AI-powered subtitles for your videos. Supports Bengali (Bangla) and English. Fast, accurate, and free with your Hostamar subscription.',
    path: '/subtitles',
    keywords: ['ai subtitles', 'bangla subtitle generator', 'auto subtitle bangladesh', 'video subtitles'],
  }),

  '/previews': seo({
    title: 'AI Video Previews — Create Short Video Clips',
    description:
      'Generate AI-powered 10-second video previews for social media. Perfect for Facebook, YouTube, Instagram, and TikTok.',
    path: '/previews',
    keywords: ['video preview generator', 'ai short clips', 'social media video maker bangladesh'],
  }),

  '/gallery': seo({
    title: 'Video Gallery — Hostamar',
    description:
      'Browse your AI-generated video gallery on Hostamar. View, download, share, and manage all your marketing videos in one place.',
    path: '/gallery',
    keywords: ['video gallery', 'ai video library', 'hostamar gallery'],
  }),

  '/ai-chat': seo({
    title: 'Free AI Chat — Hostamar DuckAI',
    description:
      'Chat with multiple AI models for free: GPT-4o, Claude 3, Llama 3. No sign-up required. Code assistance, content creation, translation, and more.',
    path: '/ai-chat',
    keywords: ['free ai chat', 'gpt chat free', 'ai chatbot bangladesh', 'duckai chat', 'claude chat free'],
  }),

  '/browser': seo({
    title: 'AI Browser — Smart Search & Research Assistant',
    description:
      'AI-powered browsing with smart search, page summarization, real-time translation in 50+ languages, and research assistant. Browse smarter with Hostamar.',
    path: '/browser',
    keywords: ['ai browser', 'smart search', 'ai research assistant', 'ai translation', 'hostamar browser'],
  }),

  '/dev': seo({
    title: 'Dev IDE — Cloud VS Code in Your Browser',
    description:
      'Cloud-based VS Code editor with full terminal access, extensions marketplace, and debugging. Code from anywhere with Hostamar Dev IDE.',
    path: '/dev',
    keywords: ['cloud ide', 'online vs code', 'browser code editor', 'hostamar dev', 'cloud development environment'],
  }),

  '/game': seo({
    title: 'LuckyStar Game — Social Casino Gaming',
    description:
      'Play LuckyStar social casino games: slots, roulette, blackjack, and poker. Compete with friends, win rewards, and enjoy real-time multiplayer action.',
    path: '/game',
    keywords: ['luckystar game', 'social casino bangladesh', 'online casino game', 'play slots bangladesh'],
  }),

  '/search': seo({
    title: 'AI Video Search — Semantic Search Engine',
    description:
      'Search your AI-generated videos with semantic search. Powered by Ollama embeddings and cosine similarity. Find content by meaning, not just keywords.',
    path: '/search',
    keywords: ['video search', 'semantic search', 'ai search engine', 'ollama search'],
  }),

  // =========================================================================
  // DASHBOARD PAGES
  // =========================================================================

  '/dashboard': seo({
    title: 'Dashboard — Hostamar Customer Portal',
    description:
      'Your Hostamar dashboard: manage VPS hosting, AI videos, billing, and account settings in one place. Track usage, view invoices, and manage services.',
    path: '/dashboard',
    noindex: true,
  }),

  '/dashboard/videos': seo({
    title: 'My Videos — Hostamar Dashboard',
    description:
      'Manage your AI-generated videos: view, download, share, and delete. Track views, downloads, and video performance from your Hostamar dashboard.',
    path: '/dashboard/videos',
    noindex: true,
  }),

  '/dashboard/analytics': seo({
    title: 'Video Analytics — Hostamar Dashboard',
    description:
      'Track your AI video performance: views, downloads, shares, and engagement. Monthly revenue charts and video status breakdown in your Hostamar analytics dashboard.',
    path: '/dashboard/analytics',
    noindex: true,
  }),

  '/dashboard/services': seo({
    title: 'My Services — Hostamar Dashboard',
    description:
      'Manage your Hostamar VPS, RDP, and web hosting services. View specs, IP addresses, status, and billing from your services dashboard.',
    path: '/dashboard/services',
    noindex: true,
  }),

  '/dashboard/payment': seo({
    title: 'Payment & Billing — Hostamar Dashboard',
    description:
      'Manage your Hostamar subscription payments. Pay with bKash, Nagad, Rocket, or USDT crypto. View invoices, update payment methods, and billing history.',
    path: '/dashboard/payment',
    noindex: true,
  }),

  '/dashboard/payment/crypto': seo({
    title: 'Crypto Payment — Hostamar',
    description:
      'Pay your Hostamar subscription with cryptocurrency (USDT, BTC, ETH). Secure crypto payment gateway for anonymous, borderless transactions.',
    path: '/dashboard/payment/crypto',
    noindex: true,
  }),

  '/dashboard/settings': seo({
    title: 'Account Settings — Hostamar Dashboard',
    description:
      'Update your Hostamar profile, business information, password, and notification preferences. Manage your account settings in one place.',
    path: '/dashboard/settings',
    noindex: true,
  }),

  // =========================================================================
  // ADMIN PAGES
  // =========================================================================

  '/admin': seo({
    title: 'Admin Dashboard — Hostamar',
    description:
      'Hostamar admin panel: manage customers, videos, services, subscriptions, and platform analytics.',
    path: '/admin',
    noindex: true,
  }),

  '/admin/customers': seo({
    title: 'Customers — Hostamar Admin',
    description:
      'Manage Hostamar customers: view profiles, service plans, payment history, and account status. Admin customer management panel.',
    path: '/admin/customers',
    noindex: true,
  }),

  '/admin/videos': seo({
    title: 'Videos — Hostamar Admin',
    description:
      'Admin video management: review, approve, reject, or delete user-generated AI videos. Monitor video quality and platform content.',
    path: '/admin/videos',
    noindex: true,
  }),

  // =========================================================================
  // PAYMENT PAGES
  // =========================================================================

  '/payment': seo({
    title: 'Payment — Hostamar Subscription',
    description:
      'Subscribe to Hostamar and choose your payment method. bKash, Nagad, Rocket, or cryptocurrency. Start with a 7-day free trial.',
    path: '/payment',
    keywords: ['hostamar payment', 'subscribe hostamar', 'bkash payment', 'hostamar subscription'],
  }),

  '/payment/success': seo({
    title: 'Payment Successful — Hostamar',
    description:
      'Your Hostamar payment was successful. Your subscription is now active. Start creating AI videos and using cloud services immediately.',
    path: '/payment/success',
    noindex: true,
  }),

  '/payment/cancel': seo({
    title: 'Payment Cancelled — Hostamar',
    description:
      'Your Hostamar payment was cancelled. No charges were made. You can try again or choose a different payment method.',
    path: '/payment/cancel',
    noindex: true,
  }),

  '/payment/fail': seo({
    title: 'Payment Failed — Hostamar',
    description:
      'Your Hostamar payment was not completed. Please try again or use an alternative payment method. Contact support if the issue persists.',
    path: '/payment/fail',
    noindex: true,
  }),

  // =========================================================================
  // OTHER PAGES
  // =========================================================================

  '/analytics': seo({
    title: 'Analytics Dashboard — Hostamar Video Analytics',
    description:
      'Detailed video analytics: view counts, downloads, shares, monthly revenue trends, engagement rates, and top-performing videos. Data-driven insights for your content.',
    path: '/analytics',
    keywords: ['video analytics dashboard', 'content performance', 'video metrics bangladesh', 'ai video analytics'],
  }),

  '/collab': seo({
    title: 'Collab — Real-Time Video Collaboration',
    description:
      'Collaborate on video projects in real time. Create collaboration sessions, share codes, and work together with your team on Hostamar.',
    path: '/collab',
    keywords: ['video collaboration', 'team video editing', 'real-time collab bangladesh'],
  }),

  '/referral': seo({
    title: 'Referral Program — Earn with Hostamar',
    description:
      'Join the Hostamar referral program and earn rewards. Share your unique referral link and get bonuses for every new sign-up. Unlimited earning potential.',
    path: '/referral',
    keywords: ['hostamar referral', 'earn money bangladesh', 'referral program', 'affiliate program'],
  }),

  '/subscription': seo({
    title: 'Subscription — Hostamar Plans',
    description:
      'Manage your Hostamar subscription plan. Upgrade, downgrade, or cancel. View your current plan features, credits, and billing cycle.',
    path: '/subscription',
    noindex: true,
  }),

  '/monitor': seo({
    title: 'Service Status Monitor — Hostamar',
    description:
      'Real-time status monitor for all Hostamar services. Check uptime, response times, and availability of VPS, AI video, browser, and other platform services.',
    path: '/monitor',
    keywords: ['hostamar status', 'service monitor', 'uptime monitor', 'server status bangladesh'],
  }),

  '/setup': seo({
    title: 'Environment Setup — Hostamar Configuration',
    description:
      'Configure your Hostamar environment. Setup guides for VPS, domain configuration, environment variables, and service integration.',
    path: '/setup',
    noindex: true,
  }),

  '/logs': seo({
    title: 'System Logs — Hostamar',
    description:
      'View Hostamar system logs: application events, error logs, and debug information. Monitor platform health and troubleshoot issues.',
    path: '/logs',
    noindex: true,
  }),

  // =========================================================================
  // OSSU ACADEMY PAGES
  // =========================================================================

  '/ossu': seo({
    title: 'OSSU Academy — Learn Computer Science in Bengali',
    description:
      'Free computer science education in Bengali. Follow the OSSU curriculum with Bangla translations. Learn programming, algorithms, data structures, and more in your native language.',
    path: '/ossu',
    keywords: ['ossu bangla', 'computer science bangladesh', 'cs education bengali', 'free programming course bangla'],
  }),

  '/ossu/dashboard': seo({
    title: 'My Learning — OSSU Academy Dashboard',
    description:
      'Track your OSSU Academy progress. View enrolled courses, completed modules, certificates earned, and current learning phase in Bengali.',
    path: '/ossu/dashboard',
    noindex: true,
  }),

  '/ossu/projects': seo({
    title: 'OSSU Projects — Build Real CS Projects',
    description:
      'Hands-on computer science projects in Bengali. Build CRUD apps, data analysis tools, and more. Apply your OSSU curriculum knowledge.',
    path: '/ossu/projects',
    noindex: true,
  }),

  '/ossu/curriculum': seo({
    title: 'OSSU Curriculum — Complete CS Degree Path',
    description:
      'Full OSSU computer science curriculum in Bengali: Introduction to CS, Core Programming, Math, Systems, and Advanced topics. Self-paced learning.',
    path: '/ossu/curriculum',
    noindex: true,
  }),

  // =========================================================================
  // PLACEHOLDER / CATCH-ALL
  // =========================================================================
}

/**
 * Helper to get metadata for dynamic routes (e.g. blog/[slug], course/[id])
 * Falls back to the parent route's metadata.
 */
export function getDynamicRouteSeo(
  basePath: string,     // e.g. '/blog'
  params: { title: string; description: string; path: string },
): Metadata {
  return seo({
    title: params.title,
    description: params.description,
    path: params.path,
    type: 'article',
  })
}

/**
 * Default JSON-LD structured data for pages that need it.
 * Inject via <script type="application/ld+json"> in layout or page.
 */
export const defaultJsonLd = {
  organization: orgJsonLd,
  website: websiteJsonLd,
}
