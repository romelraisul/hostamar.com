#!/usr/bin/env python3
"""Make marketing-output assets tell the truth about pricing.

Live truth (verified from the app, not from these files):
  free tier 6,000 credits, no card | Starter ৳990 | Pro ৳1900 | Business ৳2900
No promo, no beta discount, no 50% OFF, no Enterprise plan, no per-plan
"videos/month" quota (video generation is metered from credits at the ৳126.24/USD peg).

Idempotent: every replacement no longer matches its own pattern, and a ZERO list
asserts none of the stale claims survive. CRLF is preserved - patterns use
[^\\r\\n]* rather than .*$ so a line ending is never eaten, and files round-trip
through UTF-8 unchanged.

  /usr/bin/python3 scripts/fix-marketing-copy-claims.py            # dry run
  /usr/bin/python3 scripts/fix-marketing-copy-claims.py --apply    # write
"""
import glob
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "marketing-output"))
APPLY = "--apply" in sys.argv

# (file globs, regex, replacement, min hits, label)
RULES = [
    # ---- 1. fake launch discounts -> the free tier that actually exists ----
    (["wa_*_msg0.txt"],
     r"🎬 Hostamar\.com is LIVE! AI video for BD creators\. 50% OFF first 100!",
     "🎬 Hostamar.com is LIVE! AI video for BD creators. নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি!",
     7, "wa cold-opener"),
    (["wa_*_1.txt", "wa-queue/*_msg0.txt", "whatsapp_ready_2.txt", "youtube/ready-yt1.txt",
      "youtube/video-metadata.json"],
     r"🎁 First 100 users: 50% OFF", "🎁 নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি", 10, "wa/blog first-100"),
    (["yt_upload_1_ready.txt"], r"💰 First 100 users get 50% OFF!",
     "💰 নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি!", 1, "yt upload desc"),
    (["email_upgrade.txt"], r"Subject: 50% OFF Upgrade Now!",
     "Subject: Hostamar upgrade — Starter ৳990 / Pro ৳1900 / Business ৳2900", 1, "email_upgrade subject"),
    (["email-queue/convert_ready.txt"], r"SUBJECT: 🔥 50% OFF ends tonight!",
     "SUBJECT: 🔥 Hostamar Starter ৳990 — upgrade today", 1, "convert_ready subject"),
    (["email-queue/convert_ready.txt"], r"🎁 50% OFF first 100 customers!",
     "🎁 নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি, কার্ড লাগবে না।", 1, "convert_ready offer"),
    (["email_free_to_paid*.txt"], r"Upgrade to Hostamar Pro - 50% OFF This Week Only!",
     "Upgrade to Hostamar Pro - Starter ৳990 / Pro ৳1900", 2, "free_to_paid subject"),
    (["email_free_to_paid*.txt"], r"🎁 Special offer: 50% OFF for first 100 customers!",
     "🎁 নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি, কার্ড লাগবে না।", 2, "free_to_paid offer"),
    (["facebook-content-pack.txt"], r"^🔥 LIMITED TIME OFFER - 50% OFF![^\r\n]*",
     "💰 প্রাইসিং: Starter ৳990 / Pro ৳1900 / Business ৳2900", 1, "content-pack header"),
    (["facebook-content-pack.txt"],
     r"^🎁 লঞ্চ অফার: প্রথম ৫০ জন ব্যবহারকারী পাচ্ছেন ৫০% ডিসকাউন্ট![^\r\n]*",
     "🎁 নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি — কার্ড লাগবে না!", 1, "content-pack offer"),
    (["fb_P001_launch.txt"], r"🎁 Beta Users: ৫০% OFF \(First 100 customers\)",
     "🎁 Free: ৬,০০০ ক্রেডিট (কার্ড লাগবে না)", 1, "fb_P001 beta offer"),
    # whatsapp-templates launch-discount block (line-anchored; ━ rules untouched)
    (["whatsapp-templates.txt"], r"Hostamar-এ এখন আপনি পাচ্ছেন Launch Discount:",
     "Hostamar-এ এখন আপনি পাচ্ছেন:", 1, "wa-tpl header"),
    (["whatsapp-templates.txt"], r"^📦 Basic[^\r\n]*",
     "🆓 Free          → ৬,০০০ ক্রেডিট ফ্রি (কার্ড লাগবে না!)", 1, "wa-tpl Basic"),
    (["whatsapp-templates.txt"], r"^📦 Pro[^\r\n]*",
     "📦 Starter       → ৳990/মাস  (৬,০০০ ক্রেডিট)", 1, "wa-tpl Pro"),
    (["whatsapp-templates.txt"], r"^📦 Enterprise[^\r\n]*",
     "💼 Business      → ৳2900/মাস  (৩০,০০০ ক্রেডিট)", 1, "wa-tpl Enterprise"),
    (["whatsapp-templates.txt"], r"^➕ Bonus: প্রথম ৫০ জন গ্রাহক পাচ্ছে Lifetime ২০% Discount![^\r\n]*",
     "➕ Pro: ৳1900/মাস (১৩,০০০ ক্রেডিট) — দ্রুত রেন্ডার, টিম সিট", 1, "wa-tpl bonus"),
    (["whatsapp-templates.txt"], r"^এই অফার শুধু এই সপ্তাহের জন্য বৈধ![^\r\n]*",
     "কার্ড ছাড়াই শুরু করুন — নতুন অ্যাকাউন্টে ৬,০০০ ক্রেডিট ফ্রি। ⏰", 1, "wa-tpl deadline"),
    (["whatsapp-templates.txt"], r'Reply "CLAIM" now to lock your discounted plan before it\'s gone!',
     'Reply "START" now to begin free — no card needed.', 1, "wa-tpl cta"),

    # ---- 2. Enterprise -> Business, and price blocks that were plain wrong ----
    (["email-templates.txt"], r"^  Pricing: Starter  ৳990/mo \| Business",
     "  Pricing: Starter ৳990/mo | Pro ৳1900/mo | Business ৳2900/mo", 1, "email-tpl header"),
    (["email-templates.txt"], r"^  Starter  — ৳990/mo \(up to 30 videos\)[^\r\n]*",
     "  Starter  — ৳990/mo (6,000 credits/mo)", 1, "email-tpl block s"),
    (["email-templates.txt"], r"^  Business — ৳1900/mo \(up to 100 videos, team seats\)[^\r\n]*",
     "  Pro      — ৳1900/mo (13,000 credits/mo, team seats)", 1, "email-tpl block p"),
    (["email-templates.txt"], r"^  Enterprise — ৳2900/mo \(unlimited, white-label option\)[^\r\n]*",
     "  Business — ৳2900/mo (30,000 credits/mo, white-label option)", 1, "email-tpl block b"),
    (["email-templates.txt"], r"এজেন্সি ডিসকাউন্ট: প্রথম ২ মাসে ২৫% ছাড়।",
     "এজেন্সি সুবিধা: Business প্ল্যানে white-label (আপনার ব্র্যান্ড) অন্তর্ভুক্ত।", 1, "email-tpl agency offer"),
    (["email-templates.txt"], r"upgraded to Enterprise by month 2\.",
     "upgraded to Business by month 2.", 1, "email-tpl case study"),
    (["email-templates.txt"], r"^  Starter  ৳990/mo  — 30 videos, basic templates[^\r\n]*",
     "  Starter  ৳990/mo  — 6,000 credits, basic templates", 1, "email-tpl reminder s"),
    (["email-templates.txt"],
     r"^  Business  ৳1900/mo — 100 videos, team accounts, priority support[^\r\n]*",
     "  Pro  ৳1900/mo — 13,000 credits, team accounts, priority support", 1, "email-tpl reminder p"),
    (["email-templates.txt"], r"^  Enterprise ৳2900/mo — unlimited, white-label, API access[^\r\n]*",
     "  Business ৳2900/mo — 30,000 credits, white-label, API access", 1, "email-tpl reminder b"),
    (["email-templates.txt"], r"^Special agency offer: Get white-label[^\r\n]*",
     "White-label (your brand on the platform) is included with the Business plan — ৳2900/mo.",
     1, "email-tpl white-label offer"),

    (["facebook-content-pack.txt"], r"^🆓 Free: 5 videos/month - \$0[^\r\n]*",
     "🆓 Free: 6,000 credits - $0", 1, "pack free"),
    (["facebook-content-pack.txt"], r"^🌟 Starter: ৳990/mo - 10 videos[^\r\n]*",
     "🌟 Starter: ৳990/mo - 6,000 credits", 1, "pack starter"),
    (["facebook-content-pack.txt"], r"^💼 Business: ৳1900/mo - 20 videos[^\r\n]*",
     "💼 Pro: ৳1900/mo - 13,000 credits", 1, "pack business->pro"),
    (["facebook-content-pack.txt"], r"^👑 Enterprise: ৳2900/mo - Unlimited[^\r\n]*",
     "👑 Business: ৳2900/mo - 30,000 credits", 1, "pack enterprise->business"),
    (["facebook-content-pack.txt"], r"✅ ফ্রি টায়ার - মাসে ৫ টি ভিডিও ফ্রি!",
     "✅ ফ্রি টায়ার — ৬,০০০ ক্রেডিট ফ্রি!", 1, "pack free bn"),

    (["fb_P001_launch.txt"], r"^💰 Free: ৫ videos/month[^\r\n]*",
     "💰 Free: ৬,০০০ ক্রেডিট", 1, "fb_P001 free"),
    (["fb_P001_launch.txt"], r"^💰 Starter: ৳৯৯০/month \(১০ videos\)[^\r\n]*",
     "💰 Starter: ৳৯৯০/month (৬,০০০ ক্রেডিট)", 1, "fb_P001 starter"),
    (["fb_P001_launch.txt"], r"^💰 Business: ৳১,৯০০/month \(৩০ videos\)[^\r\n]*",
     "💰 Pro: ৳১,৯০০/month (১৩,০০০ ক্রেডিট)", 1, "fb_P001 business->pro"),
    (["fb_P001_launch.txt"], r"^💰 Enterprise: ৳২,৯০০/month \(Unlimited\)[^\r\n]*",
     "💰 Business: ৳২,৯০০/month (৩০,০০০ ক্রেডিট)", 1, "fb_P001 enterprise->business"),

    (["fb_P003_benefits.txt"], r"^🆓 Free: ৫ videos \(Lifetime\) - \$0[^\r\n]*",
     "🆓 Free: ৬,০০০ ক্রেডিট - $0", 1, "fb_P003 free"),
    (["fb_P003_benefits.txt"], r"^💼 Starter: ৳৯৯০ \(১০ videos\)[^\r\n]*",
     "💼 Starter: ৳৯৯০ (৬,০০০ ক্রেডিট)", 1, "fb_P003 starter"),
    (["fb_P003_benefits.txt"], r"^🚀 Business: ৳১,৯০০ \(৩০ videos\)[^\r\n]*",
     "🚀 Pro: ৳১,৯০০ (১৩,০০০ ক্রেডিট)", 1, "fb_P003 business->pro"),
    (["fb_P003_benefits.txt"], r"^🏢 Enterprise: ৳২,৯০০ \(Unlimited\)[^\r\n]*",
     "🏢 Business: ৳২,৯০০ (৩০,০০০ ক্রেডিট)", 1, "fb_P003 enterprise->business"),

    # ---- 3. per-plan video quota -> credits ----
    (["facebook-content-pack.txt"], r"✅ ৫০% ডিসকাউন্ট প্রথম ৩ মাস",
     "✅ কার্ড লাগবে না — ৬,০০০ ক্রেডিট ফ্রি", 1, "pack 3-month discount"),
    (["facebook-content-pack.txt"], r"^💰 ফ্রি টায়ার - মাসে ৫ টি ভিডিও[^\r\n]*",
     "💰 ফ্রি টায়ার — ৬,০০০ ক্রেডিট", 1, "pack footer free"),
    # second pricing block in email-templates.txt (missed by the first pass)
    (["email-templates.txt"], r"^  Starter  — ৳990/mo \(up to 30 product videos\)[^\r\n]*",
     "  Starter  — ৳990/mo (6,000 credits)", 1, "email-tpl block2 s"),
    (["email-templates.txt"], r"^  Business — ৳1900/mo \(up to 100 videos \+ priority support\)[^\r\n]*",
     "  Pro      — ৳1900/mo (13,000 credits + priority support)", 1, "email-tpl block2 p"),
    (["email-templates.txt"], r"^  Enterprise — ৳2900/mo \(unlimited, custom branding\)[^\r\n]*",
     "  Business — ৳2900/mo (30,000 credits, custom branding)", 1, "email-tpl block2 b"),
    # fb_P005_urgency.txt: a whole post built on a discount that does not exist
    (["fb_P005_urgency.txt"], r"^⚡ LAST CHANCE: Beta Offer Ends Soon![^\r\n]*",
     "⚡ Hostamar এখন লাইভ — ৬,০০০ ক্রেডিট ফ্রি!", 1, "P005 head"),
    (["fb_P005_urgency.txt"], r"^🔥 ৫০% OFF Ending Soon[^\r\n]*",
     "🔥 কার্ড লাগবে না — শুরু করুন ফ্রি", 1, "P005 off"),
    (["fb_P005_urgency.txt"], r"^🔥 First 100 customers only[^\r\n]*",
     "🚀 Starter ৳৯৯০/মাস থেকে শুরু", 1, "P005 first100"),
    (["fb_P005_urgency.txt"], r"^🔥 Price increases Monday![^\r\n]*",
     "🎬 বাংলা সাপোর্ট + AI ভিডিও, মিনিটেই তৈরি", 1, "P005 fake urgency"),
    (["fb_P005_urgency.txt"], r"^❌ Without Hostamar: ৳৪,০০০[^\r\n]*",
     "❌ আউটসোর্স: প্রতি ভিডিও ৳৫,০০০+", 1, "P005 comparison"),
    (["fb_P005_urgency.txt"], r"^✅ With Hostamar: ৳৯৯০ \(অথবা Free trial!\)[^\r\n]*",
     "✅ Hostamar: ৳৯৯০/মাস (অথবা ফ্রি টায়ার — ৬,০০০ ক্রেডিট)", 1, "P005 price"),
    (["fb_P005_urgency.txt"], r"^✅ ১০ HD Videos/মাস[^\r\n]*",
     "✅ ৬,০০০ ক্রেডিট/মাস", 1, "P005 quota"),
    (["fb_P005_urgency.txt"], r"#LimitedOffer #BangladeshDeals",
     "#BangladeshDeals #VideoCreatorBD", 1, "P005 hashtags"),
    (["email_free_to_paid*.txt"], r"^- 10 HD videos/month",
     "- HD video generation, paid from your monthly credits", 2, "quota 10"),
    (["email_free_to_paid*.txt"], r"^- 30 HD videos/month",
     "- HD video generation, paid from your monthly credits (30,000 on Business)", 2, "quota 30"),
    (["fb_P006_tutorial.txt"], r"^Try Free: 5 videos/month",
     "Try Free: 6,000 credits", 1, "tutorial free"),

    # ---- 4. fabricated rating (same class of untrue claim) ----
    (["fb_P004_social.txt"], r"⭐ ৪\.৯/৫ রেটিং",
     "⭐ নতুন — প্রথম রিভিউগুলো আপনারাই দিন", 1, "fabricated rating"),

    # ---- 5. stale domain + the unadvertised Bangla-LLM offer ----
    (["*.txt", "*.json", "*.md"], r"https://hostamar\.vercel\.app",
     "https://hostamar.com", 1, "stale vercel domain"),
    # mop up a double-append from an earlier non-idempotent run (floor 0: no-op once clean)
    (["fb_launch_400k_campaign.txt"],
     r"📚 Bangla LLM ট্রেনিং[^\r\n]*\r\n\r\n📚 Bangla LLM ট্রেনিং[^\r\n]*",
     "📚 Bangla LLM ট্রেনিং: ৳5,000 (one-time) — বাংলাদেশের নিজস্ব মডেল।", 0, "bangla-llm dedupe"),
    # (?!\r\n\r\n📚) makes the append idempotent - the lookahead fails once it is already there
    (["fb_launch_400k_campaign.txt"], r"👉 https://hostamar\.(?:vercel\.app|com)/referral(?!\r\n\r\n📚)",
     "👉 https://hostamar.com/referral\r\n\r\n📚 Bangla LLM ট্রেনিং: ৳5,000 (one-time) — বাংলাদেশের নিজস্ব মডেল।",
     1, "bangla-llm line"),
]

