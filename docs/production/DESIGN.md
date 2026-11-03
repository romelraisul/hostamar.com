# DESIGN — UI/UX Design System

**Version:** 4.0
**Last Updated:** 2026-11-04T04:38:00+06:00
**Status:** LIVE — 168 renders, Bengali-first

---

## Brand Colors (Verified Live)

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Green** | `#0E7C3A` | Buttons, accents, progress bars, active states |
| **Secondary Blue** | `#2563EB` | Links, info states, embeddings badge |
| **Accent Amber** | `#F59E0B` | Warnings, credit badges, payment CTAs |
| **Surface Light** | `#FFFFFF` / `#F8FAFC` | Backgrounds, cards |
| **Surface Dark** | `#0F172A` | Sidebar, footer, dark mode |
| **Text Primary** | `#0F172A` | Headings, body |
| **Text Secondary** | `#475569` | Subtext, descriptions |
| **Text Muted** | `#64748B` | Placeholders, timestamps |

---

## Typography

- **Font:** System UI stack (Inter fallback), Bangla: Noto Sans Bengali
- **Scale:** `text-xs` (11px) → `text-sm` (13px) → `text-base` (16px) → `text-lg` (18px) → `text-xl` (20px) → `text-2xl` (24px)
- **Tracking:** `tracking-widest` for section labels (CREDITS, PRODUCTS, MANAGE)

---

## Bangla-First Conventions

- All user-facing copy ships Bangla + English (e.g., "CREDITS / ক্রেডিট")
- Currency: `৳` symbol, `1cr = 1 taka` (1 credit = 1 BDT)
- bKash personal number: `01822417463` (displayed in payment flows)
- Payment plans: Starter ৳990 (6000cr), Pro ৳1,900 (13000cr), Business ৳2,900 (30000cr)
- Signup bonus: 3000cr (1cr = 1TK = 1 future HOST coin)

---

## Component Inventory (Live)

| Component | Location | Renders |
|-----------|----------|---------|
| Dashboard Sidebar | `app/dashboard/layout.tsx` | Navigation, credits bar, recent videos |
| Command Palette | `⌘K` global | Jump to Video, Dubbing, Hosting, Chat, Browser, IDE, Game, Billing |
| TV Station | `/tv` + `/tv/watch/[slug]` | 374 videos, HLS player, JSON-LD VideoObject SEO |
| Model Catalog | `/api/v1/models` → homepage | 152 models, 10 categories, 53 edge tools |
| Store | `/dashboard/store` | 124 products, bKash tokenized checkout PGW |
| Admin | `/admin` | 307→login, stats via `/api/admin/stats` (401) |

---

## Layout System

- **Dashboard:** `lg:ml-64` fixed sidebar, `pt-14` header offset
- **Mobile:** `<lg` hidden sidebar, slide-in drawer (`translate-x-full` → `translate-x-0`)
- **Header:** Sticky `top-0 z-30`, search + credits + user menu
- **Spacing:** 4px base (`gap-1` = 4px, `p-3` = 12px, `p-4` = 16px)

---

## Iconography

- **Library:** Lucide React (Code2, Command, Gamepad2, Gift, Globe, MessageCircle, Plus, Sparkles)
- **Size:** `h-4 w-4` (16px) standard, `h-8 w-8` (32px) for feature cards
- **Brand mark:** `H` in green rounded-lg for sidebar header

---

## Motion & Interaction

- **Transitions:** `transition-colors` (150ms), `transition-all` (200ms) for sidebar
- **Animations:** `animate-spin` (loading), `animate-pulse` (skeletons)
- **Hover:** `hover:bg-[#F1F5F9]`, `hover:text-[#0F172A]`, `hover:border-[#0E7C3A]/30`

---

## Accessibility

- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<button>`
- Focus rings: `outline-none` + custom focus-visible styles
- ARIA labels on icon-only buttons
- Color contrast: WCAG AA on all text/background combos

---

## Dark Mode

- Class-based on `html.dark` (not media query)
- Surfaces: `#0F172A` base, `#1E293B` elevated
- Text: `#F1F5F9` primary, `#94A3B8` secondary
- Green primary `#0E7C3A` unchanged (accessible on dark)

---

## Verified Live Metrics

- **Renders:** 168 (from models.json)
- **Edge tools:** 53
- **Categories:** 10 (text-gen, text-to-image, text-to-video, text-to-audio, img-to-text, img-to-video, video-to-text, code-gen, embedding, reranking)
- **Worker model:** `minimax/minimax-m3:free`
- **Ground model:** `llama-3.2-11b-vision-instruct`