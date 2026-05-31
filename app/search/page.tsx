// Server Component wrapper — exports metadata, delegates to client
import { Metadata } from 'next'
import SearchPageClient from './page.client'

export const metadata: Metadata = {
  title: 'AI Video Search | Hostamar',
  description:
    'Search your AI-generated videos with semantic search. Powered by Ollama embeddings and cosine similarity. Find content by meaning, not just keywords.',
  alternates: { canonical: 'https://hostamar.com/search' },
  openGraph: {
    title: 'AI Video Search | Hostamar',
    description:
      'Semantic search for your AI-generated videos. Powered by Ollama embeddings. Find content by meaning, not just keywords.',
    url: 'https://hostamar.com/search',
    siteName: 'Hostamar',
    images: [{ url: 'https://hostamar.com/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Video Search | Hostamar',
    description: 'Semantic search for your AI-generated videos. Powered by Ollama embeddings.',
    images: ['https://hostamar.com/opengraph-image'],
  },
  robots: { index: true, follow: true },
  keywords: ['video search', 'semantic search', 'ai search engine', 'ollama search', 'hostamar video search'],
}

export default function SearchPage() {
  return <SearchPageClient />
}
