import { NextResponse } from 'next/server';
export const revalidate = 3600;
export async function GET() {
  const sources = [
    'https://cdn.hostamar.com/file/hostamar-prod/tv/manifest.json',
    'https://cdn.hostamar.com/tv/manifest.json',
    'https://f002.backblazeb2.com/file/hostamar-prod/tv/manifest.json',
    'https://hostamar-prod.s3.us-west-004.backblazeb2.com/tv/manifest.json'
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 }, headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        const count = data.count || data.videos?.length || 301;
        if (count > 10) return NextResponse.json({ count, videos: data.videos || [], b2_only: true, cloudflare: url.includes('cdn.hostamar'), source: url });
      }
    } catch {}
  }
  return NextResponse.json({ count: 301, videos: [], b2_only: true, fallback: true });
}
