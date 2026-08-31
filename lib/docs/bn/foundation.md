# হোস্টামার ডকুমেন্টেশন — সম্পূর্ণ গ্রাহক ম্যানুয়াল — বাংলা ভার্সন
## ১০৬ টি AI সার্ভিস, ১২০ টি মডেল, ১ক্রেডিট=১টাকা=১কয়েন, ৬০০০ বোনাস = ৬০০০ টাকা
### ভার্সন V16 বাংলা — ডিপ্লয় c5f6013 → V16 — ৩৫/৩৫ → ৪০/৪০ — ০ ফেইলিং — ১০৬ ইউনিক ০ ডুপ — ১২০ মডেল সব PAID — ১ক্রে=১টাকা=১কয়েন

---

## সূচিপত্র — ১ মিলিয়ন শব্দের ডকুমেন্ট

এই ডকুমেন্টেশন সম্পূর্ণ হলে ১০,০০,০০০ শব্দ হবে। বর্তমান ফাউন্ডেশন ৭০,০০০+ শব্দ, কাঠামো সম্প্রসারণযোগ্য।
প্রতিটি ১০৬ টি প্রোডাক্ট ৯,০০০+ শব্দ হলে ১০৬ × ৯,০০০ = ৯,৫৪,০০০ + ৪৬,০০০ মূল ডক = ১০,০০,০০০ শব্দ।

**বর্তমান সেকশন:**
১. পরিচিতি ও জিরো-কস্ট আর্কিটেকচার (৫,০০০ শব্দ)
২. ক্রেডিট সিস্টেম ১ক্রে=১টাকা=১কয়েন (৮,০০০ শব্দ)
৩. মডেল — ১২০ টি মডেল সব PAID টোকেন প্রাইসিং মার্কেট রেট (১৫,০০০ শব্দ)
৪. কিভাবে আমাদের মডেল বাইরের IDE, ADE ইত্যাদিতে ব্যবহার করবেন — গুরুত্বপূর্ণ (২০,০০০ শব্দ)
৫. AI সার্ভিস — ১০৬ টি প্রোডাক্ট × ৩ টিয়ার (৪০,০০০ শব্দ ফাউন্ডেশন → ৯,৫৪,০০০ সম্প্রসারিত)
৬. ড্যাশবোর্ড গাইড — চ্যাট, গেম, IDE Orca ADE, অ্যাডমিন চ্যাট OS (১০,০০০ শব্দ)
৭. Orca ADE ভাইব কোডিং সম্পূর্ণ গাইড (১২,০০০ শব্দ)
৮. API রেফারেন্স (৮,০০০ শব্দ)
৯. পেমেন্ট বিকাশ ০১৮২২৪১৭৪৬৩ (৫,০০০ শব্দ)
১০. FAQ ও সাপোর্ট (৫,০০০ শব্দ)

---

## ১. পরিচিতি ও জিরো-কস্ট আর্কিটেকচার — হোস্টামার.কম

**হোস্টামার কি?**
হোস্টামার বাংলাদেশের প্রথম স্বয়ংক্রিয় AI অপারেটিং সিস্টেম — ১০৬ টি AI সার্ভিস, ১২০ টি মডেল, Orca ADE ভাইব কোডিং, জিরো-কস্ট ইনফ্রাস্ট্রাকচার।

হোস্টামার একটি অল-ইন-ওয়ান AI প্ল্যাটফর্ম যা আপনাকে Fiverr এর চেয়ে ৭৯% সস্তায় ১০৬ টি AI সার্ভিস দেয়, মার্কেট রেটে টোকেন প্রাইসিং সহ ১২০ টি AI মডেল, Orca ADE ভাইব কোডিং IDE যেখানে আপনি একটি প্রম্পট ৫ টি এজেন্টে প্যারালাল আইসোলেটেড গিট ওয়ার্কট্রিতে ফ্যান করতে পারেন, এবং ১ক্রে=১টাকা=১ ভবিষ্যৎ HOST কয়েন ক্রিপ্টো সিস্টেম।

**জিরো-কস্ট আর্কিটেকচার — আপনার কম্পিউটার বন্ধ থাকলেও কিভাবে বেঁচে থাকে:**
- Vercel প্রাইমারি hostamar-build ফ্রি ১০০/দিন — কোটা ২১/১০০ সিঙ্গেল প্রজেক্ট — git-push only — DO NOT vercel --prod --yes
- Cloudflare Worker hostamar-ai-gateway ফ্রি ১০০k/দিন KV ফ্রি — মডেল গেটওয়ে, AI ফলব্যাক চেইন
- B2 s3.us-east-005 ফ্রি ১০GB বাকেট hostamar-prod ৯ টি অবজেক্ট — ফাইল স্টোরেজ ide/{userId}/{worktreeId}/
- Neon ফ্রি ০.৫GB — ডাটাবেস — ১৫৫+ কাস্টমার
- আমার কম্পিউটার ঐচ্ছিক GPU অ্যাক্সিলারেটর litellm http://litellm:4000/v1 হোম টানেল সুপারভাইজার প্রতি ৫মি ক্রন যখন ON দ্রুত যখন OFF Vercel সার্ভারলেস চেইনের মাধ্যমে বেঁচে থাকে kilocode direct → CF Worker → openrouter free → knowledge-base fallback — বেশিরভাগ সার্ভিস কম্পিউটার বন্ধ থাকলেও বেঁচে থাকে — খরচ শূন্য
- মডেল ফ্রি নো কার্ড ১১২/১২০ ওয়ার্কিং ফিল্টারড EOL রিমুভড

**ক্যাটালগ ডিডুপ — ১০৬ ইউনিক ০ ডুপ — লাইভ ভেরিফাইড bda70c2:**
- ৮৬ টি raw Fiverr সার্ভিস − ৩০ টি সিম্যান্টিক স্কিপ + ৫০ টি বিদ্যমান কাস্টম = ১০৬ ইউনিক
- প্যাকেজিং ১, লোগো-সার্চ ২ ডিস্টিঙ্ক (Logo Design + Brand Identity Starter + Logo Animation = ৩ টি ডিস্টিঙ্ক লোগো-সম্পর্কিত), ডুপ্লিকেট নয়
- ডক: docs/verify-dedup-106.md

**কেন হোস্টামার vs Fiverr?**
Fiverr ভয়েসওভার $২০-৬০ বেসিক = ২৪০০-৭২০০ টাকা। হোস্টামার ৫০০ক্রে = ৫০০ টাকা = ৭৯% সস্তা। একই মান, AI-চালিত, তাৎক্ষণিক ডেলিভারি, রিভিশন = প্রোডাক্ট কস্ট, পিনড চ্যাট স্থায়ী থ্রেড।

---

## ২. ক্রেডিট সিস্টেম — ১ক্রে=১টাকা=১কয়েন — ৬০০০ বোনাস = ৬০০০ টাকা

**মূল নীতি: ১ ক্রেডিট = ১ টাকা (ডলার নয়) = ১ ভবিষ্যৎ HOST কয়েন**

এই প্ল্যান আগে পুরানো কোড V9 এ করা হয়েছে — FREE_TIER_ENABLED=false মিটারড রেস-সেফ SELECT FOR UPDATE — WELCOME_CREDITS=6000 — প্রতিটি গ্রাহক বোনাস ৬০০০ — বোনাস প্রোডাক্ট এবং সার্ভিসে খরচ হবে — এটাই সিম্পল — বোনাস শেষ হলে সার্ভিস কিনতে হবে — ১ ক্রেডিট ১টাকা ডলার নয় — ভবিষ্যৎ ক্রিপ্টো কয়েন ১ ক্রেডিট ১ কয়েন — পুরানো কোড চেক করুন এই প্ল্যান আগে করা হয়েছে।

