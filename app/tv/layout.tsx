import type { Metadata } from 'next'

// The TV page gets its own tab icon so a viewer with several hostamar tabs open
// can tell the live channel apart. Without a layout here, /tv inherited the
// generic brand favicon from the root layout.
export const metadata: Metadata = {
  title: 'Hostamar TV — লাইভ টিভি | Live TV',
  description:
    'Hostamar TV — 24/7 live Bangla channel. Watch live or add the HLS playlist to VLC / Smart TV.',
  icons: {
    icon: [{ url: '/icons/icon-tv.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
}

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children
}
