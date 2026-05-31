// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import DashboardPageClient from './page.client'

export const metadata: Metadata = {
  title: 'My Learning Dashboard — OSSU Academy | Hostamar',
  description:
    'Track your OSSU Academy progress. View enrolled courses, completed modules, certificates earned, and current learning phase in Bengali.',
  robots: { index: false, follow: false },
}

export default function DashboardPage() {
  return <DashboardPageClient />
}
