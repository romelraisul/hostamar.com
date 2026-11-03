import type { Metadata } from 'next'

// The TV page gets its own tab icon so a viewer with several hostamar tabs open
// can tell the live channel apart. Without a layout here, /tv inherited the
// generic brand favicon from the root layout.
export const metadata: Metadata = {
  title: 'Hostamar TV — Live Nonstop 374 Videos • AI Video + Hosting + Agent Cloud',
  description: '24/7 live AI video channel: Sovereign Video OS, Agent Cloud, BDIX Hosting, EU-BD GPU spot market. 374 edge-served videos, PC-off safe via Vercel+Cloudflare.',
  openGraph: {
    title: 'Hostamar TV — Live Nonstop 374 Videos',
    description: '24/7 AI video channel: 374 edge-served videos, PC-off safe.',
    url: 'https://hostamar.com/tv',
    siteName: 'Hostamar',
    locale: 'bn_BD',
    type: 'video.other',
    images: [{ url: 'https://hostamar.com/tv-poster.jpg', width: 1200, height: 630, alt: 'Hostamar TV Live' }],
  },
  twitter: { card: 'summary_large_image', title: 'Hostamar TV — Live Nonstop 374', description: '24/7 AI video channel: 374 edge-served videos, PC-off safe.' },
  icons: {
    icon: [{ url: '/icons/icon-tv.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
}

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children
}