# #8 Launch Sprint — 7-Day Runbook (HUMAN-EXECUTED)

Goal: **3 paid orgs = ৳10,500 MRR** → proves `Payment.organizationId` → MRR
wiring (65ee095) works with REAL money, not sandbox.

The AI built the scaffolding (this folder + scripts). You do the human parts.
Do NOT fake Daraz leads or paid orgs — verification queries below will expose it.

---

## Day 0 — Prep (30m)
- [ ] `cp .env.example .env.prod` and set `LAUNCH_BOT_EMAIL`/`LAUNCH_BOT_PASSWORD`
      to a real customer with enough video quota (raise `videosPerMonth` ≥ 20
      for the bot, or the generate script hits `limitReached` at 10).
- [ ] Set `BKASH_BASE_URL=https://tokenized.pay.bka.sh` (PROD, not sandbox) before launch.
- [ ] Confirm `/api/videos/generate` returns a REAL url (not `/demo-videos/`).
      Run `node scripts/launch/make-personalized-videos.mjs` against prod.

## Day 1 — Morning 2h: SCRAPE (TASK 1)
- [ ] Join FB groups: "Daraz Sellers Bangladesh", "E-commerce Sellers BD".
- [ ] Search "need video editor", "product video keu kore?".
- [ ] Fill `daraz-20.csv` with 20 REAL shops (delete EXAMPLE rows).
      Columns: shopName, fbPageUrl, darazUrl, topProduct, topProductImageUrl,
      ownerName, emailOrFbProfile, painSignal.

## Day 1 — Midday 30m: VIDEOS (TASK 2, AI)
- [ ] `node scripts/launch/make-personalized-videos.mjs`
- [ ] Verify 20 `personalizedVideoUrl` written back into daraz-20.csv.
- [ ] If DEMO urls → wire ELEVENLABS_API_KEY / GPU render, re-run.

## Day 1 — Afternoon 2h: LOOMS (TASK 3)
- [ ] Record per loom-script.md (45s, Bangla+EN). 20 clones, swap vars.
- [ ] Set thumbnail = topProductImageUrl. Paste `loomUrl` into daraz-20.csv.

## Day 1 — Evening 1h: SEND (TASK 4)
- [ ] For each row, send Day1 DM using sequence-1.json touch (day:1):
      Subject/body/loom from the JSON, fill `{shopName}` etc. from CSV.
- [ ] Log to tracking.json: `{shopName, day1SentAt, ...}` (see tracking-schema.json).

## Day 3 / 5 / 7 / 9 — FOLLOW-UPS (TASK 4)
- [ ] sequence-1.json touches day:3/5/7/9 — execute per channel.
- [ ] Update tracking.json: opened?, replied?, loomViewed?, checkoutStarted?.

## CLOSE (TASK 5)
- [ ] They click /pricing → Business ৳3500 → POST /api/billing/create-checkout
      {plan:'business'} → bkashURL.
- [ ] bKash pay → GET /api/webhooks/bkash?paymentID= → execute → Payment
      status=paid with organizationId=THEIR org → /billing/success.
- [ ] Onboard: create org (slug = FB page name), upload 3 products, gen 3 videos,
      DM them. Add to "Hostamar Launch Customers" WhatsApp (you = Tier2, b6ad042).

---

## VERIFICATION (real queries — proof, not vibes)

### MRR after each paid (TASK 6)
```bash
psql "$DATABASE_URL" -c "SELECT organizationId, COUNT(*) AS paid_count, SUM(amount) AS mrr \
  FROM \"Payment\" WHERE status='paid' GROUP BY organizationId"
# expect 1 row per paid org; after 3 paid: total mrr = 10500
```

### measureMRR tool (lib/autonomy/tools/measureMRR.ts)
```bash
curl -H "Authorization: Bearer $INTERNAL_SECRET" http://localhost:3000/api/admin/diagnostics
# or: npx tsx -e "import('./lib/autonomy/tools/measureMRR.ts').then(m=>m.measureMRR().then(console.log))"
# expect { mrr: 3500, payingOrgs: 1 } → 10500 / 3 after 3 paid
```

### Payment row integrity (isolation pays off)
```bash
psql "$DATABASE_URL" -c "SELECT id, organizationId, amount, status, transactionId \
  FROM \"Payment\" WHERE status='paid' AND organizationId IS NOT NULL"
# 3 rows, orgId NOT NULL, amount=3500, status=paid
```

### No secret leak in client bundle
```bash
grep -rln "BKASH_APP_SECRET\|BKASH_PASSWORD" app/ components/ && echo "LEAK" || echo "CLEAN"
```

---

## GATES (code untouched — content only, but re-verify after edits)
```bash
npx tsc --noEmit --skipLibCheck   # expect 0
node scripts/check-schema-drift.js # expect 0 (no schema change)
npm run build                      # expect ✓ Middleware 25.8 kB
```

## COMMIT (after human execution — do NOT commit fake paid rows)
```bash
git add working/outbound/daraz-20.csv working/outbound/tracking.json \
        working/outbound/looms/ content/launch/
git commit -m "launch: 20 Daraz shops, 20 personalized videos via own product, 20 Looms, sequence-1 live, 3 paid proof via bKash orgId wiring"
```
