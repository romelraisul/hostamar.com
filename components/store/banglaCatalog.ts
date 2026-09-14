/**
 * banglaCatalog.ts — Backend Bangla layer for the store catalog.
 * The live API (/api/services/catalog) is the source of truth for counts/prices,
 * but 56/106 services ship English-only nameBn/benefitBn/perfectForBn.
 * This map FILLS those gaps client-side; unmapped services fall back to API fields.
 * Generated from the live catalog on 2026-09-09 — ids verified against production.
 */

export interface BanglaOverride {
  nameBn: string
  benefitBn: string
  perfectForBn: string
  explainBn: string // 1-2 sentence "more explain" — what it is + why you need it
}

export const BANGLA_CATALOG: Record<string, BanglaOverride> = {
  'ad-copy': {
    nameBn: 'বিজ্ঞাপন কপি',
    benefitBn: '৩টি বিজ্ঞাপন ভ্যারিয়েন্ট + হেডলাইন',
    perfectForBn: 'বিজ্ঞাপনদাতা',
    explainBn: 'তোমার প্রোডাক্টের জন্য ৩টি রেডি-টু-ইউজ অ্যাড কপি — Facebook/Google কোথাও বসিয়ে দাও, সাথে ক্লিক-টানার হেডলাইন।',
  },
  'api-docs': {
    nameBn: 'API ডকুমেন্টেশন',
    benefitBn: 'সম্পূর্ণ এন্ডপয়েন্ট + উদাহরণসহ ডক',
    perfectForBn: 'ডেভেলপার',
    explainBn: 'তোমার API-র প্রতিটি এন্ডপয়েন্ট, রিকোয়েস্ট/রেসপন্স উদাহরণসহ — ডেভেলপাররা কনফিউশন ছাড়াই ইন্টিগ্রেট করতে পারবে।',
  },
  'ats-optimizer': {
    nameBn: 'ATS রেজিউমি অপ্টিমাইজার',
    benefitBn: 'ATS ফিল্টার পাস করার রেজিউমি',
    perfectForBn: 'চাকরিপ্রার্থী',
    explainBn: 'বড় কোম্পানির অটোমেটেড রেজিউমি ফিল্টার (ATS) পাস করার মতো করে তোমার CV সাজায় — মানুষের চোখে পড়ার আগে বটে বাদ পড়া বন্ধ।',
  },
  'audiobook-narration': {
    nameBn: 'অডিওবুক ন্যারেশন',
    benefitBn: 'অধ্যায়-ধরে-অধ্যায় পড়ে শোনানো',
    perfectForBn: 'লেখক',
    explainBn: 'তোমার বইয়ের প্রতিটি অধ্যায় প্রফেশনাল কণ্ঠে অডিওবুক বানিয়ে দেয় — বই বিক্রির নতুন মাধ্যম।',
  },
  'book-cover': {
    nameBn: 'বইয়ের কভার',
    benefitBn: 'জনরানুযায়ী সঠিক কভার ডিজাইন',
    perfectForBn: 'লেখক',
    explainBn: 'তোমার বইয়ের জনর (থ্রিলার/রোমান্স/নন-ফিকশন) বুঝে সেই বাজারে বিক্রি-হওয়া কভার বানায়।',
  },
  'brand-name': {
    nameBn: 'ব্র্যান্ড নাম আইডিয়া',
    benefitBn: '২০টি নাম + ডোমেইন চেক লিস্ট',
    perfectForBn: 'স্টার্টআপ',
    explainBn: '২০টি মনে রাখার মতো ব্র্যান্ড নাম, সাথে কোনটার .com ডোমেইন খালি আছে তার লিস্ট — নাম নিয়ে আর ভাবতে হবে না।',
  },
  'chatbot-script': {
    nameBn: 'চ্যাটবট স্ক্রিপ্ট',
    benefitBn: 'ইন্টেন্ট + ফ্লোসহ বট স্ক্রিপ্ট',
    perfectForBn: 'সাপোর্ট টিম',
    explainBn: 'কাস্টমার কী জিজ্ঞেস করবে সেই ম্যাপ + কী উত্তর দেবে তার ফ্লো — ওয়েবসাইটে বসালেই ২৪/৭ সাপোর্ট।',
  },
  'chatbot-training-data': {
    nameBn: 'চ্যাটবট ট্রেনিং ডেটা',
    benefitBn: '২০০ প্রশ্ন-উত্তর জোড়া',
    perfectForBn: 'বট মালিক',
    explainBn: 'তোমার ব্যবসার জন্য ২০০টি সঠিক প্রশ্ন-উত্তর — বটকে তোমার ব্যবসা সম্পর্কে শেখানোর রা।',
  },
  'code-explain': {
    nameBn: 'কোড ব্যাখ্যা',
    benefitBn: 'লাইন-বাই-লাইন বাংলা ব্যাখ্যা',
    perfectForBn: 'শিক্ষার্থী',
    explainBn: 'যেকোনো কোড পেস্ট করো — প্রতি লাইন কী করছে সহজ বাংলায় বুঝিয়ে দেয়। শেখার সবচেয়ে দ্রুত উপায়।',
  },
  'competitor-analysis': {
    nameBn: 'প্রতিযোগী বিশ্লেষণ',
    benefitBn: 'SWOT + পজিশনিং রিপোর্ট',
    perfectForBn: 'স্ট্র্যাটেজি টিম',
    explainBn: 'তোমার প্রতিযোগীরা কী ভালো করছে, কোথায় দুর্বল — SWOT ফ্রেমে ভেঙে দেয়, কোথায় আক্রমণ করবে সেটা পরিষ্কার হয়।',
  },
  'content-repurpose': {
    nameBn: 'কন্টেন্ট রিপারপোজ',
    benefitBn: '১টি ব্লগ → ১০টি সোশ্যাল পোস্ট',
    perfectForBn: 'কন্টেন্ট টিম',
    explainBn: 'একবার লেখা ব্লগ থেকে FB পোস্ট, লিংকডইন, টুইট, ইনস্টা ক্যাপশন — ১০টা ফরম্যাটে বানিয়ে দেয়। এক কন্টেন্ট, দশ জায়গায়।',
  },
  'content-strategy': {
    nameBn: 'কন্টেন্ট স্ট্র্যাটেজি',
    benefitBn: '৯০ দিনের কন্টেন্ট রোডম্যাপ',
    perfectForBn: 'ব্র্যান্ড',
    explainBn: 'আজ থেকে ৯০ দিন কী পোস্ট করবে, কোন দিন, কোন প্ল্যাটফর্মে — পুরো ক্যালেন্ডার। আর "আজ কী পোস্ট করি" ভাবা লাগবে না।',
  },
  'custom-gpt-guide': {
    nameBn: 'কাস্টম GPT গাইড',
    benefitBn: 'নিজের GPT বানানো + পাবলিশ',
    perfectForBn: 'AI প্রোডাক্ট মালিক',
    explainBn: 'ধাপে-ধাপে নিজের কাস্টম GPT বানানো ও ChatGPT স্টোরে পাবলিশ করার গাইড — নিজের AI প্রোডাক্ট ছাড়ার পথ।',
  },
  'email-newsletter': {
    nameBn: 'ইমেইল নিউজলেটার',
    benefitBn: 'এনগেজিং নিউজলেটার ড্রাফ্ট',
    perfectForBn: 'ইমেইল মার্কেটার',
    explainBn: 'সাবস্ক্রাইবাররা যেন পুরোটা পড়ে সেরকম নিউজলেটার — সাবজেক্ট লাইন থেকে CTA পর্যন্ত রেডি।',
  },
  'email-sequence': {
    nameBn: 'ইমেইল সিকোয়েন্স',
    benefitBn: '৫-ইমেইল নার্চার সিকোয়েন্স',
    perfectForBn: 'ফানেল বিল্ডার',
    explainBn: 'নতুন সাবস্ক্রাইবারকে ৫টি ধাপে গ্রাহক বানানোর ইমেইল সিরিজ — স্বাগতম থেকে সেল পর্যন্ত।',
  },
  'excel-formula': {
    nameBn: 'এক্সেল ফর্মুলা হেল্প',
    benefitBn: 'কাজ করা ফর্মুলা + ব্যাখ্যা',
    perfectForBn: 'অ্যানালিস্ট',
    explainBn: 'যেকোনো এক্সেল সমস্যা বলো — কাজ করা ফর্মুলা + কেন কাজ করে তার ব্যাখ্যা।',
  },
  'face-swap': {
    nameBn: 'ফেস সোয়াপ',
    benefitBn: 'সম্মতিসহ ফেস সোয়াপ (consent বাধ্যতামূলক)',
    perfectForBn: 'কন্টেন্ট টিম',
    explainBn: 'ছবিতে মুখ বদলানো — শুধুমাত্র উভয় পক্ষের লিখিত সম্মতিতে। সম্মতি ছাড়া রিকোয়েস্ট প্রত্যাখ্যাত।',
  },
  'fb-ad': {
    nameBn: 'ফেসবুক অ্যাড সেট',
    benefitBn: '৩টি অ্যাড ভ্যারিয়েন্ট + টার্গেটিং ব্রিফ',
    perfectForBn: 'FB বিজ্ঞাপনদাতা',
    explainBn: 'Facebook-এ বিক্রির জন্য ৩টি অ্যাড + কাকে টার্গেট করবে তার পূর্ণ ব্রিফ — বাজেট নষ্ট না করে সেল।',
  },
  'google-ad': {
    nameBn: 'গুগল অ্যাডস কপি',
    benefitBn: 'RSA হেডলাইন + ডেসক্রিপশন',
    perfectForBn: 'সার্চ বিজ্ঞাপনদাতা',
    explainBn: 'Google Responsive Search Ad-এর সব হেডলাইন/ডেসক্রিপশন রেডি — কোয়ালিটি স্কোর বাড়ে, CPC কমে।',
  },
  'instagram-shop': {
    nameBn: 'ইনস্টাগ্রাম শপ সেট',
    benefitBn: '৯-গ্রিড মানানসই শপ লুক',
    perfectForBn: 'IG শপ মালিক',
    explainBn: 'তোমার Instagram প্রোফাইলের ৯টি গ্রিড একই লুকে সাজানো প্ল্যান — ভিজিটর ফলো করে কেনে।',
  },
  'intro-music': {
    nameBn: 'ইন্ট্রো মিউজিক',
    benefitBn: 'কাস্টম ১০-সেকেন্ড ইন্ট্রো জিঙ্গেল',
    perfectForBn: 'চ্যানেল মালিক',
    explainBn: 'তোমার চ্যানেলের নিজস্ব সিগনেচার জিঙ্গেল — ভিডিওর শুরুতে ব্র্যান্ড রিকগনিশন।',
  },
  'jingle': {
    nameBn: 'ব্র্যান্ড জিঙ্গেল',
    benefitBn: 'মনে রাখার মতো ব্র্যান্ড জিঙ্গেল',
    perfectForBn: 'বিজ্ঞাপন',
    explainBn: 'শুনলেই মনে পড়ে যায় এমন জিঙ্গেল — রেডিও/ভিডিও বিজ্ঞাপনে ব্র্যান্ড আলাদা হয়ে যায়।',
  },
  'job-description': {
    nameBn: 'জব ডেসক্রিপশন',
    benefitBn: 'সঠিক প্রার্থী টানার বিবরণী',
    perfectForBn: 'HR টিম',
    explainBn: 'যোগ্য প্রার্থী আবেদন করতে উৎসাহিত হয় এমন JD — ভুল মানুষের আবেদন কমে, সময় বাঁচে।',
  },
  'landing-copy': {
    nameBn: 'ল্যান্ডিং পেজ কপি',
    benefitBn: 'হিরো থেকে CTA পর্যন্ত কনভার্শন কপি',
    perfectForBn: 'লঞ্চ টিম',
    explainBn: 'ভিজিটরকে গ্রাহক বানানোর পুরো পেজ কপি — প্রতিটি সেকশন কনভার্শনের জন্য লেখা।',
  },
  'linkedin-ideas': {
    nameBn: 'লিংকডইন কন্টেন্ট আইডিয়া',
    benefitBn: 'তোমার নিশে ২০টি পোস্ট আইডিয়া',
    perfectForBn: 'পার্সোনাল ব্র্যান্ড',
    explainBn: 'তোমার ইন্ডাস্ট্রিতে কী নিয়ে লিখলে এনগেজমেন্ট আসে — ২০টি রেডি আইডিয়া।',
  },
  'logo-animation': {
    nameBn: 'লোগো অ্যানিমেশন',
    benefitBn: '৫-সেকেন্ড অ্যানিমেটেড লোগো ইন্ট্রো',
    perfectForBn: 'ব্র্যান্ডিং',
    explainBn: 'স্থির লোগো নয় — চলমান, ৫ সেকেন্ডের প্রো ইন্ট্রো। ভিডিওর শুরুতে প্রিমিয়াম ফিল।',
  },
  'logo-design': {
    nameBn: 'লোগো ডিজাইন',
    benefitBn: '৩টি লোগো কনসেপ্ট + সোর্স ফাইল',
    perfectForBn: 'নতুন ব্র্যান্ড',
    explainBn: '৩টি আলাদা কনসেপ্ট থেকে বেছে নাও — সোর্স ফাইলসহ, যেখানে খুশি ব্যবহার।',
  },
  'market-research': {
    nameBn: 'মার্কেট রিসার্চ',
    benefitBn: 'মার্কেট + TAM ব্রিফ',
    perfectForBn: 'ফাউন্ডার',
    explainBn: 'তোমার আইডিয়ার বাজার কত বড়, কারা কিনবে — বিনিয়োগ/লঞ্চের আগে বাধ্যতামূলক তথ্য।',
  },
  'meditation-audiobook': {
    nameBn: 'মেডিটেশন অডিও',
    benefitBn: 'শান্ত গাইডেড মেডিটেশন',
    perfectForBn: 'ওয়েলনেস',
    explainBn: 'ক্লায়েন্টের জন্য শান্ত, গাইডেড মেডিটেশন অডিও — অ্যাপ/চ্যানেলে বসানোর মতো।',
  },
  'packaging': {
    nameBn: 'প্যাকেজিং ডিজাইন',
    benefitBn: 'প্রোডাক্ট প্যাকেজিং মকআপ',
    perfectForBn: 'প্রোডাক্ট ব্র্যান্ড',
    explainBn: 'তোমার প্রোডাক্টের বক্স/প্যাকেটের ডিজাইন মকআপ — দোকানের তাকে আলাদা দেখায়।',
  },
  'podcast-clip': {
    nameBn: 'পডকাস্ট ক্লিপ',
    benefitBn: 'এপিসোড থেকে ৫টি ভাইরাল ক্লিপ',
    perfectForBn: 'পডকাস্টার',
    explainBn: 'লম্বা এপিসোড থেকে সবচেয়ে শক্তিশালী ৫টি মুহূর্ত কেটে শর্টস/রিলস বানানো।',
  },
  'podcast-edit': {
    nameBn: 'পডকাস্ট এডিটিং',
    benefitBn: 'পরিষ্কার + লেভেল করা এপিসোড',
    perfectForBn: 'পডকাস্টার',
    explainBn: 'নয়েজ কমিয়ে, ভলিউম ঠিক করে প্রফেশনাল মানের এপিসোড — শ্রোতা ধরে রাখে।',
  },
  'press-release': {
    nameBn: 'প্রেস রিলিজ',
    benefitBn: 'মিডিয়া-রেডি প্রেস রিলিজ',
    perfectForBn: 'লঞ্চ টিম',
    explainBn: 'সংবাদমাধ্যমে পাঠানোর মতো ফরম্যাটে রিলিজ — লঞ্চ/ইভেন্টের খবর যথাযথভাবে ছড়ায়।',
  },
  'product-demo': {
    nameBn: 'প্রোডাক্ট ডেমো ভিডিও',
    benefitBn: '৬০-সেকেন্ড ডেমো + ক্যাপশন',
    perfectForBn: 'SaaS/প্রোডাক্ট',
    explainBn: '৬০ সেকেন্ডে তোমার প্রোডাক্ট কী করে দেখায় — ল্যান্ডিং পেজ/ইনভেস্টরের জন্য।',
  },
  'product-mockup': {
    nameBn: 'প্রোডাক্ট মকআপ',
    benefitBn: '৩D রিয়ালিস্টিক প্রোডাক্ট শট',
    perfectForBn: 'ই-কমার্স',
    explainBn: 'ফটোশুট ছাড়াই স্টুডিও-মানের 3D প্রোডাক্ট ছবি — দাম কম, কোয়ালিটি একই।',
  },
  'product-photoshoot': {
    nameBn: 'AI প্রোডাক্ট ফটোশুট',
    benefitBn: 'স্টুডিও-মানের AI প্রোডাক্ট ফটো',
    perfectForBn: 'ব্র্যান্ড',
    explainBn: 'ক্যামেরা ছাড়াই প্রফেশনাল লুকের প্রোডাক্ট ফটোসেট — ওয়েবসাইট/অ্যাডের জন্য।',
  },
  'prompt-pack': {
    nameBn: 'প্রম্পট প্যাক',
    benefitBn: '৫০টি কাজ-ভিত্তিক প্রম্পট',
    perfectForBn: 'AI ব্যবহারকারী',
    explainBn: 'তোমার কাজের ধরন অনুযায়ী ৫০টি টিউন-করা প্রম্পট — AI থেকে সেরা আউটপুট আনার রা।',
  },
  'proofreading': {
    nameBn: 'প্রুফরিডিং',
    benefitBn: 'গ্রামার + স্টাইল পলিশ',
    perfectForBn: 'লেখক',
    explainBn: 'ভুল, বানান, বাক্যের ছন্দ — সব ঠিক করে প্রফেশনাল লেখা।',
  },
  'sale-graphics': {
    nameBn: 'সেল গ্রাফিক্স প্যাক',
    benefitBn: 'সেল ব্যানার সেট (৫ সাইজ)',
    perfectForBn: 'ক্যাম্পেইন',
    explainBn: 'ঈদ/পূজা সেলের ব্যানার — FB, ওয়েবসাইট, স্টোর সব সাইজে।',
  },
  'seo-audit': {
    nameBn: 'SEO অডিট',
    benefitBn: 'অন-পেজ অডিট + ফিক্স লিস্ট',
    perfectForBn: 'ওয়েবসাইট মালিক',
    explainBn: 'তোমার সাইটের কোথায় SEO দুর্বল + কীভাবে ঠিক করবে — অ্যাকশন-রেডি লিস্ট।',
  },
  'seo-keyword': {
    nameBn: 'SEO কীওয়ার্ড রিসার্চ',
    benefitBn: 'কীওয়ার্ড লিস্ট + ডিফিকাল্টি + ইন্টেন্ট',
    perfectForBn: 'SEO টিম',
    explainBn: 'কোন শব্দে সার্চ হয়, কতটা কঠিন, কেনার ইচ্ছা আছে কিনা — পুরো ম্যাপ। কন্টেন্ট লেখার আগে এটা।',
  },
  'seo-meta': {
    nameBn: 'SEO মেটা ট্যাগ',
    benefitBn: 'টাইটেল + ডেসক্রিপশন + OG ট্যাগ',
    perfectForBn: 'ওয়েবসাইট',
    explainBn: 'Google-এ কেমন দেখাবে তার সেটিং — ক্লিক বাড়ে।',
  },
  'sfx': {
    nameBn: 'সাউন্ড এফেক্ট প্যাক',
    benefitBn: '১০টি কাস্টম SFX',
    perfectForBn: 'গেম/ভিডিও',
    explainBn: 'তোমার ভিডিও/গেমের জন্য আলাদা সাউন্ড — স্টক নয়, কাস্টম।',
  },
  'social-automation': {
    nameBn: 'সোশ্যাল অটোমেশন প্ল্যান',
    benefitBn: 'n8n/Zapier অটোমেশন ব্লুপ্রিন্ট',
    perfectForBn: 'সোলো ফাউন্ডার',
    explainBn: 'পোস্ট শিডিউল, রিপ্লাই, রিপোর্টিং — সব অটোমেট করার প্ল্যান। তুমি ঘুমাও, সোশ্যাল চলে।',
  },
  'sql-query': {
    nameBn: 'SQL কোয়েরি',
    benefitBn: 'অপ্টিমাইজড কোয়েরি + ইনডেক্স',
    perfectForBn: 'ডেটা টিম',
    explainBn: 'ধীর কোয়েরি দ্রুত করা + কোন ইনডেক্স লাগবে — DB-র কষ্ট কমে।',
  },
  'subtitles': {
    nameBn: 'সাবটাইটেল',
    benefitBn: 'SRT + বার্ন-ইন সাব',
    perfectForBn: 'অ্যাক্সেসিবিলিটি',
    explainBn: 'ভিডিওতে সাব বসানো — কানে না শোনা দর্শকও পায়, SEO-তেও লাভ।',
  },
  't-shirt-design': {
    nameBn: 'টি-শার্ট ডিজাইন',
    benefitBn: 'প্রিন্ট-রেডি টি গ্রাফিক',
    perfectForBn: 'মার্চ বিক্রেতা',
    explainBn: 'সরাসরি প্রিন্টে যাওয়ার মতো ডিজাইন — মকআপসহ।',
  },
  'transcription': {
    nameBn: 'ট্রান্সক্রিপশন',
    benefitBn: 'সঠিক টেক্সট ট্রান্সক্রিপ্ট',
    perfectForBn: 'মিটিং',
    explainBn: 'মিটিং/ইন্টারভিউর অডিও লিখিত রূপে — সার্চ-যোগ্য রেকর্ড।',
  },
  'translation': {
    nameBn: 'অনুবাদ EN↔BN',
    benefitBn: 'মানুষের-মানের অনুবাদ',
    perfectForBn: 'গ্লোবাল রিচ',
    explainBn: 'ইংরেজি↔বাংলা প্রাকৃতিক অনুবাদ — মেশিনি নয়, পড়তে ভালো লাগে।',
  },
  'tts-bn': {
    nameBn: 'বাংলা TTS',
    benefitBn: 'টেক্সট থেকে স্বাভাবিক BN কণ্ঠ',
    perfectForBn: 'অ্যাক্সেসিবিলিটি',
    explainBn: 'বাংলা লেখা থেকে শোনার মতো কণ্ঠ — ভিডিও/অডিওবুকে।',
  },
  'video-upscale': {
    nameBn: 'ভিডিও আপস্কেল',
    benefitBn: 'HD আপস্কেল + ডিনয়েজ',
    perfectForBn: 'পুরনো ফুটেজ',
    explainBn: 'পুরনো/কম-রেজোলিউশন ভিডিও HD-তে — ধুলোবালি মুছে পরিষ্কার।',
  },
  'voiceover': {
    nameBn: 'বাংলা ভয়েসওভার',
    benefitBn: 'প্রো BN ভয়েসওভার',
    perfectForBn: 'ভিডিও নির্মাতা',
    explainBn: 'তোমার ভিডিওর জন্য প্রফেশনাল বাংলা কণ্ঠ — স্ক্রিপ্ট দাও, ভয়েস নাও।',
  },
  'website-to-app': {
    nameBn: 'ওয়েবসাইট → অ্যাপ',
    benefitBn: 'PWA র‍্যাপার প্ল্যান + কোড',
    perfectForBn: 'ব্যবসা',
    explainBn: 'তোমার ওয়েবসাইটকে ইনস্টলযোগ্য অ্যাপে রাখার প্ল্যান+কোড — PWA পথে, ০ টাকায় মোবাইল প্রেজেন্স।',
  },
  'wp-bug': {
    nameBn: 'ওয়ার্ডপ্রেস বাগ ফিক্স',
    benefitBn: 'ডায়াগনোজ + ফিক্স গাইড',
    perfectForBn: 'সাইট মালিক',
    explainBn: 'WordPress সাইটের সমস্যা চিনে ঠিক করার গাইড — ডেভ ডাকা ছাড়াই।',
  },
  'youtube-seo': {
    nameBn: 'YouTube SEO',
    benefitBn: 'টাইটেল + ট্যাগ + ডেসক্রিপশন',
    perfectForBn: 'ক্রিয়েটর',
    explainBn: 'ভিডিওর সার্চ-বান্ধব টাইটেল/ট্যাগ/বর্ণনা — suggested-এ ঢোকার টিকিট।',
  },
  'yt-music': {
    nameBn: 'YouTube ব্যাকগ্রাউন্ড মিউজিক',
    benefitBn: 'রয়্যালটি-ফ্রি BG ট্র্যাক',
    perfectForBn: 'ক্রিয়েটর',
    explainBn: 'কপিরাইট স্ট্রাইক-ছাড়া ব্যাকগ্রাউন্ড মিউজিক — মনিটাইজেশন নিরাপদ।',
  },
}

