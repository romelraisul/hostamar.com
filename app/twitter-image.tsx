import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Hostamar - বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Load Noto Sans Bengali Bold — MUST for Bangla shaping, Satori needs ArrayBuffer
  let bengaliBold: ArrayBuffer;
  try {
    // Try local public/fonts via host — works on edge after deploy
    const res = await fetch('https://hostamar.com/fonts/NotoSansBengali-Bold.ttf');
    if (res.ok) {
      bengaliBold = await res.arrayBuffer();
    } else {
      throw new Error('local font not found');
    }
  } catch {
    // Fallback fetch from gstatic — always works on edge (same url we downloaded from)
    const res = await fetch('https://fonts.gstatic.com/s/notosansbengali/v33/Cn-SJsCGWQxOjaGwMQ6fIiMywrNJIky6nvd8BjzVMvJx2mcSPVFpVEqE-6Kmsm5MudA.ttf');
    bengaliBold = await res.arrayBuffer();
  }

  const useEnglishFallback = false; // set true if Satori still breaks even with font

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'linear-gradient(to bottom right, #0a0a0a, #1a1a1a, #1a0a2e)',
          padding: '60px',
          fontFamily: 'Noto Sans Bengali',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 20, fontFamily: 'Noto Sans Bengali' }}>
          Hostamar 🚀
        </div>
        {useEnglishFallback ? (
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 56, fontWeight: 700, lineHeight: 1.2, color: '#fff' }}>
            <span>AI Video Maker for</span>
            <span style={{ color: '#a855f7' }}>Bangladeshi Business</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.3,
              color: '#fff',
              fontFamily: 'Noto Sans Bengali',
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              whiteSpace: 'pre-wrap',
            }}
          >
            <span>বাংলাদেশি ব্যবসার জন্য</span>
            <span style={{ color: '#a855f7' }}>AI মার্কেটিং ভিডিও মেকার</span>
          </div>
        )}
        <div style={{ display: 'flex', fontSize: 24, color: '#a1a1aa', marginTop: 20, fontFamily: 'Noto Sans Bengali' }}>
          {useEnglishFallback ? '50+ Templates • Bangla Voiceover • bKash Payment' : '৫০+ টেমপ্লেট • বাংলা ভয়েসওভার • bKash পেমেন্ট'}
        </div>
        <div style={{ display: 'flex', fontSize: 18, color: '#71717a', marginTop: 10 }}>
          hostamar.com • 6000 FREE credits • TV 3700 channels
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Noto Sans Bengali',
          data: bengaliBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  );
}