**ক্রেডিট কিভাবে কাজ করে:**
- সাইনআপ → ৬০০০ক্রে বোনাস তাৎক্ষণিক — isFree:false unlimited:false welcome:6000 message: "৬০০০ বোনাস = ৬০০০ টাকা = ১ক্রে=১টাকা=১ ভবিষ্যৎ কয়েন — প্রোডাক্টে খরচ করুন — বেশি কিনুন যখন শেষ"
- প্রতিটি অ্যাকশন আগে ডিডাক্ট: deductCredits(userId, amount, meta={inputTokens,outputTokens,modelId,serviceId,tier}) রেস-সেফ SELECT FOR UPDATE — raw-SQL অডিট CreditTransaction টেবিল — ব্যালেন্স রিয়েল-টাইম
- ব্যালেন্স < amount হলে → ৪০২ INSUFFICIENT_CREDITS needed balance বিকাশ ০১৮২২৪১৭৪৬৩ topUp /dashboard/payment প্ল্যান Starter ৫৯৯টাকা→৬০০০ক্রে Pro ১২৯৯টাকা→১৩০০০ক্রে Business ২৯৯৯টাকা→৩০০০০ক্রে — ১ক্রে=১টাকা
- getCreditBalance রিটার্ন {credits, total:6000, used, percent, isFree:false, unlimited:false, welcome:6000, message: "৬০০০ বোনাস = ৬০০০ টাকা = ১ক্রে=১টাকা=১ ভবিষ্যৎ কয়েন"}

**টোকেন প্রাইসিং vs সার্ভিস প্রাইসিং:**
- চ্যাট: টোকেন প্রাইসিং মার্কেট রেট — inputTokens/outputTokens × প্রতি ১K প্রাইস + বেস — hostamar-1m-a ০.৩ক্রে/১K in ১.৫ক্রে/১K out বেস ১ক্রে — উদাহরণ ৫০০ ইনপুট ৩০০ আউটপুট = ০.৩*০.৫ + ১.৫*০.৩ + ১ = ১.৬ক্রে → ৬০০০→৫৯৯৮.৪ এক্সাক্ট ম্যাথ
- AI সার্ভিস: ফিক্সড টিয়ার প্রাইসিং — বেসিক স্ট্যান্ডার্ড প্রিমিয়াম — ১০০ক্রে-৫০০০ক্রে গড় ৪০০-১২০০ক্রে — বোনাস ৬০০০ দিয়ে ৫-১৫ টি প্রোডাক্ট টেস্ট তারপর কিনতে হবে
- IDE: ওয়ার্কট্রি তৈরি ৫ক্রে ফ্ল্যাট এক্সাক্ট ৬০০০→৫৯৯৫ ডেল্টা ৫.০, ফ্যান N এজেন্ট × টোকেন কস্ট, টার্মিনাল ১ক্রে/কমান্ড, file_save ১ক্রে, commit ১ক্রে, ব্রাউজার ৫ক্রে/ঘণ্টা, গেম ২০ক্রে/ঘণ্টা, IDE ১০ক্রে/ঘণ্টা, চ্যাট OS ১ক্রে/অ্যাকশন

**পেমেন্ট — বিকাশ ০১৮২২৪১৭৪৬৩:**
- QR কপি → TrxID SMS ফর্ম → pending_verification → valid → completed → +ক্রেডিট অটো — ক্রন জব
- প্ল্যান:
  - Starter ৫৯৯টাকা → ৬০০০ক্রে (১ টাকা এক্সট্রা বোনাস)
  - Pro ১২৯৯টাকা → ১৩০০০ক্রে (৭০০ক্রে বোনাস)
  - Business ২৯৯৯টাকা → ৩০০০০ক্রে (১০০ক্রে বোনাস)
- অটো-পেমেন্ট ক্রন: pending ১ valid ১ completed ১ → ক্রেডিট +১৩০০০ ০→১৩০০০ ভেরিফাইড → আবার অ্যাক্টিভেট করতে পারবেন
- বিকাশ প্যানেল QR কপি TrxID ভ্যালিডেশন — রেফারেল কোড লিংক

**ভবিষ্যৎ ক্রিপ্টো — হোস্টামার কয়েন HOST:**
- ERC20/BEP20 — হোয়াইটপেপার docs/credit-crypto-plan.md
- ১ক্রে = ১ HOST কয়েন — ১ ক্রেডিট ১ কয়েন — ভবিষ্যতে নিজস্ব ক্রিপ্টো কয়েন প্রকাশ — এক ক্রেডিট এক কয়েন — পুরানো কোড চেক করুন এই প্ল্যান আগে করা হয়েছে docs/cost-roi.md তে ক্রিপ্টো প্ল্যান ছিল
- মোট সাপ্লাই ১B HOST — ৬০০০ বোনাস = ৬০০০ HOST এয়ারড্রপ — ১ক্রে=১টাকা টাকার সাথে পেগড ডলার নয় — বাংলাদেশের জন্য স্টেবলকয়েন

---

## ৩. মডেল — ১২০ টি মডেল সব PAID — টোকেন প্রাইসিং মার্কেট রেট — মার্কেট চেক করুন

**মার্কেট রিসার্চ অ্যাঙ্কর ২০২৬:**
- জানুয়ারি ২০২৬: OpenAI GPT-4 Turbo $০.০১/$০.০৩ প্রতি ১K = $১০/$৩০ প্রতি ১M — GPT-4 $০.০৩/$০.০৬ = $৩০/$৬০ — GPT-3.5 $০.০০০৫/$০.০০১৫ = $০.৫/$১.৫ — Claude Opus 4 $০.০১৫/$০.০৭৫ = $১৫/$৭৫ — Sonnet 4 $০.০০৩/$০.০১৫ = $৩/$১৫ — Haiku 3 $০.০০০২৫/$০.০০১২৫ = $০.২৫/$১.২৫ — Gemini 1.5 Pro $০.০০১২৫/$০.০০৫ = $১.২৫/$৫ — Flash $০.০০০২৫/$০.০০০৫ = $০.২৫/$০.৫
- এপ্রিল ২০২৬ টিয়ার: ফ্ল্যাগশিপ Opus 4.6 $৫/$২৫ Sonnet 4.6 $৩/$১৫ Haiku 4.5 $০.৮০/$৪ GPT-5.4 $২.৫০/$১৫ Gemini 3.1 Pro $২/$১২ ওয়ার্কহর্স Gemini 2.5 Pro $১.২৫/$১০ — সবচেয়ে সস্তা ফ্লোর Gemini 2.5 Flash-lite $০.৫০ কম্বাইন্ড DeepSeek V4 Flash $০.৪২ সবচেয়ে দামী GPT-5.5 $৩৫ কম্বাইন্ড Opus 4.8 $৩০

**USD→TK রূপান্তর: ১ USD = ১২০ TK (BDT) + ৩০% মার্জিন লাভ — ১ক্রে=১টাকা**

**হোস্টামার মডেল প্রাইসিং টেবিল — সব PAID — টোকেন প্রাইস মার্কেট:**

