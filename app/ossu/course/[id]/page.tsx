// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import CoursePageClient from './page.client'

export const metadata: Metadata = {
  title: 'Course Details — OSSU Academy | Hostamar',
  description:
    'Learn computer science with the OSSU curriculum in Bengali. Free, self-paced courses with video lessons, exercises, and projects.',
  robots: { index: false, follow: false },
}

export default function CoursePage({ params }: { params: { id: string } }) {
  return <CoursePageClient id={params.id} />
}
