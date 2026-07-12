import './globals.css'
import localFont from 'next/font/local'
import { Providers } from './providers'
import { Metadata, Viewport } from 'next'
import { defaultSeo } from '@/lib/seo'
import ThemeToggle from '@/components/ThemeToggle'
import SupportWidget from '@/components/SupportWidget'
import ChromeGuard from '@/components/layout/ChromeGuard'
import { LocaleProvider } from '@/lib/locale-context'
import { cookies } from 'next/headers'
import type { Locale } from '@/lib/i18n'

// The root layout reads `cookies()` (request data), so the entire app is
// dynamic. Force it explicitly to prevent Next from attempting static
// prerender of nested client pages (which crashes on context providers
// during prerender with "Cannot read properties of null (reading
// 'useContext')"). This is a rendering-strategy setting, not a logic change.
export const dynamic = 'force-dynamic'

// Self-hosted Bengali font (no build-time Google Fonts fetch — Vercel's
// prerender subprocess can't reach fonts.googleapis.com, which previously
// triggered a Pages-Router fallback error page that crashed on <Html>).
const bengali = localFont({
  src: './fonts/NotoSansBengali-Regular.woff2',
  variable: '--font-bengali',
  weight: '400',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';

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
    title: 'AI দিয়ে মার্কেটিং ভিডিও 30 সেকেন্ডে',
    description: 'হোস্টিং সহ, bKash পেমেন্ট',
    images: ['/og-image-bn.jpg'],
    locale: 'bn_BD',
  },
  alternates: {
    canonical: 'https://hostamar.com',
    languages: { 'bn-BD': '/bn', 'en-US': '/en' },
  },
  other: {
    'color-scheme': 'light dark',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
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
      description: '3 AI videos/mo, 1GB hosting',
    },
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '2000',
      priceCurrency: 'BDT',
      priceValidUntil: '2026-12-31',
      description: '100 AI videos, 10GB NVMe, .com free',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '3500',
      priceCurrency: 'BDT',
      description: 'Unlimited AI videos, 20GB NVMe, API',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '500',
  },
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
  // Read locale from cookie. During Vercel's build-time static prerender of the
  // special /404 and /500 routes, `cookies()` throws "Dynamic server usage",
  // which cascades into Next's internal /_error page (imports `Html` from
  // next/document) and crashes the build with "<Html> should not be imported
  // outside of pages/_document". Guard it so the prerender completes with the
  // default locale instead of throwing.
  let locale: Locale = 'en'
  try {
    const cookieStore = await cookies()
    locale = (cookieStore.get('locale')?.value || 'en') as Locale
  } catch {
    locale = 'en'
  }
    const isBengali = locale === 'bn'
    const htmlFontClass = isBengali ? bengali.variable : ''

    return (
      <html lang={locale} dir="ltr" className={htmlFontClass}>
      <head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no, address=no, email=no" />
        <link rel="canonical" href={SITE_URL} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#3b82f6" />
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
      <body>
        <Providers>
          <LocaleProvider locale={locale}>
          <ChromeGuard>{children}</ChromeGuard>
          <ThemeToggle />
          <SupportWidget />
          </LocaleProvider>
        </Providers>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                  e.preventDefault();
                  var btn = document.querySelector('[aria-label="Toggle dark mode"]');
                  if (btn) btn.click();
                }
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
      </body>
    </html>
  )
}