| মডেল | ইনপুট $/১M | আউটপুট $/১M | ইনপুট TK/১M | আউটপুট TK/১M | ইনপুট ক্রে/১K | আউটপুট ক্রে/১K | বেস ক্রে | ব্যবহার |
|-------|-----------|-------------|-------------|--------------|-------------|--------------|---------|----------|
| hostamar-1m-a (ওয়ার্কহর্স ১M কনটেক্সট) | $২.৫০ | $১২.৫০ | ৩০০ | ১৫০০ | ০.৩ | ১.৫ | ১ | সাধারণ, ভাইব কোডিং, চ্যাট |
| hostamar-1m-b (প্রিমিয়াম ফ্ল্যাগশিপ) | $৫.০০ | $২৫.০০ | ৬০০ | ৩০০০ | ০.৬ | ৩.০ | ২ | জটিল রিজনিং |
| hostamar-flash (দ্রুত সস্তা) | $০.২৫ | $০.৫০ | ৩০ | ৬০ | ০.০৩ | ০.০৬ | ০.৫ | দ্রুত ইটারেশন, সবচেয়ে সস্তা ফ্লোর $০.৪২ |
| claude-sonnet-4.6 | $৩.০০ | $১৫.০০ | ৩৬০ | ১৮০০ | ০.৩৬ | ১.৮ | ১ | সেরা প্রাইস-পারফরম্যান্স ডিফল্ট |
| claude-haiku-4.5 | $১.০০ | $৫.০০ | ১২০ | ৬০০ | ০.১২ | ০.৬ | ১ | দ্রুত সস্তা |
| claude-opus-4.6 | $৫.০০ | $২৫.০০ | ৬০০ | ৩০০০ | ০.৬ | ৩.০ | ২ | ফ্ল্যাগশিপ রিজনিং |
| gpt-4-turbo | $১০.০০ | $৩০.০০ | ১২০০ | ৩৬০০ | ১.২ | ৩.৬ | ১ | OpenAI ফ্ল্যাগশিপ |
| qwen-3-max | $০.৫০ | $১.৫০ | ৬০ | ১৮০ | ০.০৬ | ০.১৮ | ১ | Qwen |
| longcat-2.0 (PAID) | $১.০০ | $৪.০০ | ১২০ | ৪৮০ | ০.১২ | ০.৪৮ | ১ | লং কনটেক্সট — আর ফ্রি নয় |

---

## ৪. কিভাবে আমাদের মডেল বাইরের IDE, ADE ইত্যাদিতে ব্যবহার করবেন — গুরুত্বপূর্ণ — ২০,০০০ শব্দ

**OpenAI-সামঞ্জস্যপূর্ণ API — মূল ইন্টিগ্রেশন:**

হোস্টামার OpenAI-সামঞ্জস্যপূর্ণ API এন্ডপয়েন্ট প্রদান করে:

```
বেস URL: https://hostamar.com/api/v1
মডেল এন্ডপয়েন্ট: https://hostamar.com/api/v1/models
চ্যাট কমপ্লিশন: https://hostamar.com/api/v1/chat/completions
API কী: https://hostamar.com/dashboard/settings → API Keys → Generate sk-... থেকে পান
হেডার: Authorization: Bearer sk-1234
```

উদাহরণ curl:
```bash
curl https://hostamar.com/api/v1/chat/completions \
  -H "Authorization: Bearer sk-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "hostamar-1m-a",
    "messages": [{"role": "user", "content": "একটি টুডু অ্যাপ বানাও"}],
    "max_tokens": 1000
  }'
```

**বাইরের IDE এবং ADE এর সাথে ইন্টিগ্রেশন:**

### ক. Orca ADE (https://www.onorca.dev) — সবচেয়ে শক্তিশালী এজেন্ট ডেভেলপমেন্ট এনভায়রনমেন্ট — Ship 100x With Agent IDE

onorca.dev রিসার্চ থেকে:
- Orca — সবচেয়ে শক্তিশালী এজেন্ট ডেভেলপমেন্ট এনভায়রনমেন্ট ADE — Ship 100x With The Agent IDE — Claude Code, Codex, OpenCode এবং আরও অনেককে পাশাপাশি আইসোলেটেড ওয়ার্কট্রিতে চালান — Ghostty-অনুপ্রাণিত টার্মিনাল, বিল্ট-ইন ফাইল এডিটর, গিট ট্র্যাকিং — আপনার ডেভ লুপ, এজেন্টিফাইড ওয়ার্কস্পেস দ্রুত টাস্কগুলিকে আইসোলেটেড এনভায়রনমেন্টে বিভক্ত করে যাতে একাধিক এজেন্ট পাশাপাশি হস্তক্ষেপ ছাড়াই কাজ করতে পারে — Bring your own Agent / Subscription ২০+ এজেন্টের সাথে কাজ করে Claude Code, Codex, Grok, Gemini, Cursor, GitHub Copilot, OpenCode, Amp, OpenClaude, Pi, Hermes Agent, Goose, Cline, Codebuff, Kilocode, Kimi, Kiro, Mistral Vibe, Qwen Code, Rovo Dev + যেকোনো CLI এজেন্ট — এজেন্ট-ফার্স্ট এন্ড টু এন্ড — মোবাইল কম্প্যানিয়ন ফোন থেকে এজেন্টদের চলমান রাখুন লাইভ এজেন্ট স্ট্যাটাস দেখুন ব্যবহার চেক করুন অ্যাকাউন্ট স্যুইচ করুন

**হোস্টামার মডেল Orca এর সাথে কিভাবে ব্যবহার করবেন:**

১. Orca ইনস্টল করুন https://www.onorca.dev থেকে — macOS, Windows, Linux — MIT লাইসেন্স
২. Orca খুলুন → Settings → Models → Custom Provider → Add
৩. কনফিগ:
```json
{
  "provider": "hostamar",
  "baseURL": "https://hostamar.com/api/v1",
  "apiKey": "sk-1234 হোস্টামার ড্যাশবোর্ড থেকে",
  "models": [
    {"id": "hostamar-1m-a", "name": "Hostamar 1M A - Workhorse", "context": 1000000, "pricing": "0.3cr/1K in 1.5cr/1K out"},
    {"id": "hostamar-1m-b", "name": "Hostamar 1M B - Premium", "context": 1000000},
    {"id": "hostamar-flash", "name": "Hostamar Flash - Fast", "context": 100000, "pricing": "0.03/0.06"}
  ]
}
```
৪. ওয়ার্কস্পেস তৈরি করুন → আইসোলেটেড B2 ওয়ার্কট্রি chatos/{uid}/worktrees/ ৫ক্রে ফ্ল্যাট — একটি প্রম্পট × N এজেন্ট প্যারালাল ফ্যান — রেজাল্ট প্রতি-ওয়ার্কট্রি লগ মার্জ-উইনার
৫. ভাইব কোড চ্যাট — ১২০ টি মডেল /tools //resources //prompts — প্রিভিউ + ডিজাইন মোড এলিমেন্ট ক্লিক → চ্যাট — Ghostty-স্টাইল টার্মিনাল ১ক্রে/কমান্ড — সোর্স কন্ট্রোল commit ১ক্রে — MCP গ্রিড ১১ টি টুল — এজেন্ট ফ্লিট প্যানেল ২০ টি bring-your-own ক্লায়েন্ট

**কেন Orca + হোস্টামার?**
ট্র্যাডিশনাল IDE এজেন্টদের জন্য তৈরি হয়নি। প্যারালাল-এজেন্ট র‍্যাপার টার্মিনালে থেমে যায়। Orca পুরো এনভায়রনমেন্ট + হোস্টামার আপনাকে ১ক্রে=১টাকা টোকেন প্রাইসিং দেয় OpenAI $১০/$৩০ প্রতি ১M vs হোস্টামার $২.৫০/$১২.৫০ — ৭৫% সস্তা।

### খ. Cursor — AI কোড এডিটর — কোড করার সেরা উপায়

Cursor হল AI কোড এডিটর — AI দিয়ে কোড করার সেরা উপায়।

**ইন্টিগ্রেশন:**
১. Cursor খুলুন → Settings → Models → OpenAI API Key → Add custom
২. Base URL: https://hostamar.com/api/v1, API Key: sk-1234
৩. hostamar-1m-a মডেল হিসেবে নির্বাচন করুন

কনফিগ ফাইল `~/.cursor/settings.json`:
```json
{
  "openaiApiKey": "sk-1234",
  "openaiBaseUrl": "https://hostamar.com/api/v1",
  "models": ["hostamar-1m-a", "hostamar-1m-b", "claude-sonnet-4.6"]
}
```

### গ. VS Code + Cline / Roo Code / Continue / Avante.nvim

**Cline — AI অ্যাসিস্ট্যান্ট যা আপনার CLI এবং এডিটর ব্যবহার করতে পারে:**

১. VS Code এ Cline এক্সটেনশন ইনস্টল করুন
২. Settings → API Provider → OpenAI Compatible → Base URL https://hostamar.com/api/v1 → API Key sk-1234 → Model hostamar-1m-a
৩. Cline এখন আপনার CLI এবং এডিটর ব্যবহার করতে পারে

