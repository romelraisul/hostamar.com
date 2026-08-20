# Color Restore — Hybrid Green/Blue (20 Aug 2026)

## Bug
Pure blue #2563EB sweep made login/dashboard clash + 368 green hits in non-critical routes looked broken.

## Fix — Hybrid (green primary, blue secondary)
- Primary CTA "ফ্রিতে ভিডিও বানান" = #0E7C3A Hostamar Green (BD trust, bKash heritage)
- Secondary "হোস্টিং দেখুন" + Hosting badge = #2563EB Hosting Blue
- Accent = #F59E0B Amber (bKash urgency)
- Base #FFFFFF / #F8FAFC, Text #0F172A
- 1 gradient per page max, final CTA only, green→blue, no purple-pink #9333EA→#EC4899

## Files
- tailwind.config.js: brand 50-950 green, primary DEFAULT #0E7C3A, secondary #2563EB, hostamar.primary #0E7C3A
- lib/products.ts: ai-video `from-[#0E7C3A] via-[#0c6a32] to-[#0F172A]` (70% hero green), cloud-hosting `from-[#2563EB] via-[#1D4ED8] to-[#0F172A]` (20% blue)
- app/generate/page.tsx: PRIMARY #0E7C3A, Eid card green→dark, form focus #0E7C3A, Generate CTA green
- app/hosting/page.tsx: main CTA "ফ্রিতে শুরু ৳0" green, hosting badges/tables blue secondary
- app/page.tsx: GREEN="#0E7C3A", HeroC green primary
- components/home/HeroC.tsx: main CTA green, hover #0c6a32
- app/login/page.tsx: already green (no change), signup white card + green button preserved
- public/robots.txt + app/robots.ts correctly disallow /admin /dashboard

## Verify
grep -c "#0E7C3A" hosting/page 1+ (green primary) and generate/page 5+; grep "from-purple" 0 in 6 critical; build 114p 0 errors.