# Claims that must not survive anywhere in marketing-output.
SKIP = {"PRICE_CORRECTION.md", "fix-marketing-copy-claims.py"}
ZERO = [
    ("50% OFF family", r"50% OFF|৫০% OFF|৫০% ডিসকাউন্ট|৫০% ছাড়|৪০% ছাড়|৩০% ছাড়|২৫% ছাড়|Lifetime ২০% Discount"),
    ("Enterprise plan", r"Enterprise|এন্টারপ্রাইজ"),
    # "client videos/month" is the agency's own volume, not a Hostamar plan quota
    ("per-plan video quota", r"(?<!client )videos/month|videos \(Lifetime\)|HD Videos/মাস|মাসে ৫ টি ভিডিও"),
    ("fake urgency/beta", r"Beta Offer|Beta Users|Price increases Monday|LimitedOffer|LAST CHANCE: "),
    ("stale vercel domain", r"hostamar\.vercel\.app"),
    ("stale prices", r"৳2,000|৳3,500|৳6,000|৳4,000/মাস|instead of ৳2900|৳4,500/mo"),
    ("unlimited plan claim", r"৳2900/mo - Unlimited|\(Unlimited\)"),
]


def targets(globs):
    seen = []
    for g in globs:
        for p in sorted(glob.glob(os.path.join(ROOT, g))):
            if os.path.isfile(p) and os.path.basename(p) not in SKIP and p not in seen:
                seen.append(p)
    return seen


