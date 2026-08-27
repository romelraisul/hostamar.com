# Bangla Completeness Audit — 100% Bangla Requirement
Date: 2026-08-27  Mode: AUDIT ONLY (no fixes)
Rule: After login, dashboard must show NO English word anywhere. Every label/button/placeholder must be Bangla.

## 1. Verdict
- **Public pages (`/`, `/pricing`, `/login`, `/signup`, `/about`, `/contact`, `/privacy`, `/terms`, `/hosting`, `/dev`, `/game`, `/ide`, `/chat`, `/generate`, `/ai-browser`)**: **Mostly Bangla** — `lib/i18n.ts` has full `bn` dict (~1200 keys) and pages use `CONTENT.bn` switch. Default locale is `en` though, so fresh visitor sees English unless cookie `locale=bn` is set. After login, `app/layout.tsx` should force `bn` for dashboard.
- **Dashboard shell (`app/dashboard/layout.tsx`)**: **Good** — nav labels via `t('nav.*')` → Bangla when locale bn. Logo “Hostamar” is brand name exception.
- **Dashboard overview (`app/dashboard/page.tsx:1-232`)**: **ALL via `t()` — 24 keys** (`dashboard.title`, `dashboard.welcomeBack`, `dashboard.totalVideos`, etc.). When locale bn, **0 hardcoded English**. **BUT if locale stays `en`, overview shows English** (“Dashboard”, “Total Videos”, “Active Services”, “Quick Actions”, “Create Video”). So incompleteness is a **locale-default problem**, not a missing-key problem.
- **Dashboard services (`app/dashboard/services/page.tsx`)**: **4 hardcoded English strings** — fails 100% Bangla.
- **Dashboard videos (`app/dashboard/videos/page.tsx`)**: **6 hardcoded English table headers** — fails.
- **Dashboard ai-studio (`app/dashboard/ai-studio/page.tsx`)**: **100% English** — fails.
- **Dashboard hosting (`app/dashboard/hosting/page.tsx`)**: This file is **NOT the dashboard hosting dashboard**; it is actually the **public hosting landing** (guard comment says old dashboard now at `/dashboard/hosting` but file lives there). It has DUAL `CONTENT.bn` / `CONTENT.en` and picks via `locale`. So **when locale bn → Bangla**; when locale en → English. No `t()` usage. For 100% Bangla dashboard, this page must be Bangla-only or force bn.
- **dev (`app/dev/page.tsx:1-394`)**: **58 hardcoded English fragments** detected, **0 `t()` usage**. Mix of Bangla + English (“Made in Bangladesh”, “Free tier”, “npm run dev →”, “Trusted by CSE students from BUET…”). **Fails 100% Bangla hard.**
- **game (`app/game/page.tsx:1-279`)**: **0 `t()` usage**, 7 English fragments (“BD Server 20ms”, “bKash Instant Payout”, “No Download”, “Weekly Leaderboard”, “Fair Play • 18+”, “bKash entry”, “HTML5 · No download”). **Fails.**
- **ide (`app/ide/page.tsx:1-234`)**: **0 `t()` usage**, 7 English fragments (“hostamar.dev/ide”, “index.js”, “README.md”, “Replit / CodeSandbox …”). **Fails.**
- **chat (`app/chat/page.tsx:1-448`)**: Marketing landing, not dashboard chat. **Not expected to be 100% Bangla dashboard** — but contains 19 English fragments including brand labels (“Hostamar Chat”, “CHATGPT PLUS”, “Bengali optimized”). Uses no `t()`.
- **ai-chat (`app/ai-chat/client.tsx`)**: Dashboard chat — **100% English UI** (“Conversations”, “Sign in to sync chats”, “New chat”, “AI Chat”, “Model:”, “Create or select a conversation…”, sidebar/table). **0 Bangla, 0 `t()` — fails worst.**
- **settings (`app/dashboard/settings/page.client.tsx:1-137`)**: Wrapper delegates to `components/dashboard/settings/*` tabs — tabs were not scanned but likely hardcoded English labels (Profile, Business, etc). Needs per-component scan.

**Bottom line:** `lib/i18n.ts:883-2638` has a **complete `bn` map for `dashboard.*`, `dashServices.*`, `dashVideos.*`, `dashAnalytics.*`** — so from a translation-data perspective, Bangla IS complete for overview/services/videos/analytics. Failure is that **code does not use it** in many places (hardcoded English, zero t()) and **locale defaults to `en`**, so user sees English even though Bangla keys exist.

---

## 2. File-by-file Hardcoded English