/** Return the best-possible Bangla view of a catalog service. */
export function bnService(s: { id: string; name: string; nameBn?: string; benefit?: string; benefitBn?: string; perfectFor?: string; perfectForBn?: string }) {
  const o = BANGLA_CATALOG[s.id]
  return {
    name: o?.nameBn || s.nameBn || s.name,
    benefit: o?.benefitBn || s.benefitBn || s.benefit || '',
    perfectFor: o?.perfectForBn || s.perfectForBn || s.perfectFor || '',
    explain: o?.explainBn || '',
  }
}

/** Bangla labels for the category filter chips. */
export const CATEGORY_BN: Record<string, string> = {
  all: 'সব',
  Writing: 'লেখা',
  'Content Creator': 'কন্টেন্ট ক্রিয়েটর',
  'Digital Marketing': 'ডিজিটাল মার্কেটিং',
  'Graphics & Design': 'গ্রাফিক্স ও ডিজাইন',
  'Video': 'ভিডিও',
  'Music & Audio': 'মিউজিক ও অডিও',
  'Social Media': 'সোশ্যাল মিডিয়া',
  'E-commerce': 'ই-কমার্স',
  Business: 'ব্যবসা',
  'Professional': 'প্রফেশনাল',
  Programming: 'প্রোগ্রামিং',
  Organization: 'সংগঠন',
  Event: 'ইভেন্ট',
}
