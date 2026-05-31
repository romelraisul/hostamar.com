'use client';

import Link from 'next/link';
import { ArrowLeft, Layout } from 'lucide-react';
import EditorClient from './client';
import { useLocale } from '@/lib/locale-context';

export default function EditorPage() {
  const { t } = useLocale();
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
              <h1 className="text-2xl font-bold">{t('editor.title')}</h1>
              <p className="text-xs text-gray-400">{t('editor.subtitle')}</p>
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
