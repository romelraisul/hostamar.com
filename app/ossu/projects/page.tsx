// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import ProjectsPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Projects — OSSU Academy | Hostamar',
  description:
    'Hands-on computer science projects in Bengali. Build CRUD apps, data analysis tools, and more. Apply your OSSU curriculum knowledge with real projects.',
  robots: { index: false, follow: false },
}

export default function ProjectsPage() {
  return <ProjectsPageClient />
}
