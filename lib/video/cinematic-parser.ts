/**
 * lib/video/cinematic-parser.ts — V106
 *
 * Customer-typed English prompts ("Use stock footage of: programmers coding,
 * Anthropic office..." / "Globalization FAILED reel") are SEARCH QUERIES, not
 * captions. Routing them to the canvas as-is produced the black Reel 4/4 —
 * the literal search text was burnt in as on-screen Bangla caption (and the
 * render then got clobbered by a browser-side WEBM export).
 *
 * parseRawPromptToCinematic() converts a raw English prompt into 6 cinematic
 * scenes (anamorphic golden hour, 768x1344, 35mm film grain) with a Bangla
 * story-arc caption per scene. Caller: worker's buildScenes() falls through
 * to this when the brief doesn't match its known topic branches.
 *
 * Ponytail: pure function, no deps, no LLM call. Pattern-match on the raw
 * prompt; falls back to the Globalization template. Add a real parser
 * (LLM-driven) only when this template approach plateaus.
 */

export interface CinematicScene {
  visual: string          // Qwen 2.1 prompt — anamorphic golden hour film grain
  caption: string         // HostamarBangla caption, Bangla story NOT raw prompt
  vo?: string             // V112: Bangla conversational VO line — CosyVoice3-BN
                         // reading the ENGLISH captions is what garbled the last
                         // render ("অথার, অজেন্ট"); captions are on-screen OVERLAYS,
                         // vo is what the voice actually says.
  duration: number        // seconds
  mood: string            // music mood tag (dark ambient / tense / hopeful / epic)
  camera: string          // camera move for the prompt
}

const GOLDEN_HOUR = 'anamorphic golden hour film grain 35mm shallow depth 768x1344 cinematic 8k'