### `app/dashboard/services/page.tsx` — 386L, 21 t() keys, 4 hardcodes
| Line | Hardcoded | Needed Bangla | Context | Priority |
|---|---|---|---|---|
| 135 | `Storage` | `স্টোরেজ` | stat card label (but `dashServices.storage` → “স্টোরেজ” exists in `bn`) | High |
| 141 | `Bandwidth` | `ব্যান্ডউইথ` | stat card | High |
| 342 | `Storage` (form label) | `স্টোরেজ` | order modal | High |
| 360 | `Price:` | `মূল্য:` | price line `৳{prices[formData.type]}/month` also leaks `/month` English | High |

Also `Storage`/`Bandwidth` stat cards should use `t()` instead of hardcoded.

### `app/dashboard/videos/page.tsx` — 530L, 39 t() keys, 6 hardcodes
| Line | Hardcoded | Needed Bangla | Priority |
|---|---|---|---|
| 299 | `Status` (th) | `স্ট্যাটাস` (exists `dashVideos.allStatus` → “সব স্ট্যাটাস”) | High |
| 300 | `Duration` | `সময়কাল` / `দৈর্ঘ্য` | High |
| 301 | `Views` | `ভিউ` | High |
| 302 | `Downloads` | `ডাউনলোড` | High |
| 303 | `Created` | `তৈরি হয়েছে` | High |
| 304 | `Actions` | `ক্রিয়া` | High |

Note: top search + grid/table already uses `t()`; only table headers leaked.

### `app/dashboard/ai-studio/page.tsx` — 34L, 0 t(), 100% English
| Line | English | Needed Bangla | Priority |
|---|---|---|---|
| 7 | `AI Studio` (h1) | `এআই স্টুডিও` | Critical |
| 9  | `AI Video` | `এআই ভিডিও` | Critical |
| 10 | `AI Image` | `এআই ইমেজ` | Critical |
| 11 | `AI Voice` | `এআই ভয়েস` | Critical |
| 12 | `AI Avatar` | `এআই অ্যাভাটার` | Critical |
| 13 | `AI Translation` | `এআই অনুবাদ` | Critical |
| 20 (CardContent) | `One-click AI generation` | `ওয়ান-ক্লিকে এআই জেনারেশন` | High |

Entire page needs `useLocale` + `t()` (or `CONTENT` pattern).

### `app/dashboard/referral/page.tsx` — 120L, 0 t(), but mostly Bangla already
- Hard fragments found: `https://hostamar.com/signup?ref=` (URL ok), `Facebook / Twitter / WhatsApp` (brand names ok). Title, body, cards are Bangla (`রিফারেল প্রোগ্রাম`, `আপনার রিফারেল লিঙ্ক`, etc). **Passes 100% Bangla — no fix needed** (brand names are exception).

### `app/dashboard/analytics/page.tsx` — 72L, 8 t(), no hardcode
- Uses `t('dashAnalytics.*')` correctly. **Passes** when locale bn.

### `app/dev/page.tsx` — 394L, 0 t(), 58 English fragments (worst)
Key examples:
| Line | English fragment | Needed Bangla |
|---|---|---|
| 25 | `Made in Bangladesh` | `বাংলাদেশে তৈরি` |
| 27 | `Free tier • কোনো কার্ড লাগবে না` | `ফ্রি টায়ার • কোনো কার্ড লাগবে না` (already mixed) |
| 42 | `VS Code` | Brand keep but wrap: `ব্রাউজারে VS Code` → `ব্রাউজারে ভিএস কোড` |
| 53 | `GitHub দিয়ে Login` | `GitHub দিয়ে লগইন` (Login → লগইন) |
| 58 | `npm run dev →` | ok as code command |
| 69 | `Trusted by CSE students from BUET, SUST, NSU` | `BUET, SUST, NSU-এর CSE শিক্ষার্থীদের আস্থায়` |
| 80 | `main ● Saved` | `main ● সেভ করা হয়েছে` |

Full 58 grep lines are in raw scan artifact. Rule: code/commands/BRAND may stay English (npm, GitHub, VS Code) but UI sentences must be Bangla.

### `app/game/page.tsx` — 279L, 0 t(), 7 fragments
| Line | English | Bangla |
|---|---|---|
| 101 | `BD Server 20ms` | `বিডি সার্ভার ২০মি.সে.` |
| 102 | `bKash Instant Payout` | `বিকাশ ইনস্ট্যান্ট পেআউট` |
| 103 | `No Download` | `ডাউনলোড ছাড়াই` |
| 164 | `bKash entry` | `বিকাশ এন্ট্রি` |
| 165 | `HTML5 · No download` | `HTML5 · ডাউনলোড ছাড়াই` |
| 218 | `Weekly Leaderboard` | `সাপ্তাহিক লিডারবোর্ড` |
| 254 | `Fair Play • 18+` | `ফেয়ার প্লে • ১৮+` |

### `app/ide/page.tsx` — 234L, 0 t(), 7 fragments
Similar — needs `t()` or `CONTENT.bn` switch.

