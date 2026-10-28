import './globals.css'
import './bazaar.css'
import { Providers } from './providers'
import { Metadata, Viewport } from 'next'
import { defaultSeo } from '@/lib/seo'
import LazySupport from '@/components/lazy-support'
import ChromeGuard from '@/components/layout/ChromeGuard'
import { LocaleProvider } from '@/lib/locale-context'
import type { Locale } from '@/lib/i18n'

// Fonts are self-hosted glyph subsets loaded via @font-face in globals.css
// (perf 2026-10-20: the next/font/google load shipped 6 preloaded woff2 =
// 126KB at high priority before CSS; subsets are 87KB across 3 files with
// only the 400 preloaded below — font chain 126KB→33KB at head-of-line).
// Regenerate subsets: /usr/bin/python3 scripts/fonts/make-subsets.py.
// The --font-hind/--font-archivo vars now live in globals.css :root.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith('http')) ? process.env.NEXT_PUBLIC_SITE_URL : 'https://hostamar.com';

export const metadata: Metadata = {
  ...defaultSeo,
  metadataBase: new URL(SITE_URL),
  title: 'Hostamar - বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার',
  description:
    'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার। ৩০ সেকেন্ডে ভিডিও, ৫০+ বাংলা টেমপ্লেট, bKash দিয়ে পেমেন্ট — শুরু ৳0 থেকে।',
  keywords: [
    'AI marketing video Bangladesh',
    'বাংলা ভিডিও মেকার',
    'ঈদ অফার ভিডিও',
    'hosting Bangladesh bKash',
  ],
  openGraph: {
    title: 'Hostamar — AI Video Maker for Bangladeshi Business',
    description: 'AI ভিডিও জেনারেটর — ৫০+ টেমপ্লেট, বাংলা ভয়েসওভার, bKash পেমেন্ট',
    url: SITE_URL,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Hostamar — AI Video Maker for Bangladeshi Business' }],
    locale: 'bn_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: '/twitter-image.png', width: 1200, height: 630, alt: 'Hostamar' }],
  },
  alternates: {
    canonical: 'https://hostamar.com',
  },
  other: {
    'color-scheme': 'light',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0E7C3A' },
    { media: '(prefers-color-scheme: dark)', color: '#0A5E2C' },
  ],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Hostamar',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar AI Marketing Video Maker',
  description: 'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার — ৩০ সেকেন্ডে ভিডিও, ৫০+ বাংলা টেমপ্লেট, bKash পেমেন্ট।',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'BDT',
      description: '5 AI videos/mo, 1GB hosting',
    },
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '990',
      priceCurrency: 'BDT',
      priceValidUntil: '2026-12-31',
      description: '100 AI videos, 10GB NVMe, .com free',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '1900',
      priceCurrency: 'BDT',
      description: 'Unlimited AI videos, 20GB NVMe, API',
    },
    {
      '@type': 'Offer',
      name: 'Business',
      price: '2900',
      priceCurrency: 'BDT',
      description: '300 AI videos, team of 5, priority support',
    },
  ],
  // AggregateRating removed 2026-09-14: no verifiable review source yet
  // (fabricated 4.8/500 was flagged by the production audit).
  // Offers synced with lib/pricing.ts PAYMENT_PLANS (990/1900/2900) 2026-10-08;
  // 5000cr Bangla LLM Training is a one-time product, not a subscription offer.
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hostamar',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: ['https://facebook.com/romelraisul'],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BD',
    addressLocality: 'Bogura',
  },
  paymentAccepted: 'bKash, Nagad, Rocket, Cash',
  currenciesAccepted: 'BDT',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Locale cookie is never set anywhere (grep across repo 2026-10-18) — it
  // always evaluated to 'bn'. Hardcode it so the layout stops reading request
  // data and pages can render static/ISR again (s-maxage cache headers).
  const locale: Locale = 'bn'
    const isBengali = locale === 'bn'
    const htmlFontClass = isBengali ? 'bangla' : ''

    return (
      <html lang={locale} dir="ltr" className={htmlFontClass}>
      <head>
        <meta charSet="utf-8" />
        {/* NO font preload links here. Chrome pins <link rel=preload> fonts at
            High, while CSS-discovered fonts jump to VeryHigh — preloading the
            400 actually delayed it behind the 700/Archivo (sim lcpLoadStart
            1190ms, mobile 89). Both weights are CSS-discovered now. The 700
            media-gated link below only exists for desktop CLS (h1 700 swap);
            Chrome ignores media on preloads and fetches it on mobile too, but
            removing it reintroduces desktop CLS 0.052. */}
        {/* Desktop-only high-priority preloads (media-gated so mobile requests are
            byte-identical to the 89-score build): the hero avif is the desktop LCP
            element — react-dom's img auto-preload emitted it WITHOUT fetchpriority,
            so it rode Low and split Lantern bandwidth with the fonts (sim LCP 1.5s,
            perf 94). The 700 font is CSS-discovered after FCP on desktop → h1
            fallback-then-swap = CLS 0.052. On mobile the h1 LCP gate is the 400
            font — extra unconditional preloads starved it (measured 86). */}
        {/* The hero img's fetchPriority prop makes react-dom emit its image
            preload WITH fetchpriority=high — no manual link needed (one would
            just be deduped against react-dom's). High matters because the Low
            auto-preload queued the LCP img behind ~209KB of scripts in the
            Lantern model: mobile sim LCP 3.6s (score 89), desktop 1.4s. */}
        <link rel="preload" href="/fonts/hind-siliguri-700-subset.woff2" as="font" type="font/woff2" crossOrigin="anonymous" media="(min-width: 768px)" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no, address=no, email=no" />
        <link rel="canonical" href={SITE_URL} />
        {/* seo-tracker: anonymous pageview+click beacons -> /api/seo/track (SeoEvent) */}
        <script defer src="/seo-tracker.js" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://images.pluto.tv" />
        <meta name="theme-color" content="#0E7C3A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hostamar" />
        <meta property="og:site_name" content="Hostamar" />
        <meta property="og:locale" content={isBengali ? 'bn_BD' : 'en_US'} />
        <meta property="og:type" content="website" />
        {/* Preconnect to critical origins for performance */}
        <link rel="dns-prefetch" href={SITE_URL} />
        <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
                />
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
                />
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
                />
      </head>
      <body className="bp-theme">
        <Providers>
          <LocaleProvider locale={locale}>
          <ChromeGuard>{children}</ChromeGuard>
          <LazySupport />
          </LocaleProvider>
        </Providers>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                  e.preventDefault();
                  navigator.clipboard.writeText(window.location.href).then(function() {
                    var n = document.createElement('div');
                    n.textContent = 'Link copied!';
                    n.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;z-index:99999;font-family:sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
                    document.body.appendChild(n);
                    setTimeout(function(){ n.remove(); }, 2000);
                  });
                }
              });
            `,
          }}
        />
        {/* Meta Pixel for 990 conversion — activate with a real Pixel ID when ads start */}
        <div hidden dangerouslySetInnerHTML={{ __html: '<!-- Meta Pixel for 990 conversion -->' }} />
        {/* fb-customerchat: Messenger chat placeholder. Renders when NEXT_PUBLIC_FB_PAGE_ID
            is set at build time; add the Messenger SDK script in the same commit to activate. */}
        {process.env.NEXT_PUBLIC_FB_PAGE_ID ? (
          // page_id/attribution are read by the Messenger SDK, not React — spread keeps TS happy while emitting them literally
          <div className="fb-customerchat" {...({ attribution: 'page_inbox', page_id: process.env.NEXT_PUBLIC_FB_PAGE_ID } as Record<string, string>)} />
        ) : (
          <div hidden dangerouslySetInnerHTML={{ __html: '<!-- fb-customerchat: set NEXT_PUBLIC_FB_PAGE_ID to enable Messenger chat -->' }} />
        )}
        {process.env.CF_WEB_ANALYTICS_TOKEN ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: process.env.CF_WEB_ANALYTICS_TOKEN })}
          />
        ) : null}
      </body>
    </html>
  )
}
