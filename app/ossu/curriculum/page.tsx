// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import CurriculumPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Curriculum — OSSU Academy | Hostamar',
  description:
    'Full OSSU computer science curriculum in Bengali: Introduction to CS, Core Programming, Math, Systems, and Advanced topics. Self-paced, free, and complete.',
  robots: { index: false, follow: false },
}

export default function CurriculumPage() {
  return <CurriculumPageClient />
}