export function parseRawPromptToCinematic(raw: string): CinematicScene[] {
  const lower = raw.toLowerCase()
  const isSoftwareStory =
    lower.includes('stock footage') ||
    lower.includes('programmers coding') ||
    (lower.includes('software') && (lower.includes('bangladesh') || lower.includes('anthropic') || lower.includes('brain station')))

  if (isSoftwareStory) {
    // V108 — Bangladesh software + AI jobs story. Six captions provided by the
    // customer as the on-screen overlay text (they were the originals being
    // burnt onto canvas in the WEBM export bug). Visuals pair anamorphic
    // golden-hour film grain with the matching subject.
    return [
      { visual: `anamorphic golden hour Bangladesh software company office programmers coding, multiple monitors with code, ${GOLDEN_HOUR}`, caption: 'Anthropic hiring: Engineer, Marketing, Finance, Hardware, Sales', vo: 'অ্যানথ্রপিক এখন হায়ারিং করছে — ইঞ্জিনিয়ার, মার্কেটিং, ফাইন্যান্স, হার্ডওয়্যার, আর সেলস সব রোলেই।', duration: 5, mood: 'lo-fi tech optimistic but serious', camera: 'dolly in office coding' },
      { visual: `PWC 2026 data visualization wall with rising global job charts, senior analysts reviewing, modern office, ${GOLDEN_HOUR}`, caption: 'PWC 2026: 1B+ jobs analyzed', vo: 'পিডাব্লিউসি-র ২০২৬ রিপোর্টে একশো কোটিরও বেশি চাকরির ডেটা অ্যানালাইজ করা হয়েছে।', duration: 5, mood: 'lo-fi tech optimistic but serious', camera: 'medium office whiteboard' },
      { visual: `PWC consulting charts rising salary statistics dashboard, analysts at workstations, modern office golden light, ${GOLDEN_HOUR}`, caption: 'AI Skill Jobs +69% | Salary +62%', vo: 'AI স্কিল থাকলে চাকরির সংখ্যা ঊনসত্তর শতাংশ বাড়ছে, আর স্যালারি বাড়ছে বাষট্টি শতাংশ।', duration: 5, mood: 'lo-fi tech optimistic but serious', camera: 'close-up charts' },
      { visual: `aerial Dhaka city skyline golden hour drone, Brain Station 23 office young professionals celebrating, ${GOLDEN_HOUR}`, caption: 'Bangladesh IT Export +13.54% = $269.8M', vo: 'বাংলাদেশের আইটি এক্সপোর্ট তেরো দশমিক পাঁচ চার শতাংশ বেড়ে দুইশো ঊনসত্তর মিলিয়ন ডলার।', duration: 5, mood: 'lo-fi tech optimistic but serious', camera: 'drone aerial city' },
      { visual: `junior developer confidently explaining solution at a bright modern office whiteboard, mentor nodding approval, warm daylight, ${GOLDEN_HOUR}`, caption: '10 din er kaj = 1-2 din', vo: 'যে কাজে আগে দশ দিন লাগত, এখন এআই দিয়ে এক থেকে দুই দিনেই হয়ে যায়।', duration: 5, mood: 'lo-fi tech optimistic but serious', camera: 'whiteboard medium' },
      { visual: 'dark navy end card with elegant gold Hostamar logo glow, determined founder silhouette in warm rim light, cinematic depth of field', caption: 'Prompt Engineer na, Problem Solver hou — hostamar.com 1cr = 1TK = 1 COIN', vo: 'তুমি শুধু প্রম্পট ইঞ্জিনিয়ার নয় — সমস্যা সমাধানকারী হও।', duration: 5, mood: 'lo-fi tech epic outro', camera: 'static end card' },
    ]
  }

  // Default — Globalization/era-end template.
  return [
    { visual: `sunset highway silhouette buses on flyover, ${GOLDEN_HOUR}`, caption: 'Globalization FAILED!', duration: 5, mood: 'dark cinematic', camera: 'static wide' },
    { visual: `aerial ocean teal white sand, ${GOLDEN_HOUR}`, caption: '৭০ বছরের পুরনো দুনিয়া ভেঙে পড়ছে!', duration: 5, mood: 'emotional', camera: 'top-down' },
    { visual: `airplane window ocean view business class meal, ${GOLDEN_HOUR}`, caption: 'আগে সিস্টেম ছিল - Asia বানাবে, Japan টাকা ধার দেবে, America কিনবে', duration: 6, mood: 'tense', camera: 'window seat' },
    { visual: `couple silhouette holding hands beach sunset orange sky, ${GOLDEN_HOUR}`, caption: 'এখন? Sanction, Dollar Crisis!', duration: 5, mood: 'dark', camera: 'silhouette wide' },
    { visual: `Bogura green hills drone coastal road, ${GOLDEN_HOUR}`, caption: 'আমি বগুড়া থেকে Hostamar বানাচ্ছি', duration: 5, mood: 'hopeful', camera: 'drone follow' },
    { visual: 'dark navy Hostamar end card, cinematic glow', caption: 'hostamar.com — 1cr = 1TK = 1 COIN', duration: 4, mood: 'epic', camera: 'static' },
  ]
}

// Self-check (ponytail: run directly with tsx / node --experimental-strip-types).
// node --experimental-strip-types lib/video/cinematic-parser.ts
function selfCheck(): void {
  const s1 = parseRawPromptToCinematic('Use stock footage of: programmers coding, Anthropic office, Bangladesh software companies, Brain Station 23 team')
  console.assert(s1.length === 6, 'expected 6 scenes')
  console.assert(s1[0].caption.includes('Anthropic hiring'), 'expected Anthropic overlay caption, got: ' + s1[0].caption)
  console.assert(s1[5].caption.includes('Prompt Engineer na'), 'expected closing CTA, got: ' + s1[5].caption)
  console.assert(s1.every((s) => !s.caption.includes('Use stock footage')), 'no raw prompt leak')
  const s2 = parseRawPromptToCinematic('Globalization reel')
  console.assert(s2[0].caption.includes('Globalization'), 'default template')
  console.assert(s2[5].caption.includes('hostamar.com'), 'end card')
  console.log('cinematic-parser self-check OK')
}
if (process.argv[1] === new URL(import.meta.url).pathname) selfCheck()