def main():
    total, misses, touched = 0, [], set()
    for globs, pat, repl, minimum, label in RULES:
        rx = re.compile(pat, re.M)
        hits = 0
        example = ""
        for path in targets(globs):
            data = open(path, "rb").read().decode("utf-8")
            out, n = rx.subn(lambda m: repl, data)
            if n:
                hits += n
                touched.add(path)
                example = os.path.relpath(path, ROOT)
                if APPLY:
                    open(path, "wb").write(out.encode("utf-8"))
        total += hits
        if hits < minimum:
            misses.append(f"{label}: {hits} hits, expected >= {minimum}  ({example})")
        print(f"  {'WROTE' if APPLY else 'DRY  '} {hits:>3}  {label}")

    print(f"\n{'applied' if APPLY else 'would apply'}: {total} replacements in {len(touched)} files")
    if APPLY and misses:
        # Floors are a first-run drift check; once a file is fixed they are 0.
        # The acceptance test is the ZERO-claim check below.
        print("\nINFO - rules below their floor (already applied, or the file drifted):")
        for m in misses:
            print("  " + m)
    if not APPLY:
        print("(dry run: ZERO-claim check is only enforced with --apply)")
        return 0

    print("\nZERO-claim check (must all be 0):")
    bad = 0
    for label, pat in ZERO:
        rx = re.compile(pat)
        hits = [os.path.relpath(p, ROOT) for p in sorted(glob.glob(os.path.join(ROOT, "**", "*"), recursive=True))
                if os.path.isfile(p) and os.path.basename(p) not in SKIP
                and rx.search(open(p, "rb").read().decode("utf-8", "replace"))]
        bad += len(hits)
        print(f"  {len(hits):>3}  {label}" + (("  <-- " + ", ".join(hits[:4])) if hits else ""))
    print("\nRESULT:", "FAIL - stale claims remain" if bad
          else f"PASS - 0 stale claims, {total} replacements this pass")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
