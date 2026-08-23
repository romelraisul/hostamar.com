# AUDIENCE FILTER — Who Will Like Hostamar Videos

Hostamar has 6 products for **Bangladeshi SME / Daraz sellers** (500+ creators,
Aarong, Sailor, cosmetics shops, not Perl devs). This doc defines the audience
gate so TV only publishes videos that audience will pay for.

## 6 Product Personas

| Product | Audience | Pain | Good video example | Bad example (willLeave) |
|---|---|---|---|---|
| **Video** — AI marketing video 30s, Bangla voice, bKash | SME owner, Daraz/FB seller, 22-35, sells saree/3-piece/cosmetics | no editing skill, needs 30-sec hook "এই ঈদে..." | Daraz product video Bangla, FB Reels fashion, Eid collection, Saree product photography | Perl, generic "How to create animated videos with ai", truncated "Minu"/"Walkthr", no BD context |
| **Hosting** — BDIX 5GB 20ms | Small biz wanting WP e-commerce site, 25-40, wants 20ms Dhaka + bKash | site slow, no Bangla guide | WordPress e-commerce Bangla, "How to make website for small business Bangla", cPanel Bangla | Perl hosting, generic English hosting |
| **Chat** — AI Chat Bangla Messenger auto-reply till 11pm | Shop owner getting 100 Messenger msgs/day | can't reply manually | Messenger auto reply Bangla, FB page auto reply, chatbot for shop | "Chatbotapp 2026 Full Walkthr" truncated, no SME benefit |
| **Browser** — automation at browser.hostamar.com | Marketing agency, Daraz price tracking, 20-30 tech-savvy | manual data collection | Daraz price tracking automation, browser automation for marketers Bangla | generic browser tutorial no SME use-case |
| **IDE** — free Replit alternative /studio | BD young dev/student 18-25, wants JS/PHP for e-commerce | Replit $25 vs ৳0 | VS Code Bangla beginners, JS tutorial Bangla for e-commerce, WordPress PHP Bangla | **Perl Tutorial** — BD young devs use JS/Python/PHP, not Perl |
| **Gaming** — Free Fire tournament hosting | BD gamer 16-24, wants game server | no hosting | Free Fire tournament Bangla, game server hosting BD, PUBG organize | random gaming no hosting |

## Gate Logic (in-house llama-3.1-8b)

Prompt in `research_inhouse.py:relevance()` now asks the audience expert
model for `willPayScore` (0-10), `bestProduct`, `willLeave` (true/false),
`reason`, plus legacy `relevanceScore` alias + `keywords`/`summaryBn`.

**Rules encoded in prompt:**
- Perl / C++ / Rust / advanced Java (not JS/PHP) → `willLeave true, willPayScore 0-2, bestProduct NONE`
- Truncated title "Minu", "Walkthr" → `willLeave true`
- Daraz 11.11 old expired sale → `willLeave true`
- Generic English with no BD SME benefit/bKash/Daraz → `0-3 willLeave true`
- Good SME benefit + BD context + product photography/fashion/WordPress Bangla/Messenger/Free Fire → `7-10 willLeave false`

Normalization in code: if `willLeave true` but score >3, clamp to ≤2.
Rejection gate in `create_from_free.ts` + `full_workflow.py`:

```
OR: [{ relevanceScore: {gte: 7} }, { relevanceScore: null }]
# null = not yet researched (allowed); <7 = rejected, never published again
```

## Hunter

`lib/tv/hunter/browserTool.ts` (and `hunter_fixed.ts`) now use
**audience-focused queries only** — e.g. "Daraz product video Bangla" not
"Perl Programming". Tool-shaped `browser_search_youtube_cc({product, query})`
via camofox REST `/tabs`, CC filter `sp=EgIwAQ%3D%3D`, yt-dlp license verify.

## Removed Bad Videos (2026-08-23)

Deleted from `TvPlaylistItem` + `TvVideoStats` + `FreeVideoSource` +
`TvVideoSeo` + `FreeVideoSourceResearch` + files under `viral/*` and `free/*`,
then regenerated `playlist.host.txt`/`playlist.txt` and force-restarted ffmpeg:

- AI ভিডিও মেকার — How to create animated videos with ai
- ডেভ IDE ফ্রি — Perl Programming Tutorial: VS Code Setup
- AI ভিডিও মেকার — How to Create Stunning AI Videos in Minu
- AI চ্যাট বাংলা — Chatbotapp AI Tutorial 2026 Full Walkthr
- Daraz 11.11 sale best deals 🔥

Result: `playlist 23 → 18`, `fd` now serves `pohela-boishakh-demo.mp4`
(a good Bangladeshi cultural video, not Perl), HLS 200 `isLive:true`.

## Next

30-min round-robin automation (`tv-viral.service` → `start-viral.sh` →
`full_workflow.py --one` per product) will now only hunt/publish through
this gate. To add a new bad pattern, append its keyword to `BAD_KEYWORDS` in
`remove_bad_videos.py` and re-run with `--confirm`.
