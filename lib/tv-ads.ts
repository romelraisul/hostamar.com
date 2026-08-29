// lib/tv-ads.ts — 23 tracked text ads for TV players
// Each ad has adKey for click tracking + href for navigation
export const TV_TEXT_ADS: { adKey: string; text: string; href: string }[] = [
  { adKey: 'ai-video', text: '🎬 AI Video Maker — 6000 FREE credits', href: '/ai-video' },
  { adKey: 'ai-image', text: '🖼 AI Image Generator — bKash/Nagad', href: '/ai-image' },
  { adKey: 'ai-voice', text: '🎙 AI Voiceover Bangla — 100+ voices', href: '/ai-voice' },
  { adKey: 'ai-logo', text: '🎨 AI Logo Maker — 1-click brand kit', href: '/ai-logo' },
  { adKey: 'ai-card', text: '💳 AI Business Card — QR+NFC', href: '/business-card' },
  { adKey: 'ai-website', text: '🌐 AI Website Builder — host on Hostamar', href: '/website-builder' },
  { adKey: 'store', text: '🛒 Store — templates, videos, logos', href: '/store' },
  { adKey: 'fb-ads', text: '⚡ FB Ads Video ৳500 — 2h delivery', href: '/services/facebook-ads' },
  { adKey: 'yt-intro', text: '⚡ YouTube Intro ৳300', href: '/services/youtube-intro' },
  { adKey: 'logo-anim', text: '⚡ Logo Animation ৳400', href: '/services/logo-animation' },
  { adKey: 'photo-video', text: '⚡ Photo to Video ৳250', href: '/services/photo-to-video' },
  { adKey: 'ecom-ad', text: '⚡ E-commerce Ad ৳600', href: '/services/ecommerce' },
  { adKey: 'real-estate', text: '⚡ Real Estate Video ৳800', href: '/services/real-estate' },
  { adKey: 'restaurant', text: '⚡ Restaurant Menu ৳350', href: '/services/restaurant' },
  { adKey: 'wedding', text: '⚡ Wedding Invite ৳500', href: '/services/wedding' },
  { adKey: 'political', text: '⚡ Political Campaign ৳700', href: '/services/political' },
  { adKey: 'services-all', text: '⚡ 50+ Services at hostamar.com/services', href: '/services' },
  { adKey: 'credits', text: '💰 6000 FREE credits — bKash/Rocket/Nagad', href: '/pricing' },
  { adKey: 'hosting-tv', text: '🚀 Host your own TV like this — code TV20 20% OFF', href: '/hosting' },
  { adKey: 'advertise', text: '📢 Advertise Here: 3700 channels — ৳500/week', href: '/contact' },
  { adKey: 'b2b', text: '🏢 B2B Video Pack — 10 videos ৳3000', href: '/services/b2b' },
  { adKey: 'reseller', text: '🤝 Reseller: Earn 30% — hostamar.com/reseller', href: '/reseller' },
  { adKey: 'support', text: '💬 Support: Live chat — hostamar.com/support', href: '/support' },
]

export const TV_TEXT_ADS_INTERVAL_MS = 8000
export const TV_TEXT_ADS_SIDEBAR_INTERVAL_MS = 10000

// Backwards compat: string array for any old code using TV_TEXT_ADS as string[]
export const TV_TEXT_ADS_STRINGS: string[] = TV_TEXT_ADS.map((a) => a.text)