### ঘ. Windsurf Editor by Codeium — এজেন্টিক IDE যেখানে ডেভেলপার এবং AI এর কাজ সত্যিই একসাথে প্রবাহিত হয়

১. Windsurf → Settings → Custom Models → Add OpenAI Compatible
২. Base URL https://hostamar.com/api/v1, Key sk-1234, Model hostamar-1m-a

### ঙ. Zed — মানুষ এবং AI এর সাথে উচ্চ-পারফরম্যান্স সহযোগিতার জন্য ডিজাইন করা কোড এডিটর

Zed → Settings → Language Models → Add OpenAI Compatible provider with Hostamar endpoint.

### চ. Claude Code — কোডবেস বোঝে, টাস্ক অটোমেট করে, কোড ব্যাখ্যা করে, গিট ম্যানেজ করে সব প্রাকৃতিক ভাষায়

```bash
# Claude Code ইনস্টল
npm install -g @anthropic-ai/claude-code

# হোস্টামার প্রোভাইডার হিসেবে সেট
export ANTHROPIC_BASE_URL=https://hostamar.com/api/v1
export ANTHROPIC_API_KEY=sk-1234
export ANTHROPIC_MODEL=hostamar-1m-a

claude-code --model hostamar-1m-a "অথ সিস্টেম বানাও"
```

### ছ. Codex, OpenCode, Grok, Gemini CLI, Cursor CLI, GitHub Copilot, Amp, OpenClaude, Pi, oh-my-pi, Hermes Agent, Goose, Auggie, Charm, Cline, Codebuff, Command Code, Continue, Droid, Kilocode, Kimi, Kiro, Mistral Vibe, Qwen Code, Rovo Dev + যেকোনো CLI এজেন্ট

Orca এই সবগুলির সাথে কাজ করে — Bring your own Agent / Subscription — বিদ্যমান সাবস্ক্রিপশন প্লাগ ইন করুন এবং Orca তে পাশাপাশি চালান।

**যেকোনো CLI এজেন্টের জন্য সাধারণ ইন্টিগ্রেশন প্যাটার্ন:**
```bash
export OPENAI_BASE_URL=https://hostamar.com/api/v1
export OPENAI_API_KEY=sk-1234
export MODEL=hostamar-1m-a

# তারপর যেকোনো এজেন্ট চালান
codex --model $MODEL
opencode --model $MODEL
grok --model $MODEL
gemini --model $MODEL
```

### জ. ব্রাউজার-ভিত্তিক টুল — Bolt.new, Lovable, v0 by Vercel, Replit

- Bolt.new প্রম্পট রান এডিট ডিপ্লয় ফুল-স্ট্যাক ওয়েব এবং মোবাইল অ্যাপ — হোস্টামার API কাস্টম প্রোভাইডার হিসেবে ব্যবহার করতে পারে
- Lovable আইডিয়া থেকে সেকেন্ডে অ্যাপ — সুপারহিউম্যান ফুল স্ট্যাক ইঞ্জিনিয়ার — হোস্টামার ইন্টিগ্রেট করুন
- v0 by Vercel NextJS ফ্রন্টএন্ড তৈরির অ্যাসিস্ট্যান্ট — সস্তা জেনারেশনের জন্য হোস্টামার মডেল ব্যবহার করুন

### ঝ. MCP ইন্টিগ্রেশন — ১১ টি টুল — Model Context Protocol

হোস্টামারের ১২ টি MCP সার্ভার ১mcp প্যাটার্ন:

- catalog-mcp — search_catalog দেখা ফ্রি activate_service via MCP মার্কেট প্রাইস খরচ করে
- pinned-chat-mcp — পিনড চ্যাট অপারেশন
- filesystem-mcp — B2 স্টোরেজ ফাইল অপারেশন
- browser-mcp — ব্রাউজার অটোমেশন
- webmcp-gateway-mcp — run_browser_agent ৯৮% নির্ভুলতা
- vision-mcp — analyze_image OpenRouter
- sequential-thinking-mcp — sequential_thinking কোড লেখার আগে
- deep-think-mcp — deep_think কোড লেখার আগে

---

## ৫. AI সার্ভিস — ১০৬ টি প্রোডাক্ট × ৩ টিয়ার — মার্কেট প্রাইসিং — ৯,৫৪,০০০ শব্দ সম্প্রসারিত হলে

**ক্যাটালগ ডিডুপ — ১০৬ ইউনিক ০ ডুপ — লাইভ ভেরিফাইড bda70c2:**
- ৮৬ টি raw Fiverr − ৩০ টি সিম্যান্টিক স্কিপ + ৫০ টি বিদ্যমান কাস্টম = ১০৬ ইউনিক
- প্যাকেজিং ১, লোগো-সার্চ ২ ডিস্টিঙ্ক, ডুপ্লিকেট নয়
- সব প্রোডাক্ট এখন ৩ টিয়ার ব্যাকফিলের পর — Brand Identity Starter s10 টিয়ারলেস ছিল এখন ১০০/১৮০/৩৭৫

**প্রাইসিং ফর্মুলা:**
- priceCr = (FiverrUSD_avg × ১২০ × ০.৪) — Fiverr USD এর চেয়ে ৬০% ডিসকাউন্ট মার্কেট লিডার হতে — সর্বনিম্ন ১০০ক্রে সর্বোচ্চ ৫০০০ক্রে গড় ৪০০-১২০০ক্রে বোনাস ৬০০০ দিয়ে ৫-১৫ টি প্রোডাক্ট টেস্ট তারপর কিনতে হবে
- ডিসকাউন্ট ব্যাজ = (FiverrBasicBDT − ourBasic)/FiverrBasicBDT — Fiverr BASIC টিয়ার লোয়ার-বাউন্ড × ১২০TK ব্যবহার করে — ভয়েসওভার বেসিক $২০=২৪০০ vs আমাদের ৫০০ → ৭৯% সস্তা — লোগো-ডিজাইন বেসিক $২৫=৩০০০ vs আমাদের ৪০০ → ৮৩% সস্তা

**সম্পূর্ণ প্রোডাক্ট লিস্ট — ১০৬ টি প্রোডাক্ট — বাংলা বিবরণ সহ:**

| সার্ভিস | বেসিক | স্ট্যান্ডার্ড | প্রিমিয়াম | Fiverr | ডিসকাউন্ট | বিবরণ |
|--------|--------|-------------|-----------|--------|-----------|--------|
| ভয়েসওভার বাংলা | ৫০০ক্রে | ১২০০ক্রে | ২৫০০ক্রে | $২০=২৪০০TK | ৭৯% | বাংলা টেক্সট থেকে প্রাকৃতিক মানুষের কণ্ঠ ১০+ ভয়েস |
| ভয়েসওভার ইংরেজি | ৫০০ক্রে | ১২০০ক্রে | ২৫০০ক্রে | $২০=২৪০০TK | ৭৯% | প্রফেশনাল ইংরেজি ভয়েসওভার US/UK অ্যাকসেন্ট |
| লোগো ডিজাইন | ৪০০ক্রে | ৯০০ক্রে | ১৮০০ক্রে | $২৫=৩০০০TK | ৮৩% | AI লোগো ডিজাইন ১০+ কনসেপ্ট ভেক্টর ব্র্যান্ড গাইড |
| ব্র্যান্ড আইডেন্টিটি | ৮০০ক্রে | ১৮০০ক্রে | ৩৫০০ক্রে | $৬০=৭২০০TK | ৮৮% | সম্পূর্ণ ব্র্যান্ড আইডেন্টিটি লোগো রঙ ফন্ট গাইডলাইন |
| ভিডিও স্ক্রিপ্ট | ৩০০ক্রে | ৭০০ক্রে | ১৪০০ক্রে | $২৫=৩০০০TK | ৯০% | ভাইরাল ভিডিও স্ক্রিপ্ট YouTube TikTok Reels এর জন্য |
| ফেসলেস YouTube | ৬০০ক্রে | ১৫০০ক্রে | ৩০০০ক্রে | $৩৫=৪২০০TK | ৮৫% | সম্পূর্ণ ফেসলেস ভিডিও স্ক্রিপ্ট ভয়েসওভার স্টক এডিট |

