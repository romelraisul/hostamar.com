# Marketing price correction - asset library realigned to the live plans

The Sep-29 asset library was priced against a plan set that no longer exists.
Live truth (verified 2026-10-10 from `https://hostamar.com/pricing` JSON-LD:
`"price":"0"`, `"price":"990"`, `"price":"1900"`, `"price":"2900"`):

| plan | BDT | credits/mo |
|---|---|---|
| Free (new account) | ৳0 | 6,000 start credits |
| Starter | ৳990 | 6,000 |
| Pro | ৳1,900 | 13,000 |
| Business | ৳2,900 | 30,000 |
| Bangla LLM training | ৳5,000 once | 5,000 |

## What was changed

`scripts/fix-marketing-pricing.py` (byte-level, so `\r\n` and encoding survive):

    Starter   ৳2,000 / ৳2000 / ২,০০০ টাকা  ->  ৳990 / ৳990 / ৯৯০ টাকা
    Pro       ৳3,500 / ৳3500 / ৩,৫০০ টাকা  ->  ৳1,900 / ৳1900 / ১,৯০০ টাকা
    Business  ৳6,000 / ৳6000 / ৬,০০০ টাকা  ->  ৳2,900 / ৳2900 / ২,৯০০ টাকা

* **55 files, 121 price tokens.** 52 files in pass 1 (`৳`-prefixed forms), 3 more in
  pass 2 (`N টাকা/Taka` forms: `FACEBOOK-LAUNCH-PACK.md`, `email-templates.txt`,
  `facebook-content-pack.txt`).
* Safety: the second pass is **currency-word anchored**, so legitimate credit counts
  ("৬,০০০ ক্রেডিট") are never rewritten. Only a price token followed by
  `টাকা / Taka / TK / BDT` moves.
* Re-run any time (idempotent): `python3 scripts/fix-marketing-pricing.py` (dry run)
  or `--apply`. It asserts at the end that zero stale prices remain:
  `VERIFY stale prices left: 0 file(s)`.

Originals: `/home/romel/backups/marketing-price/<timestamp>/` (outside the repo, so
the backups never ship). Revert = copy a backup directory back over the tree.

## Structural mismatches - NOT auto-changed, owner decides the copy

A price swap cannot fix these; each one is a claim decision, not a find/replace:

1. **"50% OFF / beta, first 100 customers"** (25 files: most `wa-queue/*_msg0.txt`,
   `fb_P001_launch.txt`, `fb_P005_urgency.txt`, `email_*.txt`). The live site sells
   no such promo - there is a free tier instead (৳0, 6,000 credits). Recommended
   replacement line: "নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি, কার্ড লাগবে না।"
2. **Video-quota claims** ("৫টি ভিডিও/মাস", "১০ videos", "১৫০টি") in
   `FACEBOOK-LAUNCH-PACK.md`, `email-templates.txt`, `fb_P006_tutorial.txt`,
   `facebook-content-pack.txt`. Live plans meter **credits**, not video counts. This
   is only honest if someone states the credit cost of one video; until then the
   copy should say credits. (Your call - it is a pricing statement.)
3. **"Enterprise"** plan name in `fb_P001_launch.txt`, `fb_P003_benefits.txt`,
   `email-templates.txt`, `facebook-content-pack.txt` - live set is
   Starter/Pro/Business.
4. **Missing upside:** the ৳5,000 Bangla-LLM training plan and the ৳0 free tier
   appear in **none** of the old assets. Both are live products being advertised
   nowhere.
5. `FACEBOOK-LAUNCH-PACK.md:531` still reads "৯৯০ টাকা/মাস → অফার মূল্যে মাত্র ১,০০০
   টাকা" (an "offer price" that is now above the list price) - the 50%-off framing
   again, item 1.

Once those five are decided, the asset set and `/pricing` agree line for line, which
is also what an AppSumo reviewer cross-checks (see `marketing-output/APPSUMO_LISTING.md`).
