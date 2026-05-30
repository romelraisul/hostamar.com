import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Subtitles } from 'lucide-react'
import SubtitlesPageClient from './client'

export const metadata: Metadata = {
  title: 'AI Subtitles - Hostamar',
  description: 'Generate AI-powered subtitles for your videos in Bengali and English.',
}

export default function SubtitlesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Subtitles className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">AI Subtitles</h1>
              <p className="text-xs text-gray-400">Bengali & English subtitle generation</p>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <SubtitlesPageClient />
      </main>
    </div>
  )
}
