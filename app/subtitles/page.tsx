'use client';

import Link from 'next/link';
import { ArrowLeft, Subtitles } from 'lucide-react';
import SubtitlesPageClient from './client';
import { useLocale } from '@/lib/locale-context';

export default function SubtitlesPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      

      <main className="container mx-auto px-4 py-8">
        <SubtitlesPageClient />
      </main>
    </div>
  )
}
