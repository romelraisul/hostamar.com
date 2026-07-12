import { ImageResponse } from 'next/og'

// NOTE: runtime intentionally NOT 'edge'. next/og's ImageResponse under the
// edge runtime pulls in `Html` from next/document during Vercel's build-time
// prerender of /404 and /500, crashing with "<Html> should not be imported
// outside of pages/_document". Node.js runtime renders the OG image fine and
// avoids that internal prerender crash.
export const alt = 'Hostamar - Cloud Hosting, AI Marketing, Gaming, AI Browser & Dev IDE'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background:
              'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #3b82f6, #a855f7, #ec4899)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Hostamar
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#94a3b8',
              fontWeight: 400,
              textAlign: 'center',
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            Cloud Hosting, AI Marketing, Gaming, AI Browser & Dev IDE
          </div>
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 16,
              fontSize: 16,
              color: '#64748b',
            }}
          >
            <span style={{
              padding: '8px 16px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 20,
              color: '#60a5fa',
            }}>Cloud Hosting</span>
            <span style={{
              padding: '8px 16px',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: 20,
              color: '#a78bfa',
            }}>AI Videos</span>
            <span style={{
              padding: '8px 16px',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: 20,
              color: '#f472b6',
            }}>Gaming</span>
            <span style={{
              padding: '8px 16px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 20,
              color: '#4ade80',
            }}>AI Browser</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
