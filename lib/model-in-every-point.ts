/**
 * MODEL IN EVERY POINT — dynamic LLM enrichment for every product surface.
 * Zero cost, survives computer off (callBestModel chain → knowledge-base
 * fallback guarantees a reply, never throws).
 *
 * Enrichers are NON-BLOCKING on failure: if the model chain is degraded the
 * caller still completes with its deterministic data — the enrichment fields
 * just come back empty. Nothing breaks, ever.
 */
import { callBestModel } from '@/lib/ai-fallback'

async function enrich(prompt: string, system: string): Promise<string> {
  try {
    const { text } = await callBestModel([{ role: 'user', content: prompt }], system)
    return (text || '').slice(0, 1200)
  } catch {
    return ''
  }
}

/** Video generate: expand the customer's short prompt into a render brief */
export function enhanceVideoPrompt(serviceName: string, userPrompt: string): Promise<string> {
  return enrich(
    `সার্ভিস: ${serviceName}\nগ্রাহকের প্রম্পট: ${userPrompt}\nএটাকে একটি বিস্তারিত ভিডিও রেন্ডার ব্রিফে রূপান্তর করুন (দৃশ্য, ভয়েসওভার লাইন, ক্যাপশন, BGM মুড)। ৮০ শব্দের মধ্যে।`,
    'You are a Bangla video prompt engineer for Hostamar 50+ AI services.',
  )
}

/** Services/orders: recommend a plan from usage stats */
export function recommendPlan(stats: { videos: number; orders: number; credits: number }): Promise<string> {
  return enrich(
    `গ্রাহকের ব্যবহার: ভিডিও ${stats.videos}টি, অর্ডার ${stats.orders}টি, ক্রেডিট ব্যালেন্স ${stats.credits}। Starter ৳599 / Pro ৳1,299 / Business ৳2,999 — কোন প্ল্যান সাজেস্ট করবেন, এক বাক্যে বাংলায়।`,
    'You are Hostamar plan advisor. One sentence, Bangla, name the plan.',
  )
}

/** Game: generate server.properties-style config for the chosen game */
export function gameConfig(gameId: string, gameName: string): Promise<string> {
  return enrich(
    `${gameName} (${gameId}) সার্ভারের জন্য একটি বেসিক server.properties কনফিগ লিখুন — motd বাংলায়, max-players 20, difficulty normal, বাকিগুলো স্ট্যান্ডার্ড। শুধু কনফিগ টেক্সট দিন।`,
    'You are a game server config generator. Output only the config.',
  )
}

/** IDE: starter file template on session create */
export function ideTemplate(type: string): Promise<string> {
  return enrich(
    `${type} IDE সেশনের জন্য একটি ছোট স্টার্টার app.js ফাইল লিখুন — Hostamar স্বাগতম বার্তা console.log করবে বাংলায়। শুধু কোড, ১০ লাইনের মধ্যে।`,
    'You are a code template generator. Output only code.',
  )
}

/** Browser: summarize a page's text */
export function summarizePage(text: string): Promise<string> {
  return enrich(
    `এই পেজের বাংলা সারাংশ ৩ বাক্যে:\n${text.slice(0, 3000)}`,
    'You are a page summarizer. Bangla, 3 sentences max.',
  )
}

/** TV: channel recommendation blurb */
export function tvRecommend(channels: string[]): Promise<string> {
  return enrich(
    `এই চ্যানেলগুলোর মধ্যে শীর্ষ ৩টি বেছে এক বাক্যে বাংলা সাজেশন দিন: ${channels.slice(0, 10).join(', ')}`,
    'You are a TV channel recommender. One sentence, Bangla.',
  )
}

/** Analytics: explain the numbers in Bangla */
export function explainAnalytics(stats: Record<string, number>): Promise<string> {
  return enrich(
    `ড্যাশবোর্ড স্ট্যাট: ${JSON.stringify(stats)}। ২ বাক্যে বাংলায় ব্যাখ্যা করুন — কী ভালো চলছে, কী বাড়ানো দরকার।`,
    'You are a business analytics explainer for Bangladeshi SMBs. Bangla, 2 sentences.',
  )
}
