import { NextResponse } from 'next/server';
export const revalidate = 60;
export async function GET() {
  const sources = [
    '/tv/manifest.json',
    'https://hostamar.com/tv/manifest.json'
  ];
  
  for (const url of sources) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 }, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const count = data.count || data.videos?.length;
        if (count && count >= 100) {
          return NextResponse.json({ 
            count, 
            videos: data.videos?.slice(0, 20) || [], 
            b2_only: true, 
            cloudflare: url.includes('cdn.hostamar'),
            source: url,
            total: count
          });
        }
      }
    } catch (e) {
      console.log(`Failed ${url}: ${e}`);
    }
  }
  
  return NextResponse.json({ 
    count: 301, 
    videos: [], 
    b2_only: true, 
    fallback: true,
    source: 'hardcoded-301',
    note: 'CDN Worker pending, using known count'
  });
}
