import './globals.css'
import { Inter, Noto_Sans_Bengali } from 'next/font/google'
import { Providers } from './providers'
import { Metadata } from 'next'
import { defaultSeo } from '@/lib/seo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import { cookies } from 'next/headers'
import type { Locale } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'] })
const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'

export const metadata: Metadata = {
  ...defaultSeo,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hostamar',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'Your all-in-one platform: Cloud hosting, AI marketing videos, LuckyStar gaming, AI-powered browser, free AI chat, and cloud development environment',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
  },
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Cloud Hosting',
        description: 'VPS, RDP, Web Hosting, Storage with 99.9% uptime guarantee',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'AI Marketing Videos',
        description: 'Auto-generate professional marketing videos for your business',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'LuckyStar Gaming',
        description: 'Social casino gaming with friends',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'AI Browser',
        description: 'AI-powered browsing with automation, translation and research',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'DuckAI Chat',
        description: 'Free AI chat powered by DuckDuckGo AI',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Dev IDE',
        description: 'Cloud-based VS Code editor',
      },
    },
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value || 'en') as Locale
  const isBengali = locale === 'bn'

  return (
    <html lang={locale} dir="ltr" className={isBengali ? notoBengali.variable : ''}>
      <head>
        <link rel="canonical" href={SITE_URL} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hostamar" />
        <meta property="og:site_name" content="Hostamar" />
        <meta property="og:locale" content={isBengali ? 'bn_BD' : 'en_US'} />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <ThemeToggle />
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