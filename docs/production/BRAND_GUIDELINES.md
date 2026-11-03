# BRAND_GUIDELINES — Visual Identity, Copy, Payments

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — Bengali-first, 168 renders

---

## Color Palette (Verified Live)

| Role | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Primary Green** | `#0E7C3A` | 14, 124, 58 | Buttons, accents, progress bars, active nav |
| **Secondary Blue** | `#2563EB` | 37, 99, 235 | Links, info badges, embeddings |
| **Accent Amber** | `#F59E0B` | 245, 158, 11 | Warnings, credit badges, payment CTAs |
| **Surface Light** | `#FFFFFF` / `#F8FAFC` | 255/248,250,252 | Page backgrounds, cards |
| **Surface Dark** | `#0F172A` | 15, 23, 42 | Sidebar, footer, dark mode base |
| **Text Primary** | `#0F172A` | 15, 23, 42 | Headings, body text |
| **Text Secondary** | `#475569` | 71, 85, 105 | Descriptions, subtext |
| **Text Muted** | `#64748B` | 100, 116, 139 | Placeholders, timestamps |

---

## Typography

- **Latin:** System UI stack (Inter fallback)
- **Bangla:** Noto Sans Bengali (auto-loaded via Google Fonts)
- **Scale:** `text-xs` (11px) → `text-sm` (13px) → `text-base` (16px) → `text-lg` (18px) → `text-xl` (20px) → `text-2xl` (24px)
- **Section Labels:** `tracking-widest` uppercase (CREDITS, PRODUCTS, MANAGE)

---

## Bengali-First Copy Rules

1. **All user-facing text ships Bangla + English**
   - Navigation: "CREDITS / ক্রেডিট", "PRODUCTS / প্রোডাক্টস"
   - Buttons: "bKash Renew → / bKash রিনিউ →"
   - Stats: "৩৭৪ ভিডিও / 374 videos"

2. **Currency Format**
   - Symbol: `৳` (BDT)
   - Credit conversion: `1cr = 1 taka` (1 credit = 1 BDT)
   - Display: `৳990 (6000cr)`, `৳1,900 (13000cr)`, `৳2,900 (30000cr)`

3. **bKash Personal Number**
   - **01822417463** — displayed in all payment flows
   - Format: "bKash পেমেন্ট: আমাদের পার্সোনাল নাম্বার 01822417463 তে Send Money করুন"

4. **Payment Plans (Target Pricing)**
   - Starter: ৳990 / 6000cr
   - Pro: ৳1,900 / 13000cr
   - Business: ৳2,900 / 30000cr
   - Signup Bonus: 3000cr (1cr = 1TK = 1 future HOST coin)

5. **Number Formatting**
   - English: 1,234 (comma thousands)
   - Bangla: ১,২৩৪ (Bangla digits + comma)

---

## Component Style Guide (Live)

### Buttons
```tsx
// Primary (Green)
className="rounded-full bg-[#0E7C3A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0c6a32]"

// Secondary (Blue)
className="rounded-full bg-[#2563EB] px-3 py-1 text-xs font-semibold text-white hover:bg-[#1d4ed8]"

// Outline (Green border)
className="rounded-full border border-[#0E7C3A] px-3 py-1 text-xs font-medium text-[#0E7C3A] hover:bg-[#ECFDF5]"

// Danger (Red)
className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
```

### Cards
```tsx
className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
```

### Sidebar (Dashboard)
```tsx
// Fixed lg:ml-64, slide-in mobile drawer
className="fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r bg-white lg:top-14 lg:h-[calc(100vh-3.5rem)]"
```

### Credits Bar (Header)
```tsx
// Green progress bar, animated width
className="h-1.5 overflow-hidden rounded-full bg-[#D1FAE5]"
child: className="h-full rounded-full bg-[#0E7C3A] transition-all text-white" style={{width: `${percent}%`}}
```

### Status Badges
```tsx
// Green (active/live)
className="rounded-full bg-[#0E7C3A] px-1.5 py-0.5 text-[10px] font-bold text-white"
// Blue (info)
className="rounded-full bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-bold text-white"
// Amber (warning/pending)
className="rounded-full bg-[#F59E0B] px-1.5 py-0.5 text-[10px] font-bold text-white"
```

---

## Iconography

- **Library:** Lucide React
- **Standard Size:** `h-4 w-4` (16px)
- **Feature Cards:** `h-8 w-8` (32px) in `rounded-lg bg-[#0E7C3A] text-white`
- **Brand Mark:** `H` in green `rounded-lg` for sidebar header

---

## Motion

- **Transitions:** `transition-colors` (150ms), `transition-all` (200ms)
- **Animations:** `animate-spin` (loading), `animate-pulse` (skeletons)
- **Hover:** `hover:bg-[#F1F5F9]`, `hover:text-[#0F172A]`, `hover:border-[#0E7C3A]/30`

---

## Dark Mode

- Class-based on `html.dark`
- Surfaces: `#0F172A` base, `#1E293B` elevated
- Text: `#F1F5F9` primary, `#94A3B8` secondary
- Green primary `#0E7C3A` unchanged (accessible on dark)

---

## Accessibility

- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<button>`
- Focus rings: `outline-none` + custom focus-visible
- ARIA labels on icon-only buttons
- WCAG AA contrast on all text/background combos

---

## Payment Flow Copy (Verified)

```
bKash পেমেন্ট: আমাদের পার্সোনাল নাম্বার 01822417463 তে Send Money করুন।
Plans: Starter ৳990 (6000cr) / Pro ৳1,900 (13000cr) / Business ৳2,900 (30000cr) — 1cr = 1TK।
তারপর TrxID টি https://hostamar.com/dashboard/payment এ সাবমিট করুন — আমরা ৫ মিনিটে Approve করব।
```

---

## Verified Live Metrics

- **Renders:** 168
- **Edge Tools:** 53
- **Categories:** 10
- **Worker Model:** `minimax/minimax-m3:free`
- **Ground Model:** `llama-3.2-11b-vision-instruct`