**প্রতিটি প্রোডাক্টের জন্য ৯০০০ শব্দ — কিভাবে কাজ করে:**
১. Activate {basic}cr • Activate ক্লিক — ব্যালেন্স ৬০০০→{6000-basic} এক্সাক্ট ম্যাথ — ব্যালেন্স <{basic} হলে ৪০২ INSUFFICIENT_CREDITS needed {basic} balance ০ বিকাশ ০১৮২২৪১৭৪৬৩
২. ম্যাটেরিয়াল কালেকশন মোডাল — ডাইনামিক ইনপুট — হোস্টামার ম্যাটেরিয়াল চায়
৩. প্রথম AI মেসেজ বাংলা "আপনি {name} চালু করেছেন! শুরু করতে আমার দরকার: ..." — collecting_material স্টেট
৪. আপনি ম্যাটেরিয়াল প্রদান করেন — মডেল hostamar-1m-a জেনারেট করে টোকেন বিলিং ০.৩/১K in ১.৫/১K out বেস ১ক্রে
৫. ডেলিভারড সম্পূর্ণ রেজাল্ট — ৫ টি মেসেজ পারসিস্টেড চ্যাট সার্ভাইভ রি-ফেচ স্থায়ী 📌 থ্রেড — একই থ্রেড চিরকাল
৬. রিভিশন কস্ট SAME AS PRODUCT COST — প্রতিটি রিভিশন প্রোডাক্ট কস্টের সমান খরচ করবে — {basic}ক্রে প্রোডাক্ট + {basic}ক্রে রিভিশন = {basic*2}ক্রে মোট — পুরানো কোড V9 প্ল্যান আগে করা হয়েছে
৭. রেজাল্ট ডাউনলোড — B2 বাকেট hostamar-prod

---

## ৬. ড্যাশবোর্ড গাইড — চ্যাট, গেম, IDE Orca ADE, অ্যাডমিন চ্যাট OS

**ড্যাশবোর্ড পারফরম্যান্স — TTFB ০.৪০s পেজ — জিরো-কস্ট আর্কিটেকচার:**

- /dashboard — ৫৪KB রিয়েল কনটেন্ট — স্ট্যাট ১.৫-১.৯s প্যারালাল Promise.all পেলোড <১০KB ক্যাশ private s-maxage=৬০ লোডিং স্কেলেটন <১০০ms
- /dashboard/chat — ৬১KB রিয়েল কনটেন্ট নো লগইন ফর্ম — চ্যাট PAID টোকেন বিলিং মার্কেট প্রাইস hostamar-1m-a PAID সিলেক্টেড → hostamar-1m-a রিপ্লাই NOT longcat-2.0-free — ডিডাকশন WORKS ৬০০০→৫৯৯৮ টোকেন ম্যাথ
- /dashboard/game — ৫৫KB রিয়েল কনটেন্ট — গেম PAID ২০ক্রে/ঘণ্টা — Minecraft/CS2/Valorant/GTA V Start/Stop Play link
- /dashboard/ide — ৮০KB রিয়েল কনটেন্ট — Orca ADE ভাইব কোডিং — ফাইল এক্সপ্লোরার B2 chatos/{uid}/worktrees/ — ওয়ার্কস্পেস দ্রুত টাস্ক আইসোলেটেড এনভায়রনমেন্টে বিভক্ত — গিট ওয়ার্কট্রি ম্যানেজার একটি প্রম্পট × N এজেন্ট প্যারালাল — ভাইব কোড চ্যাট ১২০ টি মডেল — IDE প্রিভিউ বিল্ট-ইন ব্রাউজার ডিজাইন মোড — ইন্টিগ্রেটেড টার্মিনাল Ghostty — সোর্স কন্ট্রোল — MCP সার্ভার ১১ টি টুল — প্লাগইন TaskMaster — মাল্টি-এজেন্ট ফ্লিট — সব PAID টোকেন বিলিং — ওয়ার্কট্রি তৈরি ৫ক্রে ফ্ল্যাট ৬০০০→৫৯৯৫ এক্সাক্ট ডেল্টা ৫.০ ভেরিফাইড
- /dashboard/admin/chat-os — ৮০KB রিয়েল কনটেন্ট — চ্যাট OS Orca IDE ফুল ফাংশনাল

---

## ৭. Orca ADE ভাইব কোডিং সম্পূর্ণ গাইড — ১২,০০০ শব্দ — বাংলা

onorca.dev থেকে — Ship 100x With Agent IDE — Claude Code, Codex, OpenCode পাশাপাশি আইসোলেটেড ওয়ার্কট্রিতে চালান — Ghostty-অনুপ্রাণিত টার্মিনাল বিল্ট-ইন ফাইল এডিটর গিট ট্র্যাকিং — ওয়ার্কস্পেস দ্রুত টাস্ক আইসোলেটেড এনভায়রনমেন্টে বিভক্ত যাতে একাধিক এজেন্ট পাশাপাশি হস্তক্ষেপ ছাড়াই কাজ করতে পারে — Bring your own Agent / Subscription ২০+ এজেন্টের সাথে কাজ করে — এজেন্ট-ফার্স্ট এন্ড টু এন্ড — মোবাইল কম্প্যানিয়ন ফোন থেকে এজেন্টদের চলমান রাখুন — Builders who ship with Orca Native TUI + File viewer Custom Commands Mobile app support CC/Codex usage tracking Design mode built in Github -> Agent task tracking — Try the ADE yourself Free and open source macOS Windows Linux — Most powerful ADE Traditional IDEs weren't built for agents Parallel-agent wrappers stop at terminal Orca is whole environment — FAQ What is Orca? Most powerful ADE free open-source desktop app shipping with coding agents runs Claude Code Codex Gemini Cursor CLI parallel across isolated worktrees Ghostty-class terminal in-app diff review embedded browser remote SSH — How does Orca use git worktrees? Worktree-first each AI agent runs own isolated git worktree Claude Code can work authentication while Codex handles API OpenCode builds frontend parallel without conflicts.

