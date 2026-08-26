# Hostamar 50-Service Bangla AI Store — Docs

## Overview
AI Store at `/dashboard/services` — 50 digital products like ecommerce. Customer spends 6000 credits, clicks "এক্টিভেট করুন", AI delivers via `ai.hostamar.com`.

## How to Add New Service (JSON only, no code)
1. Add 1 JSON file to `/lib/services/<id>.json` or edit `lib/services-catalog.json`
```json
{
  "id": "s51",
  "name": "New Service",
  "nameBn": "নতুন সার্ভিস",
  "category": "Business",
  "categoryBn": "বিজনেস ও মার্কেটিং",
  "creditCost": 40,
  "dollarRange": "$19",
  "benefit": "Does X",
  "benefitBn": "এক্স করে",
  "perfectFor": "Founders",
  "perfectForBn": "ফাউন্ডারদের জন্য",
  "promptTemplate": "Generate X for {{input}}",
  "model": "llama-3-70b",
  "inputs": [{"key":"input","labelBn":"ইনপুট","placeholder":"লিখুন"}],
  "icon": "✨",
  "isActive": true,
  "popular": 80
}
```
2. Run `npx prisma db push` or `node prisma/seed-services.ts` to upsert.
3. No code change — catalog auto-loads.

## Credit Mapping $ → cr
$5-9=15cr, $9-17=25cr, $12-27=40cr, $15-35=40cr, $17-47=75cr, $19-47=75cr, $24-67=100cr
Business: 6000 credit pool. Video 100cr Chat 1cr Browser 5cr IDE 10cr Game 20cr Hosting 0cr.

## Failover Diagram
```
Customer → POST /api/services/activate → deduct CreditTransaction -cost → ServiceOrder queued
   ↓ 3s
POST /api/services/generate (internal) → try ai.hostamar.com/v1/chat (flux-dev/sdxl) → fallback mock
   ↓ delivered
MinIO s3.hostamar.com/results/{id}.json + resultUrl
If ai.hostamar.com down → mock delivered (no 500)
```

## Bangla Translation Map (code stays English)
Dashboard→ড্যাশবোর্ড, AI Store→AI স্টোর, Services→সার্ভিসসমূহ, Credit→ক্রেডিট, Remaining→অবশিষ্ট, Used→ব্যবহৃত, Activate→এক্টিভেট করুন, Search 50 services→৫০টি সার্ভিস খুঁজুন..., Popular→জনপ্রিয়, Credit Low->High→ক্রেডিট কম থেকে বেশি, etc (see prompt).

## API
- GET /api/services/catalog?category=&search= → 50 with nameBn
- POST /api/services/activate {serviceId, inputs} → deduct 6000→5960
- GET /api/services/orders?limit=20
- POST /api/services/generate {orderId} → delivered

## Build
- Color: #0E7C3A primary green, no purple-pink, rounded-2xl border Replit style.
- 320px no overflow, sticky bottom CTA "৬০০০ ক্রেডিট • ৪০cr গড় • এখনই এক্টিভেট করুন সবুজ"