### `app/chat/page.tsx` (public Chat landing) — 448L, 19 English
This is **marketing**, not dashboard. Requirement says “no English anywhere **in dashboard after login**”, so public `/chat` may stay bilingual. If forced 100% Bangla dashboard, this page is out of scope. Fragments like `Hostamar Chat`, `CHATGPT PLUS`, `Bengali optimized` are brand/SEO — keep.

### `app/ai-chat/client.tsx` — 1-450L, 0 t(), ~15 English UI strings (Critical)
All UI is English:
- `Conversations` → `কথোপকথন`
- `Sign in to sync chats` → `চ্যাট সিঙ্ক করতে লগইন করুন`
- `New chat` → `নতুন চ্যাট`
- `AI Chat` → `এআই চ্যাট`
- `Model:` → `মডেল:`
- `Create or select a conversation to start chatting.` → `চ্যাট শুরু করতে একটি কথোপকথন তৈরি বা নির্বাচন করুন।`
- `Start the conversation by typing a message below.` → `নিচে মেসেজ লিখে কথোপকথন শুরু করুন।`
- Sidebar header, input placeholder `Type your message...` → `আপনার মেসেজ লিখুন...`
- Button `Send` → `পাঠান`

This is the “chat page not working well, model list blocks result” reported area — language also English.

---

## 3. Missing t() Keys vs Hardcoded

`lib/i18n.ts` **does have** these keys in `bn`:
- `dashboard.title` `dashboard.welcomeBack` `dashServices.*` `dashVideos.*` `dashAnalytics.*`
- `dev.title` `dev.subtitle` `game.title` `game.subtitle` etc — **BUT** `app/dev/page.tsx` and `app/game/page.tsx` never call `t('dev.title')` — they hardcode or use `CONTENT` object incorrectly (CONTENT is not imported from i18n).

**What’s actually missing from `bn` dict (needed for full Bangla):**
- `dashboard.customerPortal` (used in layout) — bn missing? grep shows present? check: `customerPortal` exists in en but not in bn snippet at 883 — need to verify bn entry exists. Quick scan: `bn` starts at 883, includes `dashboard.title` etc but not `dashboard.customerPortal` visible — likely missing.
- `dashServices.*` hardcoded `Storage`/`Bandwidth` → keys exist but not used.
- `ai-chat.*` keys — **entire `aiChat.*` not present** (ai-chat uses no i18n). Need new namespace `aichat.title`, `aichat.newChat`, etc — none exist.
- `ai-studio.*` — no keys.
- `settings.*` tabs — keys likely missing.

---

## 4. Overview Page Deep Dive (app/dashboard/page.tsx:231L)

Uses `t()` for every visible string (lines 42-68 statCards + 103-160 quickActions + ProductsGrid). **When locale=bn, overview is 100% Bangla already.** Evidence: `bn` has `dashboard.totalVideos`, `dashboard.thisMonth`, `dashboard.activeServices`, `dashboard.total`, `dashboard.storageUsed`, `dashboard.subscription`, `dashboard.quickActions`, `dashboard.createVideo`, `dashboard.addService`, `dashboard.billing`, `dashboard.profile`, `dashboard.recentVideos`, `dashboard.viewAll`, etc.

**Why reported as English?** Because `lib/i18n.ts:3` `defaultLocale: 'en'` and `lib/locale-context.tsx:23` `const locale = initialLocale || 'en'` — new user with no `locale` cookie sees English even after login to `/dashboard`. **Fix: force `bn` in dashboard layout or set cookie to `bn` on login**, not a translation-data fix.

---

## 5. What “No English Word Anywhere” Requires

Product decision: allow brand/code terms (Hostamar, bKash, Nagad, GitHub, npm, VS Code, GPT-4) to stay English; all **UI prose** must be Bangla numerals/Bangla words.

Checklist to reach 100%:
- [ ] Add `useLocale()` + `t()` to `app/dev/page.tsx`, `app/game/page.tsx`, `app/ide/page.tsx`, `app/ai-chat/client.tsx`, `app/dashboard/ai-studio/page.tsx`
- [ ] Replace 4 hardcodes in `dashboard/services`, 6 in `dashboard/videos`
- [ ] Set dashboard `locale` to `bn` by default (middleware or layout): `document.cookie='locale=bn'` after login
- [ ] Add missing `bn` keys for `aichat.*`, `ai-studio.*`, `settings.tabs.*`

No code changed in this audit.

---

## Appendix — Scan Command Used

```bash
grep -Rn 'Dashboard|Credit|Activate|Search|Popular|Overview|Hosting' app/dashboard --include='*.tsx' | head -200
grep -Rn 't(' app/dashboard --include='*.tsx' | wc -l
grep -Rn '[A-Za-z]{3,}' app/dashboard --include='*.tsx'  # raw hardcode scan per-file above
```
