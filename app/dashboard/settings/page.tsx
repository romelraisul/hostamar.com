// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import SettingsPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Account Settings | Hostamar Dashboard',
  description:
    'Update your Hostamar profile, business information, password, and notification preferences. Manage your account settings in one place.',
  alternates: { canonical: 'https://hostamar.com/dashboard/settings' },
  openGraph: {
    title: 'Account Settings | Hostamar Dashboard',
    description: 'Manage your Hostamar account settings: profile, business info, password, and notifications.',
    url: 'https://hostamar.com/dashboard/settings',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Account Settings | Hostamar Dashboard',
    description: 'Manage your Hostamar account settings: profile, business info, password, and notifications.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  robots: { index: false, follow: false },
  keywords: ['hostamar settings', 'account settings', 'profile management', 'notification preferences', 'hostamar'],
}

export default function SettingsPage() {
  return <SettingsPageClient />
}
