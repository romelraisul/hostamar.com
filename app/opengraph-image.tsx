import { ImageResponse } from 'next/og'

export const alt = 'Hostamar — AI দিয়ে মার্কেটিং ভিডিও ৩০ সেকেন্ডে — ৳0 তে শুরু'
export const size = { width: 1200, height: 630 }
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
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: 32,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                height: 44,
                width: 44,
                borderRadius: 12,
                background: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              H
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>Hostamar</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>AI Marketing + Hosting — Bangladesh</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
              bKash
            </div>
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
              Nagad
            </div>
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
              Rocket
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#0F172A', letterSpacing: -1.2 }}>AI দিয়ে ভিডিও</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: '#2563EB', letterSpacing: -1.2 }}>৩০ সেকেন্ডে</div>
          </div>
          <div style={{ fontSize: 18, color: '#475569', display: 'flex' }}>৫০+ বাংলা টেমপ্লেট — ঈদ, পহেলা বৈশাখ, 11.11 • হোস্টিং সহ • bKash এ পেমেন্ট</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ borderRadius: 999, background: '#2563EB', color: 'white', padding: '10px 18px', fontSize: 14, fontWeight: 700, display: 'flex' }}>
              ৳0 তে শুরু
            </div>
            <div style={{ fontSize: 12, color: '#475569', display: 'flex' }}>৭ দিন মানি-ব্যাক • hostamar.com/generate</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 999, padding: '4px 10px', fontSize: 11, color: '#334155', display: 'flex' }}>
              BDIX ঢাকা CDN
            </div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FED7AA', borderRadius: 999, padding: '4px 10px', fontSize: 11, color: '#92400E', display: 'flex' }}>
              ৫০০+ creators
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
