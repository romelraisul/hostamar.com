/**
 * Video Generation Service - DEMO/MOCK MODE
 * Works without any external API keys
 * Returns pre-made templates and mock results
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com';
const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '');

const DEMO_SCRIPTS = [
  {
    title: "আপনার ব্যবসার সাফল্যের গল্প",
    hook: "আপনি কি জানেন আপনার বিজনেস কতটা বড় হতে পারে?",
    mainContent: [
      "আমরা Hostamar-এর মাধ্যমে হাজারো ব্যবসায়ীকে帮助他们帮助他们帮助他们帮助他们帮助他们帮助他们帮助他们",
      "AI ভিডিও জেনারেশন এখন সবার জন্য সহজলভ্য",
      "মাত্র ৫ মিনিটে প্রফেশনাল ভিডিও তৈরি করুন"
    ],
    callToAction: `এখনই শুরু করুন ${SITE_DOMAIN}`,
    duration: 45
  },
  {
    title: "প্রোডাক্ট প্রমোশন ভিডিও",
    hook: "নতুন প্রোডাক্ট? এভাবেই দেখান!",
    mainContent: [
      "আপনার প্রোডাক্টের সেরা ফিচারগুলো হাইলাইট করুন",
      "ভিডিওতে প্রোডাক্ট ইউজ করা দেখান",
      "কল টু অ্যাকশন দিন"
    ],
    callToAction: `আজই ভিডিও তৈরি করুন → ${SITE_DOMAIN}`,
    duration: 30
  }
];

export async function generateVideoScript(params: any) {
  // Return demo script (no API key needed)
  const idx = Math.floor(Math.random() * DEMO_SCRIPTS.length);
  const script = DEMO_SCRIPTS[idx];
  
  console.log('[Demo Mode] Generated script:', script.title);
  return {
    ...script,
    _demo: true,
    _note: 'Demo script - replace with real AI when API key is configured'
  };
}

export async function generateVoiceOver(text: string, outputPath: string) {
  console.log('[Demo Mode] Voice-over would be generated here');
  return outputPath;
}

export async function composeVideo(script: any, params: any, outputPath: string) {
  console.log('[Demo Mode] Video composition skipped (no ffmpeg on serverless)');
  return outputPath;
}

export async function uploadVideo(filePath: string, customerId: string) {
  // Return mock URL
  const mockUrl = `${SITE_URL}/demo-videos/${customerId}/demo-${Date.now()}.mp4`;
  console.log('[Demo Mode] Mock upload URL:', mockUrl);
  return mockUrl;
}

export async function generateMarketingVideo(params: any) {
  console.log(`[Demo Mode] Generating marketing video for ${params.businessName}...`);
  
  const script = await generateVideoScript(params);
  const videoUrl = `${SITE_URL}/demo-videos/${params.customerId}/demo-${Date.now()}.mp4`;
  
  return {
    videoUrl,
    script,
    _demo: true,
    _message: 'Demo mode active. Configure GITHUB_TOKEN or ELEVENLABS_API_KEY in .env for real video generation.'
  };
}

export async function suggestVideoTopics(businessName: string, industry: string) {
  return [
    `আপনার ব্যবসার গল্প: ${businessName}`,
    `কেন ${industry} সেক্টরে ${businessName} সেরা`,
    `${businessName}-এর সেবা কীভাবে আপনার জীবন বদলাবে`,
    `${industry} টিপস: ${businessName} থেকে শিখুন`,
    `${businessName} কাস্টমারদের সাফল্যের গল্প`,
    `${industry} ২০২৬: ${businessName}-এর ভিশন`,
    `${businessName} প্রোডাক্ট আনবক্সিং`,
    `${industry} বিশেষজ্ঞ ${businessName}-এর পরামর্শ`,
    `${businessName} অফার: বিশেষ ডিসকাউন্ট`,
    `কেন ${businessName} বেছে নেবেন? ৫টি কারণ`
  ];
}
