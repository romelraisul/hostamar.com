'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const GREEN = '#0E7C3A'

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly')

  const plans = [
    {
      name: 'Free',
      price: '৳0',
      desc: 'Try before you buy',
      features: [
        '5 images/day',
        '1 video/day (720p)',
        '100 chat messages/day',
        'Basic support',
      ],
      cta: 'Start Free',
      href: '/signup?plan=free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '৳500',
      desc: 'For growing businesses',
      features: [
        '100 images/day',
        '10 videos/day (1080p)',
        'Unlimited chat',
        'API access',
        'Priority queue',
        'Commercial license',
      ],
      cta: 'Get Pro',
      href: '/signup?plan=pro',
      popular: true,
    },
    {
      name: 'Business',
      price: '৳2,000',
      desc: 'For agencies & teams',
      features: [
        'Unlimited images',
        '50 videos/day (4K)',
        'Unlimited chat',
        'API access + webhooks',
        'Custom models',
        'Team seats (5)',
        'Priority support',
      ],
      cta: 'Get Business',
      href: '/signup?plan=business',
      popular: false,
    },
  ]

  const apis = [
    {
      name: 'Chat / Language Model API',
      endpoint: '/v1/chat/completions',
      price: '৳0.5-2 / 1K tokens',
      desc: 'OpenAI-compatible. Models: rafan (fast, always-on) & rushan/borna/hostamar (high-capability), all with 1M token context. Host your own AI assistant, support bot, or agent.',
      example:
`curl -X POST https://hostamar.com/v1/chat/completions \\
  -H "Authorization: Bearer ***" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "rafan", "messages": [{"role": "user", "content": "আমার পণ্যের জন্য মার্কেটিং টিপস দিন"}]}'`,
    },
    {
      name: 'Image Generation',
      endpoint: '/api/ai/image/generate',
      price: '৳50-200/image',
      desc: 'Generate product photos, marketing banners, social media graphics',
      example:
`curl -X POST https://hostamar.com/api/ai/image/generate \\
  -H "Authorization: Bearer ***" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "professional product photo", "width": 1024, "height": 1024}'`,
    },
    {
      name: 'Video Generation',
      endpoint: '/api/ai/videos/generate',
      price: '৳500-2,000/video',
      desc: 'Create marketing videos, reels, TikToks, YouTube shorts',
      example:
`curl -X POST https://hostamar.com/api/ai/videos/generate \\
  -H "Authorization: Bearer ***" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "15s product ad", "style": "ads", "duration": 15}'`,
    },
    {
      name: 'Code Generation',
      endpoint: '/api/dev/chat',
      price: '৳1-5/query',
      desc: 'Code generation, debugging, documentation',
      example:
`curl -X POST https://hostamar.com/api/dev/chat \\
  -H "Authorization: Bearer ***" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Write a Python script for image processing"}'`,
    },
    {
      name: 'Browser / Web Scraping',
      endpoint: '/api/ai/browser/search',
      price: '৳0.5-1/query',
      desc: 'URL summarization, web scraping, article extraction',
      example:
`curl -X POST https://hostamar.com/api/ai/browser/search \\
  -H "Authorization: Bearer ***" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/article"}'`,
    },
  ]

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <div className="mx-auto max-w-[1100px] px-4 py-12">
        <h1 className="text-3xl font-bold">Pricing & API</h1>
        <p className="mt-2 text-zinc-600">
          Sell Hostamar AI to your customers. White-label or API access.
        </p>

        {/* Pricing Plans */}
        <section className="mt-10">
          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${billing === 'monthly' ? 'bg-[#0E7C3A] text-white' : 'bg-zinc-100 text-zinc-600'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${billing === 'yearly' ? 'bg-[#0E7C3A] text-white' : 'bg-zinc-100 text-zinc-600'}`}
            >
              Yearly (20% off)
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 ${plan.popular ? 'border-[#0E7C3A] shadow-lg' : 'border-zinc-200 bg-white'}`}
              >
                {plan.popular && (
                  <span className="inline-block px-3 py-1 bg-[#0E7C3A] text-white text-xs font-medium rounded-full mb-3">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mt-1">{plan.desc}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-zinc-500">/mo</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-[#0E7C3A]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 block text-center py-3 rounded-full font-medium ${plan.popular ? 'bg-[#0E7C3A] text-white hover:bg-[#0c6a32]' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Premium IPTV - Monetization */}
        <section className="mt-16 rounded-2xl border-2 border-[#0E7C3A] bg-white p-8">
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-[#0E7C3A] text-white text-xs font-bold rounded-full mb-3">NEW • IPTV</span>
            <h2 className="text-2xl font-bold">Premium IPTV</h2>
            <p className="mt-2 text-zinc-600">Live TV streaming • bKash enabled • 2 free channels, 6 premium</p>
          </div>
          <div className="mt-8 grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-zinc-200 p-6 text-center">
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="mt-2"><span className="text-3xl font-bold">৳0</span><span className="text-zinc-500">/mo</span></div>
              <ul className="mt-4 text-sm text-zinc-600 space-y-1">
                <li>✓ 2 channels (Channel 1 & 2)</li>
                <li>✓ 720p HLS</li>
                <li>✓ m3u: /api/tv/iptv.m3u</li>
              </ul>
              <a href="/api/tv/iptv.m3u" className="mt-6 block py-3 rounded-full bg-zinc-100 font-medium hover:bg-zinc-200">Get Free m3u</a>
            </div>
            <div className="rounded-2xl border-2 border-[#0E7C3A] p-6 text-center bg-[#F0FDF4]">
              <h3 className="text-lg font-semibold">Premium</h3>
              <div className="mt-2"><span className="text-3xl font-bold">৳199</span><span className="text-zinc-500">/mo</span></div>
              <ul className="mt-4 text-sm text-zinc-600 space-y-1">
                <li>✓ 6 channels (all + premium)</li>
                <li>✓ 1080p HLS</li>
                <li>✓ Full m3u via API key</li>
                <li>✓ bKash: 01822417463</li>
              </ul>
              <button onClick={() => window.location.href='/api/billing/premium-iptv?key='+prompt('Enter bKash trxId after payment to 01822417463 (199 BDT)') || ''} className="mt-6 block w-full py-3 rounded-full bg-[#0E7C3A] text-white font-medium hover:bg-[#0c6a32]">bKash Pay 199 BDT</button>
              <p className="mt-2 text-xs text-zinc-500">Or send bKash to 01822417463 and contact support</p>
            </div>
          </div>
        </section>

        {/* API Catalog */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">API Catalog</h2>
          <p className="mt-2 text-zinc-600">
            Sell these APIs to your customers. Pay-per-use or bundle into your own product.
            Get your key at <Link href="/developers" className="text-[#0E7C3A] underline">/developers</Link>.
          </p>

          <div className="mt-6 space-y-4">
            {apis.map((api) => (
              <div key={api.name} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{api.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1">{api.desc}</p>
                    <code className="text-xs text-zinc-400 mt-2 block">{api.endpoint}</code>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#0E7C3A]">{api.price}</span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-zinc-900 p-4 text-sm text-green-400 font-mono overflow-x-auto">
                  <pre>{api.example}</pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mobile App */}
        <section className="mt-16 rounded-2xl border border-zinc-200 bg-white p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: GREEN }}>
              📱
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Hostamar Mobile App</h2>
              <p className="text-zinc-600">
                Install as a PWA — no app store needed. Works offline for chat history.
              </p>
            </div>
            <button
              onClick={() => alert('Use browser menu → Add to Home Screen')}
              className="rounded-full px-6 py-3 font-medium text-white"
              style={{ background: GREEN }}
            >
              Install App
            </button>
          </div>
        </section>

        {/* Payment Info */}
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="font-semibold">Payment Methods</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank Transfer'].map((m) => (
              <span key={m} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                {m}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            For API access, contact: 01822417463 (bKash) or email support@hostamar.com
          </p>
        </section>
      </div>
    </div>
  )
}
