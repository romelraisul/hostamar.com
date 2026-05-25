import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Layout } from 'lucide-react'
import EditorClient from './client'

export const metadata: Metadata = {
  title: 'Video Editor - Hostamar',
  description: 'Create beautiful videos with Bangladeshi cultural templates.',
}

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Layout className="w-6 h-6 text-orange-400" />
            <div>
              <h1 className="text-2xl font-bold">Video Editor</h1>
              <p className="text-xs text-gray-400">Create with Bangladeshi cultural templates</p>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pb-12">
        <EditorClient />
      </main>
    </div>
  )
}
