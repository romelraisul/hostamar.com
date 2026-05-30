import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import PreviewsClient from './client'

export const metadata: Metadata = {
  title: 'AI Video Previews - Hostamar',
  description: 'Generate AI-powered 10-second video previews for your content.',
}

export default function PreviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Previews</h1>
              <p className="text-xs text-gray-400">Generate 10-second video preview concepts</p>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pb-12">
        <PreviewsClient />
      </main>
    </div>
  )
}