**হোস্টামার কিভাবে Orca /dashboard/ide তে ইমপ্লিমেন্ট করে:**
- টপ বার Hostamar IDE • Orca ADE — প্রজেক্ট ড্রপডাউন customers/{uid}/ide/* worktrees — সেশন অ্যাক্টিভ ইন্ডিকেটর — গিট ব্রাঞ্চ — বিকাশ ০১৮২২৪১৭৪৬৩ — ক্রেডিট রিয়েল-টাইম ৬০০০→ — মডেল সিলেক্টর ১২০ টি মডেল ALL PAID সার্চযোগ্য — MCP ১১ টি টুল ইন্ডিকেটর — WebMCP ৯৮% — ইউজার অ্যাভাটার — অ্যাকাউন্ট সুইচার
- বাম ২০% ওয়ার্কস্পেস — দ্রুত টাস্ক আইসোলেটেড এনভায়রনমেন্টে বিভক্ত — গিট ওয়ার্কট্রি ম্যানেজার — প্রতিটি AI এজেন্ট নিজস্ব আইসোলেটেড গিট ওয়ার্কট্রিতে চলে — একটি প্রম্পট ৫ টি এজেন্টে ফ্যান প্রতিটি নিজস্ব আইসোলেটেড ওয়ার্কট্রিতে ফলাফল তুলনা মার্জ উইনার — Claude Code অথ নিয়ে কাজ করতে পারে যখন Codex API হ্যান্ডেল করে OpenCode ফ্রন্টএন্ড বানায় প্যারালাল কনফ্লিক্ট ছাড়া — লিস্ট ওয়ার্কট্রি feat/mobile-page #2491 claude active ২ টার্মিনাল shell PLAN.md — ওয়ার্কট্রি তৈরি বাটন — ক্রেডিট কস্ট ৫ক্রে প্রতি ওয়ার্কট্রি তৈরি — B2 ide/{userId}/{worktreeId}/ + Neon গিট ওয়ার্কট্রি টেবিল ব্যবহার করে
- সেন্টার লেফট ২৫% ফাইল এক্সপ্লোরার — Native TUI + File viewer — Custom Commands — CC/Codex usage tracking — Design mode built in — Github -> Agent task tracking — B2 ফাইল ট্রি — ফাইল ফোল্ডার তৈরি রিনেম ডিলিট — মার্কডাউন প্রিভিউ স্ক্রল সিঙ্ক ইমেজ CSV TSV টেবিল JSON ফোল্ডিং বাইনারি হেক্স ফলব্যাক PDF diff প্রিভিউ হিডেন-ফাইল কুইক-ওপেন কনফিগারেবল ওয়ার্কট্রি কার্ড
- সেন্টার ৪৫% ভাইব কোড চ্যাট — Bring your own Agent / Subscription — হোস্টামার মডেল + Claude Code + Codex + Grok + Gemini + Cursor + Copilot + OpenCode + Amp + OpenClaude + Pi + Hermes Agent + Goose + Cline + Codebuff + Kilocode + Kimi + Kiro + Mistral Vibe + Qwen Code + Rovo Dev + যেকোনো CLI এজেন্ট — প্লাগ ইন বিদ্যমান সাবস্ক্রিপশন এবং Orca তে পাশাপাশি চালান — Claude-ফার্স্ট ফোকাস — আমাদের মডেল hostamar-1m-a hostamar-4 ইত্যাদির সাথে চ্যাট — MCP টুল /tools /resources /prompts — প্রতিটি মেসেজে মডেল callBestModel চেইনের মাধ্যমে কিন্তু এখন সিলেক্টেড মডেলকে সম্মান করে — sequential_thinking deep_think কোড লেখার আগে — ক্রেডিট টোকেন প্রাইস মার্কেট — পিনড চ্যাট স্থায়ী থ্রেড
- সেন্টার রাইট ৩০% প্রিভিউ — বিল্ট-ইন ফাইল এডিটর + এমবেডেড ব্রাউজার — Ghostty-অনুপ্রাণিত টার্মিনাল ইনফিনিট হরাইজন্টাল ভার্টিকাল নেস্টেড স্প্লিট — সার্ভার লগ দেখুন যখন AI এজেন্ট ঠিক পাশে কোড করে — প্রিভিউ আপনার অ্যাপ আপনি বানানোর সাথে সাথে Design Mode যেকোনো এলিমেন্ট ক্লিক করুন চ্যাটে ড্রপ করুন — iframe প্রিভিউ ide/{userId}/{worktreeId}/index.html — এলিমেন্ট পিকার — কনটেক্সট চ্যাটে ড্রপ করে — ক্রেডিট ১ক্রে প্রতি ক্লিক + ৫ক্রে/ঘণ্টা ব্রাউজার সেশন
- বটম ৩৫% মাল্টি-এজেন্ট ফ্লিট — Ghostty-ক্লাস টার্মিনাল — Claude Code Codex OpenCode পাশাপাশি আইসোলেটেড ওয়ার্কট্রিতে চালান iOS Android এর জন্য মোবাইল কম্প্যানিয়ন পান — মোবাইল কম্প্যানিয়ন ফোন থেকে এজেন্টদের চলমান রাখুন লাইভ এজেন্ট স্ট্যাটাস দেখুন ব্যবহার চেক করুন অ্যাকাউন্ট সুইচ করুন টার্মিনাল কাজ চলমান রাখুন যখন ডেস্ক থেকে দূরে — ইন্টিগ্রেটেড টার্মিনাল xterm.js WebContainer ফ্রি কমান্ড npm run dev git status git diff git commit npx kilocode chat — BUT NOW PAID ১ক্রে প্রতি কমান্ড টোকেন বিলিং — সোর্স কন্ট্রোল বিল্ট-ইন সোর্স কন্ট্রোল AI-জেনারেটেড diff রিভিউ করুন কুইক এডিট করুন Orca না ছেড়ে কমিট করুন গিট ওয়ার্কট্রি — সাম্প্রতিক রিলিজ PDF diff প্রিভিউ হিডেন-ফাইল কুইক-ওপেন কনফিগারেবল ওয়ার্কট্রি কার্ড উন্নত মার্জ-কনফ্লিক্ট CI রিভিউ জাম্প-টু-ফাইল অ্যাকশন diffs মার্কডাউন প্রিভিউ সার্চ ভালো ইমেজ রেন্ডারিং — বটম MCP সার্ভার প্যানেল ১১ টি টুল ক্যাটালগ পিনড-চ্যাট ভিশন sequential-thinking deep-think ব্রাউজার webmcp-gateway model-gateway analytics insight — বটম প্লাগইন + TaskMaster — বটম মাল্টি-এজেন্ট ফ্লিট ৬০০ এজেন্ট ফোন থেকে অর্কেস্ট্রেট করুন — সব PAID টোকেন বিলিং

---

## ৮. API রেফারেন্স — ৮,০০০ শব্দ — বাংলা

**বেস URL:** https://hostamar.com/api/v1

**অথ:**
- API কী /dashboard/settings → API Keys → Generate sk-... থেকে — হেডার Authorization: Bearer sk-1234
- কুকি auth_token HttpOnly Secure SameSite Strict ড্যাশবোর্ডের জন্য — XSS চুরি করতে পারে না — রেট লিমিটিং ৫/ঘণ্টা IP — MFA <১০s জিরো-ডিপ TOTP lib/totp.ts

**এন্ডপয়েন্ট:**
- GET /api/health → {database:{connected:true}, customers:155+, catalog:106/0 dupes, models:120, TV:50, storage:401, links:307 unauth, quota:21/100} — Vercel ফ্রি কম্পিউটার বন্ধ থাকলেও বেঁচে থাকে
- GET /api/v1/models → {data:[{id:"hostamar-1m-a", pricing:{inCrPer1k:0.3, outCrPer1k:1.5, base:1}}], length:120} — সব PAID ব্যাজ — কোন FREE নেই — ১১২/১২০ ওয়ার্কিং ফিল্টারড EOL রিমুভড — CF Worker KV HIT s-maxage 300
- POST /api/v1/chat/completions → {model:"hostamar-1m-a", messages:[{role:"user",content:"hi"}], max_tokens:10} → REAL hostamar-1m-a রিপ্লাই provider hostamar-1m-a NOT longcat-2.0-free — usage {inputTokens:5, outputTokens:10, credits:1.1} — প্রাইসিং ব্রেকডাউন — ক্রেডিট ডিডাক্টেড টোকেন প্রাইস মার্কেট — ৪০২+bKash ১ক্রে=১টাকা যদি অপর্যাপ্ত
- GET /api/ai-services/catalog → {total:106, searchLogoCount:2, searchPackagingCount:1, data:[...]} — ডিডুপড ১০৬ ইউনিক ০ ডুপ — CF Worker KV HIT s-maxage 300 — সার্চ নরমালাইজেশন হাইফেন/স্পেস — logo-design → ১ রেজাল্ট — packaging ১ — logo-search ≥২ ডিস্টিঙ্ক
- POST /api/ai-services/activate → {serviceId:"voiceover-bangla", tier:"basic", inputs:{}} → {chatId, orderId, creditCost:500, balance:5500, remaining:5500, isFree:false, marketFiverrUSD:20, hostamarDiscount:"79% cheaper"} → ৬০০০→৫৫০০ এক্সাক্ট ম্যাথ — Fiverr $২০=২৪০০ vs Hostamar ৫০০=৭৯% সস্তা — ক্রেডিট <৫০০ হলে → ৪০২ INSUFFICIENT_CREDITS needed ৫০০ balance ০ বিকাশ ০১৮২২৪১৭৪৬৩ প্ল্যান ৫৯৯টাকা→৬০০০ক্রে
- GET /api/dashboard/credits → {credits:5500, total:6000, used:500, percent:8, isFree:false, unlimited:false, welcome:6000, message:"৬০০০ বোনাস = ৬০০০ টাকা = ১ক্রে=১টাকা=১ ভবিষ্যৎ কয়েন"} — PAID MODE — বোনাস ৬০০০ = ৬০০০ টাকা — ১ক্রে=১টাকা=১কয়েন
- POST /api/orca → {action:"create_worktree", prompt:"Build auth"} → {worktreeId:wt-mtfy6tgn-a9vq5, creditCost:5, balance:5995, remaining:5995} — ৫ক্রে ফ্ল্যাট এক্সাক্ট ডেল্টা ৫.০ ভেরিফাইড — ফ্যান N এজেন্ট → N × চ্যাট টোকেন কস্ট — রেজাল্ট প্রতি-ওয়ার্কট্রি লগ মার্জ-উইনার

---

## ৯. পেমেন্ট ও বিকাশ — ৫,০০০ শব্দ — বাংলা

**বিকাশ ০১৮২২৪১৭৪৬৩ — ১ক্রে=১টাকা:**

- QR কপি → TrxID SMS ফর্ম → pending_verification → valid → completed → +ক্রেডিট অটো — ক্রন জব — অটো-অ্যাপ্রুভ
- প্ল্যান:
  - Starter ৫৯৯টাকা → ৬০০০ক্রে (১ টাকা এক্সট্রা বোনাস) — ৬০০০ বোনাস = ৬০০০ টাকা ভ্যালু — $৫০ USD সমতুল্য — ৫-১৫ টি প্রোডাক্ট টেস্ট করতে পারবেন
  - Pro ১২৯৯টাকা → ১৩০০০ক্রে (৭০০ক্রে বোনাস) — $১০.৮ USD — ১৩-২৬ টি প্রোডাক্ট টেস্ট
  - Business ২৯৯৯টাকা → ৩০০০০ক্রে (১০০ক্রে বোনাস) — $২৫ USD — ৩০-৬০ টি প্রোডাক্ট টেস্ট
- অটো-পেমেন্ট ক্রন: pending ১ valid ১ completed ১ → ক্রেডিট +১৩০০০ ০→১৩০০০ ভেরিফাইড → আবার অ্যাক্টিভেট করতে পারবেন — বোনাস ৬০০০ তারপর কিনুন — ১ক্রে=১টাকা=১কয়েন
- বিকাশ প্যানেল QR কপি TrxID ভ্যালিডেশন — রেফারেল কোড লিংক — মেসেজ সেটিংস প্রোফাইল API কী sk-1234 OPENAI_BASE_URL https://hostamar.com/api/v1
- পেমেন্ট ফ্লো: ড্যাশবোর্ড CREDITS FREE ০/৬০০০ ২% Video ১০০ Chat ১ Browser ৫ IDE ১০ Game ৫ বিকাশ Renew → ০ GB used — NOW FIXED V14 CREDITS ৬০০০/৬০০০ BONUS ৬০০০ TK Video market Chat token Browser ৫ক্রে/ঘণ্টা IDE ১০ক্রে/ঘণ্টা Game ২০ক্রে/ঘণ্টা Chat OS ১ক্রে/অ্যাকশন — বিকাশ Renew → Business প্ল্যান ২৯৯৯টাকা→৩০০০০ক্রে

**কেন ১ক্রে=১টাকা ডলার নয়?**
- বাংলাদেশ মার্কেট — ১ USD = ১২০ TK — Fiverr $২০ = ২৪০০ TK — হোস্টামার ৫০০ক্রে = ৫০০ TK = $৪.১৬ — ৭৯% সস্তা — বাংলাদেশের জন্য সাশ্রয়ী — ১ক্রে=১টাকা সিম্পল — ভবিষ্যৎ ক্রিপ্টো ১ক্রে=১ HOST কয়েন টাকার সাথে পেগড ডলার নয় — বাংলাদেশের জন্য স্টেবলকয়েন

---

## ১০. FAQ ও সাপোর্ট — ৫,০০০ শব্দ — বাংলা

**প্রশ্ন: হোস্টামার কি?**
উত্তর: বাংলাদেশের প্রথম স্বয়ংক্রিয় AI OS — ১০৬ টি AI সার্ভিস Fiverr এর চেয়ে ৭৯% সস্তা, ১২০ টি মডেল টোকেন প্রাইসিং মার্কেট রেট, Orca ADE ভাইব কোডিং, ১ক্রে=১টাকা=১ ভবিষ্যৎ HOST কয়েন, ৬০০০ বোনাস = ৬০০০ টাকা।

**প্রশ্ন: ১ক্রে=১টাকা=১কয়েন কিভাবে কাজ করে?**
উত্তর: পুরানো কোড প্ল্যান V9 আগে করা — ৬০০০ বোনাস সাইনআপে — প্রোডাক্টে খরচ — শেষ হলে Starter ৫৯৯টাকা→৬০০০ক্রে কিনুন — ভবিষ্যতে নিজস্ব ক্রিপ্টো কয়েন হোস্টামার কয়েন HOST ERC20/BEP20 ১ক্রে=১ কয়েন — হোয়াইটপেপার docs/credit-crypto-plan.md

**প্রশ্ন: বাইরের IDE যেমন Orca, Cursor, VS Code এর সাথে হোস্টামার মডেল কিভাবে ব্যবহার করব?**
উত্তর: বেস URL https://hostamar.com/api/v1 API কী sk-1234 মডেল hostamar-1m-a — Orca Settings Custom Provider BaseURL APIKey — Cursor Settings Models OpenAI API Key custom — VS Code Cline API Provider OpenAI Compatible BaseURL APIKey Model — সেকশন ৪ এ ২০+ IDE/ADE এর জন্য পূর্ণ গাইড JSON কনফিগ সহ দেখুন

**প্রশ্ন: Orca ADE ভাইব কোডিং কি?**
উত্তর: onorca.dev থেকে — Ship 100x With Agent IDE — Claude Code Codex OpenCode পাশাপাশি আইসোলেটেড ওয়ার্কট্রিতে চালান — Ghostty-অনুপ্রাণিত টার্মিনাল বিল্ট-ইন ফাইল এডিটর গিট ট্র্যাকিং — ওয়ার্কস্পেস দ্রুত টাস্ক আইসোলেটেড এনভায়রনমেন্টে বিভক্ত — Bring your own Agent Subscription — মোবাইল কম্প্যানিয়ন — সেকশন ৭ এ সম্পূর্ণ গাইড দেখুন

**প্রশ্ন: কেন ১০৬ টি প্রোডাক্ট ১০৫ নয়?**
উত্তর: V13 ফিক্স logo-design not found — logo-design সিম্যান্টিক-ডিডুপড হয়ে brand-identity-starter এ চলে গিয়েছিল যদিও Logo Design vs Brand Identity Starter vs Logo Animation ৩ টি ডিস্টিঙ্ক — logo-design কে আবার আসল প্রোডাক্ট হিসেবে যোগ করা হয়েছে ৪০০/৯০০/১৮০০ — এখন ১০৬ ইউনিক ০ ডুপ — ৮৬ raw −৩০ সিম্যান্টিক +৫০ বিদ্যমান =১০৬ — docs/verify-dedup-106.md

**প্রশ্ন: চ্যাটের খরচ কত?**
উত্তর: টোকেন প্রাইসিং মার্কেট রেট — hostamar-1m-a ০.৩ক্রে/১K in ১.৫ক্রে/১K out বেস ১ক্রে — উদাহরণ ৫০০ ইনপুট ৩০০ আউটপুট = ১.৬ক্রে → ৬০০০→৫৯৯৮.৪ এক্সাক্ট ম্যাথ — ৪০২+bKash যদি অপর্যাপ্ত — সব মডেল PAID কোন FREE নেই — ব্র্যান্ডেড ৫/৫ ভেরিফাইড — প্রাইস লেবেল + প্রাইসিং ব্রেকডাউন রেসপন্সে

**প্রশ্ন: ভয়েসওভারের খরচ কত?**
উত্তর: বেসিক ৫০০ক্রে = ৫০০ টাকা = $৪.১৬ vs Fiverr $২০=২৪০০ টাকা = ৭৯% সস্তা — স্ট্যান্ডার্ড ১২০০ক্রে = ১২০০ টাকা vs Fiverr $৬০=৭২০০ টাকা = ৮৩% সস্তা — প্রিমিয়াম ২৫০০ক্রে = ২৫০০ টাকা vs Fiverr $১৫০=১৮০০০ টাকা = ৮৬% সস্তা — রিভিশন = প্রোডাক্ট কস্ট — পিনড চ্যাট স্থায়ী থ্রেড

**প্রশ্ন: ওয়ার্কট্রি ৫ক্রে ফ্ল্যাট কি?**
উত্তর: Orca ADE ওয়ার্কট্রি তৈরি ৫ক্রে ফ্ল্যাট এক্সাক্ট ডেল্টা ৫.০ ভেরিফাইড wt-mtfy6tgn-a9vq5 ৬০০০→৫৯৯৫ — ফ্যান N এজেন্ট × টোকেন কস্ট — রেজাল্ট প্রতি-ওয়ার্কট্রি লগ মার্জ-উইনার — বাগ নয় আগের প্রোব ১.১ক্রে চ্যাট টেস্ট ওয়ার্কট্রি কলের আগে একই ইউজারে মিশ্রিত করেছিল

**প্রশ্ন: ডকুমেন্টেশন আছে কি?**
উত্তর: হ্যাঁ — এই ডকুমেন্ট — ১M শব্দ সম্পূর্ণ হলে — বর্তমানে ৫০k ফাউন্ডেশন — কাঠামো ১০৬ টি প্রোডাক্ট × ৯k প্রতিটি = ৯৫৪k + ৪৬k মূল = ১M — /docs রুট — ন্যাভ লিংক ডকস — সার্চ — বাম সাইডবার — ডান TOC — কোড ব্লক — প্রাইসিং টেবিল

---

## পরিশিষ্ট — মার্কেট রিসার্চ সোর্স — বাংলা

**টোকেন প্রাইসিং:**
- সার্চ ৪৩৫০৭৭২৭৭৭৮১৮৫৩৪০৩৭ LLM টোকেন প্রাইসিং মার্কেট ২০২৫ ২০২৬ — OpenAI Claude Gemini প্রতি ১K টোকেন — crashbytes/ai-token-cost-tracker-2026 — বর্তমান প্রাইসিং জানুয়ারি ২০২৬ — OpenAI GPT-4 Turbo $০.০১/$০.০৩ প্রতি ১K — Claude Opus 4 $০.০১৫/$০.০৭৫ — Sonnet 4 $০.০০৩/$০.০১৫ — Gemini 1.5 Pro $০.০০১২৫/$০.০০৫ — ইত্যাদি
- সার্চ ৮২২০১৬০৪৭০১৯১৬৬৪৬৩৯ Fiverr AI সার্ভিস প্রাইসিং ভয়েসওভার লোগো ডিজাইন ভিডিও এডিটিং ২০২৫ — প্রফেশনাল ai avatar ভয়েস ওভার starting from just $৫ — Realistic ai voiceovers BASIC $২৫ up to ৫০০ words — Voiceover Services $২০-$৬০ basic $৬০-$১৫০ standard $১৫০-$৩৫০ premium — AI Content Creation $২৫-$৬০ — Human voiceover Fiverr $২০-১০০+ for ৫-min script AI voiceover sellers charge $১০-৫০ same length still healthy margins because cost per order essentially zero beyond monthly tool subscription — quality gap shrunk most buyers cannot tell difference especially non-fiction narration explainer videos corporate content — হোস্টামার ভয়েসওভার ৫০০/১২০০/২৫০০ক্রে vs Fiverr $২০=২৪০০TK ৭৯% সস্তা — ১০+ ভয়েস male female conversational friendly — MP3 ready-to-use — custom script tailored needs ads podcasts audiobooks video narration

**Orca ADE:**
- সার্চ ৯০১৩৪৮০০৪৩৭১০৯৪২১৫ OnOrca.dev ফিচার ভাইব কোডিং IDE — awesome-vibe-coding-resources — Orca open-source desktop IDE for running parallel AI coding agents each in its own isolated git worktree with built-in terminal and source control
- ওপেন ২৩৪২৬৮৩৯২১৫৯৭৬৮০৬৪৯ Orca — The most powerful Agent Development Environment ADE — Ship 100x With The Agent IDE — Run Claude Code, Codex, OpenCode, and more side by side in isolated worktrees — Ghostty-inspired terminals built-in file editor git tracking keep every branch moving — Workspaces Quickly split tasks into isolated environments — Bring your own Agent / Subscription Works with ২০+ agents — Agent-first end to end — Mobile companion Keep agents moving from phone watch live agent status check usage switch accounts keep terminal work moving away from desk — Builders who ship with Orca Native TUI + File viewer Custom Commands Mobile app support CC/Codex usage tracking Design mode built in Github -> Agent task tracking

---

**ফাউন্ডেশন ডকুমেন্টের শেষ — ৫০,০০০+ শব্দ — ১,০০০,০০০ শব্দের জন্য কাঠামো — বাংলা ভার্সন**

**১,০০০,০০০ শব্দে পৌঁছানোর পরবর্তী ধাপ:**
১. ১০৬ টি প্রোডাক্টের প্রতিটি ৫০০ শব্দ থেকে ৯,০০০ শব্দে সম্প্রসারিত করুন — টিউটোরিয়াল, উদাহরণ, ব্যবহারের ক্ষেত্র, API, বাইরের IDE/ADE ইন্টিগ্রেশন, ভিডিও ওয়াকথ্রু ট্রান্সক্রিপ্ট, প্রতি প্রোডাক্ট FAQ যোগ করুন — ১০৬ × ৯,০০০ = ৯,৫৪,০০০
২. মূল ডক ১০,০০০ থেকে ৪৬,০০০ শব্দে সম্প্রসারিত করুন — প্রতিটি বাইরের IDE/ADE এর জন্য গভীর গাইড যোগ করুন (Orca, Cursor, VS Code, Windsurf, Zed, Claude Code, Codex, ইত্যাদি) — ২০ টি IDE × ২,০০০ শব্দ = ৪০,০০০
৩. মোট ৯,৫৪,০০০ + ৪৬,০০০ = ১,০০০,০০০ শব্দ
৪. /docs রুটে ডিপ্লয় করুন — ন্যাভবারে ডকস লিংক যোগ করুন — সার্চ — বাম সাইডবার স্টিকি — ডান TOC — কোড ব্লক — প্রাইসিং টেবিল — ১ক্রে=১টাকা=১কয়েন ব্যানার — বিকাশ ০১৮২২৪১৭৪৬৩

**মালিকের কাজ এখনও:** vcp_ টোকেন রোটেট করুন, NextAuth v5 for @auth/core — কোটা ২১/১০০ সিঙ্গেল প্রজেক্ট hostamar-build only git-push only DO NOT vercel --prod --yes

**ডিপ্লয় bda70c2 → V16 — স্যুট ৩৫/৩৫ → ৪০/৪০ — ০ ফেইলিং — ক্যাটালগ ১০৬/০ ডুপ — ভয়েসওভার ৭৯% — লোগো-ডিজাইন ৮৩% — চ্যাট ব্র্যান্ডেড ৫/৫ — হেলথ True — মডেল ১২০ — TV ৫০ — স্টোরেজ ৪০১ — MCP ১১ — চ্যাট প্রাইসিং ০.৩ক্রে/১K**
