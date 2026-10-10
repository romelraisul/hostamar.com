# AppSumo listing pack - Hostamar.com (LTD launch)

Every number here was verified live on 2026-10-10 (routes 200, catalog counts,
JSON-LD prices, OG image bytes). Claims marked (site) are the product's own
published wording; claims marked (verified) were measured in this session.

## 0. What only the owner can do (blockers, in order)

1. **Create/own the AppSumo seller account and submit the deal.** No account here;
   submission is a logged-in action on appsumo.com/partners.
2. **Add the two WAF IP Access Rules** (Cloudflare -> hostamar.com -> Security ->
   WAF -> Tools -> IP Access Rules): Allow `74.220.48.0/24` and `74.220.56.0/24`,
   notes "AppSumo/Render LTD scanner". Neither credential on this box has
   Firewall:Edit (error `10000`), so this cannot be automated from here. It is an
   IP Access Rule, **not** a WAF Skip rule - that is the documented way through
   Bot Fight Mode.
3. **Record the 60s demo video** and the dashboard screenshots from a logged-in
   session (the public pages are capturable by anyone, the dashboard is not).

## 1. Listing identity

| field | value | note |
|---|---|---|
| Product name | **Hostamar** | |
| Tagline | AI marketing videos + 176 AI models, built for Bangladesh | "176" verified live |
| Primary URL to be scanned | `https://hostamar.com/store` | |
| Category | AI / Video / Marketing | |
| OG card | title + description + `https://hostamar.com/opengraph-image.png` (200, image/png, 52,438 B) | verified - the scanner's exact requirement |
| Deal type | Lifetime (LTD), 1-3 stacking codes | |

Title field, longest first (AppSumo truncates near 60):

    Hostamar - AI Marketing Video Maker for Bangladesh            (50)
    Hostamar: AI video, 176 AI models, hosting - bKash for BD     (58)

## 2. Short description (paste-ready)

> Hostamar is a whole AI stack in one subscription for Bangladeshi businesses:
> make a marketing video in Bangla from a product photo, chat with 100+ AI models,
> host your site with a free .com domain, and pay with bKash or Nagad - no credit
> card, no foreign currency. (site)

## 3. Long description (paste-ready)

**Stop paying agencies ৳15,000 for one video.**

Hostamar turns a product photo and a Bangla sentence into a finished marketing
video: Bangla text rendering, 50+ ready templates for Eid, Boishakh and 11.11
sales, 1080p export with no watermark. Then it keeps going - the same account
hosts your website, runs a browser agent, opens an AI IDE, and gives you API
access to the model catalog.

**Everything in one login**

* **AI video maker** - photo + Bangla script -> 1080p video, no watermark (site)
* **100+ AI models** in one chat - 176 in the public catalog, 48 of them free to
  call (verified live)
* **Bangla-first** - Bangla script pickup, Bangla text on the video frame
* **Hosting** - NVMe storage on every plan, a free `.com` domain on Starter,
  free SSL on Pro and Business (site)
* **AI browser + AI IDE** on the same account (site)
* **API** - `api.hostamar.com/v1`, OpenAI-compatible, 153-176 models (site/verified)
* **Bangla LLM training** - one-time ৳5000: dataset builder + QLoRA fine-tune +
  1000 free inferences (site)
* **Pay the Bangladeshi way** - bKash, Nagad, Rocket; Stripe and PayPal for
  overseas buyers; 7-day money-back guarantee (site)

**Built for the market it sells into.** Bangla UI, Taka pricing, mobile-money
checkout, and a model router that falls back to the free cloud catalog when the
local GPU is busy - so a buyer in Dhaka gets a working product, not a demo.

