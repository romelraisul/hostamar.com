'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import PreviewsClient from './client';
import { useLocale } from '@/lib/locale-context';
import '@/lib/i18n-dict' // pull the translation dictionary into this chunk (t() below is sync)

export default function PreviewsPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      

      <main className="container mx-auto px-4 pb-12">
        <PreviewsClient />
      </main>
    </div>
  )
}
