# DESIGN — Frontend design system: existing pages, layout conventions, Bangla+English bilingual rules.

## Pages that exist (grounded in `app/`)

- **Homepage `/`** — marketing surface; catalog stats come from `/models.json` v40
  (152 models, 10 categories, 53 edge_tools, renders=168) and must stay in sync with it.
- **`/tv`** — 24/7 AI TV station: HLS player (hls.js), now-playing bar, channels grid,
  EPG feed (`/api/tv/epg.xml`), `iptv.m3u` playlist, `/tv/live` live route. Own
  `app/tv/layout.tsx` with video-first chrome (player top, minimal nav).
- **`/tv/watch/[slug]`** — per-video SEO watch pages emitting **VideoObject JSON-LD**
  (name, description, thumbnail, uploadDate, contentUrl pointing at the B2/CDN delivery
  URL) so each video is independently indexable.
- **`/admin`** — operator dashboard (role-gated ADMIN); `/dashboard` — customer area.
- Supporting surfaces in the App Router: `/blog`, `/docs`, `/download`, `/gallery`,
  `/pricing`-style store pages, `/bkash` (checkout surface — payments PENDING).

## Audience: Bangla + English

- Bangla-first: every user-facing string has a Bangla path; all Bangla strings live in
  the i18n dictionary (`i18n-dict.ts`, ~173KB) — never hardcode Bengali text inline.
- Fonts: **Hind Siliguri** for Bangla (fallback Noto Sans Bengali, packaged via
  `@fontsource/noto-sans-bengali`), **Inter** for Latin, JetBrains Mono for code.
- Numbers and dates stay Latin digits; keep line-height generous for Bangla conjuncts.
- Bangla text MUST render in Hind Siliguri — never fall back to a Latin font.

## Brand tokens (carried over from the established system)

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| Primary | `#0E7C3A` | `#10B981` | Primary buttons, links, active states, focus rings |
| Secondary | `#1A1A1A` | `#F5F5F5` | Text primary, headings |
| Accent | `#FF6B00` | `#FF8C00` | Payment CTAs ONLY (bKash) |
| Background | `#FFFFFF` | `#0D0D0D` | Page/card backgrounds |
| Surface | `#F9FAFB` | `#1A1A1A` | Card surfaces, inputs |
| Border | `#E5E7EB` | `#374151` | Dividers, input borders |
| Success / Warning / Error | `#059669` / `#D97706` / `#DC2626` | `#10B981` / `#F59E0B` / `#EF4444` | Status states |

- Base spacing unit 4px; radius 10px cards (`rounded-lg`), 8px buttons/inputs
  (`rounded-md`), 14px elevated cards, pill 9999px for badges.
- Tailwind 3.4.1, `darkMode: 'class'` on `<html>`, theme persisted in
  `localStorage.theme` (light | dark | system), system default on first visit.
- All components use Tailwind classes, no inline styles; globals.css is the single
  source of global styles; focus rings `ring-2` in primary green.

## Layout conventions

- Dashboard/admin chrome: top bar (56px) + collapsible sidebar (240px, icons-only on
  collapse), active route marked with a 3px primary left border, breadcrumbs on subpages.
- Responsive: single column <640px, drawer sidebar <1024px, full sidebar ≥1024px;
  all interactive targets ≥44×44px; skeletons for data loads, not spinners.
- TV pages optimize for 3G: lazy HLS attach, short cache on manifests, poster before play.
- Green is primary/positive; red is reserved for errors/destructive actions — do not
  regress the button contrast fixes (green button + black text).

## Rules

- No placeholder text ships; Bangla copy reviewed by the owner.
- Reuse the ~25 components already in `/components/` (Button, Card, Table, Modal,
  Toast, Skeleton, ...) before writing anything new.
- SEO surfaces (sitemap.ts, robots.ts, VideoObject JSON-LD) are extended, never forked.
- Dark mode is first-class: every new surface defines both token columns.