**How a lifetime code works.** Codes grant account credits (1 credit = ৳1, the
site's own peg). Credits are spent on model calls, video renders and hosting;
nothing expires on a timer. Top-up is always available at the same peg.

## 4. Pricing shown on the site (verified from /pricing JSON-LD)

| plan | BDT/mo | credits/mo | what's included (site) |
|---|---|---|---|
| Starter | ৳990 | 6,000 | 10 GB NVMe, free `.com` domain, 50+ Bangla templates, 1080p no watermark |
| Pro | ৳1,900 | 13,000 | 50 GB NVMe, free SSL, API access, team of 5, 4K export |
| Business | ৳2,900 | 30,000 credits/mo | unlimited hosting, free SSL, team seats, API access, dedicated support, custom domain |
| Bangla LLM training | ৳5,000 once | 5,000 | QLoRA fine-tune + dataset builder + 1,000 inferences |
| New account | ৳0 | 6,000 (start bonus) | no card needed (site) |

USD at the site's own peg (৳126.24 = $1): Starter **$7.84**, Pro **$15.05**,
Business **$22.97**, Bangla LLM **$39.61**.

## 5. Lifetime deal - proposed structure (owner decision, not applied)

AppSumo convention is 1 code / 2 codes / 3 codes stacking. Two constraints worth
respecting:

* **Do not sell "unlimited video for life".** Video renders cost real GPU time;
  "unlimited lifetime" on a one-off payment is a loss. Sell **credits**, which the
  product already meters atomically (every cost route goes through `deductCredits`).
* **A code must be worth less than the credits it grants.** Monthly plan value:

| plan | 12 months | 24 months | 36 months |
|---|---|---|---|
| Starter 6,000 cr/mo | 72,000 cr | 144,000 cr | 216,000 cr |
| Pro 13,000 cr/mo | 156,000 cr | 312,000 cr | 468,000 cr |
| Business 30,000 cr/mo | 360,000 cr | 720,000 cr | 1,080,000 cr |

Proposal (aligns with the site's ৳ peg, keeps every code profitable in credit
terms, 24-month value framing):

| code | price | grants | ≈ USD | equivalent to |
|---|---|---|---|---|
| Tier 1 | ৳990 | 144,000 credits (24 months of Starter) | ~$7.84 | 2 years Starter credits |
| Tier 2 | ৳2,900 | 312,000 credits (24 months of Pro) | ~$22.97 | 2 years Pro credits |
| Tier 3 | ৳5,900 | 720,000 credits (24 months of Business) | ~$46.74 | 2 years Business credits |

Larger codes stack (buy 2, get 2 codes). Whatever the final numbers, the invariant
is the same: **credits granted <= 24-36 months of the matching plan's monthly
credits**, so a lifetime buyer never costs more GPU time than ~3 years of
subscription revenue buys.

## 6. Screenshots to supply (all public except where marked)

| # | shot | route | why it sells |
|---|---|---|---|
| 1 | the 176-model store grid | `/store` | "100+ models, 48 free" - hardest claim to fake |
| 2 | the 3 plans with Taka + USD | `/pricing` | price anchor, bKash/Nagad visible |
| 3 | a finished Bangla video with Eid/Boishakh template | `/generate` (login) | the actual product |
| 4 | credit meter + ledger | `/dashboard` (login) | proves metering is real |
| 5 | decision receipts / audit trail | `/dashboard/decisions` (login) | trust for business buyers |
| 6 | TV / livestream surface | `/tv` | shows the platform is more than a wrapper |
| 7 | the embeddings router line (`_router chosen_model`) | API docs / terminal | technical credibility |
| 8 | bKash/Nagad checkout | `/pricing` -> checkout (login) | the "no card" promise |

## 7. FAQ block (AppSumo reviewers read this)

* **What do I actually get with a code?** Account credits at 1 credit = ৳1, plus
  the plan features tied to the code tier. Credits spend on AI calls, video renders
  and hosting. No expiry timer.
* **Is there a free trial?** Yes - a new account gets 6,000 credits on signup, no
  card. (site)
* **Do I need a credit card?** No. bKash, Nagad and Rocket work for Bangladesh;
  Stripe and PayPal work elsewhere. (site)
* **Refunds?** 7-day money-back guarantee on the site's own plans. (site)
* **Where does it run?** The product is a hosted web app; no install. An
  OpenAI-compatible API is included for technical buyers.
* **Can I use it outside Bangladesh?** Yes; the Bangla features are the point, but
  nothing is region-locked.
* **What happens when credits run out?** Top up at the same 1 credit = ৳1 peg;
  the account and its artifacts stay.
* **Is the model catalog real?** `https://hostamar.com/api/v1/models` returns 176
  entries; `/api/v1/free-models` returns 48. Both public, no login.

## 8. Submission checklist

- [x] OG card complete on the scan target (title, description, image 52,438 B)
- [x] 13 customer routes 200, zero 503 / zero Worker-CPU kills (radar + tail ledger)
- [x] Pricing readable from the page JSON-LD (990 / 1900 / 2900)
- [x] Model counts public and current (176 / 48)
- [x] Legal pages live: privacy, terms, refund, faq
- [ ] WAF IP Access Rules for 74.220.48.0/24 + 74.220.56.0/24 (**owner**)
- [ ] AppSumo seller account + submit (**owner**)
- [ ] Screenshots 3, 4, 5, 8 from a logged-in session (**owner**)
- [ ] Demo video cut to 60s from `marketing-output/youtube-script-1.txt` (**owner**)
