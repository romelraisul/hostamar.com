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

export const dynamic = 'force-dynamic'

const bengali = localFont({
  src: './fonts/NotoSansBengali-Regular.woff2',
  variable: '--font-bengali',
  weight: '400',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';

// LOCKED SEO — docs/seo.md + brand: Primary #2563EB
export const metadata: Metadata = {
  ...defaultSeo,
  metadataBase: new URL(SITE_URL),
  title: 'AI মার্কেটিং ভিডিও বাংলাদেশ | হোস্টিং সহ - Hostamar',
  description:
    '50+ বাংলা টেমপ্লেট দিয়ে 30 সেকেন্ডে মার্কেটিং ভিডিও বানান। ঈদ, বৈশাখ, 11.11 - সব। bKash পেমেন্ট, BDIX হোস্টিং। ৳0 থেকে শুরু।',
  keywords: [
    'AI marketing video Bangladesh',
    'বাংলা ভিডিও মেকার',
    'ঈদ অফার ভিডিও',
    'hosting Bangladesh bKash',
    'AI মার্কেটিং ভিডিও',
  ],
  openGraph: {
    title: 'AI মার্কেটিং ভিডিও বাংলাদেশ | হোস্টিং সহ - Hostamar',
    description: '50+ বাংলা টেমপ্লেট, 30 সেকেন্ডে ভিডিও, bKash পেমেন্ট, BDIX হোস্টিং। ৳0 থেকে শুরু।',
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'Hostamar — ৳0 তে শুরু — bKash' }],
    locale: 'bn_BD',
    type: 'website',
    siteName: 'Hostamar',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI মার্কেটিং ভিডিও বাংলাদেশ | হোস্টিং সহ - Hostamar',
    description: '50+ বাংলা টেমপ্লেট, 30 সেকেন্ডে ভিডিও, bKash/Nagad, BDIX হোস্টিং।',
    images: [`${SITE_URL}/opengraph-image`],
  },
  alternates: {
    canonical: 'https://hostamar.com',
    languages: { 'bn-BD': '/bn', 'en-US': '/en' },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'color-scheme': 'light dark',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563EB' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
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
  name: 'Hostamar AI Marketing + Hosting',
  description: 'AI দিয়ে মার্কেটিং ভিডিও + BDIX হোস্টিং বাংলাদেশ — 50+ বাংলা টেমপ্লেট, bKash/Nagad/Rocket।',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Starter', price: '2000', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Pro', price: '3500', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
  ],
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
        {/* GA4 events: hero_cta_click, pricing_click, bkash_click — fired via components */}
        {process.env.NEXT_PUBLIC_GA_ID ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        ) : null}
        <meta name="theme-color" content="#2563EB" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hostamar" />
        <meta property="og:site_name" content="Hostamar" />
        <meta property="og:locale" content={isBengali ? 'bn_BD' : 'en_US'} />
        <meta property="og:type" content="website" />
        <link rel="dns-prefetch" href={SITE_URL} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
            <body>
              <Providers>
                <LocaleProvider>
                  <ChromeGuard>{children}</ChromeGuard>
                  <ThemeToggle />
                  <SupportWidget />
                </LocaleProvider>
              </Providers>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              // GA4 helpers — components fire: gtag('event','hero_cta_click'|'pricing_click'|'bkash_click',{plan})
              document.addEventListener('click', function(e){
                var t=e.target.closest && e.target.closest('[data-ga]');
                if(!t) return;
                var ev=t.getAttribute('data-ga');
                if(window.gtag) window.gtag('event', ev, { page: location.pathname });
              });
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
                    n.style.cssText = 'position:fixed;top:20px;right:20px;background:#2563EB;color:white;padding:12px 24px;border-radius:8px;z-index:99999;font-family:sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2)';
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
