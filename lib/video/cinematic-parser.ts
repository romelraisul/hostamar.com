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
  captionStyle?: string   // V116: text styling hint for the caption renderer
  vo?: string             // V112: Bangla conversational VO line — CosyVoice3-BN
                         // reading the ENGLISH captions is what garbled the last
                         // render ("অথার, অজেন্ট"); captions are on-screen OVERLAYS,
                         // vo is what the voice actually says.
  duration: number        // seconds
  start?: number          // V116: explicit start (sec); undefined → caller lays out sequentially
  end?: number            // V116: explicit end (sec)
  mood: string            // music mood tag (dark ambient / tense / hopeful / epic)
  camera: string          // camera move for the prompt
}

// V115 — final video prompt. 6 scenes × 5s (121 frames @ 24fps ≈ 5.04s each)
// = 30.24s total, rendered 384x216 → ESR-upscaled 1080x1920 (upright reel).
// Header target: 768x1344. VO: Chatterbox (exaggeration 0.5, cfg 0.5, cuda).

// V115 FINAL: 5s per scene, 0→30.24s total (6 clips × 121 frames @ 24fps).
const GOLDEN_HOUR = 'anamorphic golden hour, warm volumetric sunlight, soft bokeh, 35mm film grain, shallow depth of field, cinematic 8k'

// V116 — galaxy-hook reel. 5 scenes × 3-4s = 18s total, galaxy projector base.
const GALAXY_BG = 'galaxy projector lights 4K, nebula stars, deep space, volumetric blue purple, 8k cinematic, slow zoom'

export function parseRawPromptToCinematic(raw: string): CinematicScene[] {
  const lower = raw.toLowerCase()

  const isGalaxyHook =
    lower.includes('galaxy') && (lower.includes('hook') || lower.includes('wang') || lower.includes('clarity') || lower.includes('vibe coding'))

  if (isGalaxyHook) {
    return [
      { visual: `${GALAXY_BG} — galaxy projector 4K lights, YouTube galaxy projector background`, caption: 'AI ইতিহাসের সবচেয়ে কম বয়সী বিলিয়নিয়ার\nএকটা স্কিল সবচেয়ে গুরুত্বপূর্ণ বললো', captionStyle: 'Big Gold 80px + White 48px, Typewriter + Zoom in', vo: 'AI ইতিহাসের সবচেয়ে কম বয়সী বিলিয়নিয়ার বলেছে, একটা স্কিল সবচেয়ে গুরুত্বপূর্ণ।', duration: 3, start: 0, end: 3, mood: 'hook epic', camera: 'zoom in projector' },
      { visual: `same galaxy blue projector, dark space, ${GALAXY_BG}`, caption: "It's NOT Python\nIt's NOT ML\nIt's CLARITY\nAI কে ঠিক কি বানাতে হবে সেটা বলতে পারা", captionStyle: 'White → White → Cyan 80px bold', vo: 'ইটস নট পাইথন, ইটস নট এমএল, ইটস ক্লারিটি — AI কে ঠিক কি বানাতে হবে সেটা বলতে পারা।', duration: 3, start: 3, end: 6, mood: 'shock', camera: 'static galaxy' },
      { visual: `red galaxy projector, nebula red, ${GALAXY_BG}`, caption: 'Alexander Wang - 25 বছরে Billionaire\nData Infrastructure বানিয়ে Youngest Self-Made\n[Scale AI logo]', vo: 'আলেকজান্ডার ওয়াং — পঁচিশ বছরে বিলিয়নিয়ার, ডাটা ইনফ্রাস্ট্রাকচার বানিয়ে ইয়াংগেস্ট সেলফ-মেড।', duration: 4, start: 6, end: 10, mood: 'story', camera: 'slow dolly' },
      { visual: `green galaxy projector, chart animation, ${GALAXY_BG}`, caption: 'Vibe Coding 100%\nGoogle এর 25% কোড এখন AI লেখে, 3-5 বছরে 100% লিখবে', vo: 'ভাইব কোডিং হান্ড্রেড পারসেন্ট — গুগলের পঁচিশ পারসেন্ট কোড এখন AI লেখে, তিন থেকে পাঁচ বছরে একশো পারসেন্ট লিখবে।', duration: 4, start: 10, end: 14, mood: 'data', camera: 'chart zoom' },
      { visual: `purple galaxy + stars projector, ${GALAXY_BG}`, caption: 'যারা ঠিকভাবে বলতে পারে কি চায়, তারাই পরের 10 বছর জিতবে\nDirect the Machine, Build, Fix, Know - Hostamar.com', vo: 'যারা ঠিকভাবে বলতে পারে কি চায়, তারাই পরের দশ বছর জিতবে।', duration: 4, start: 14, end: 18, mood: 'cta epic', camera: 'pull out stars' },
    ]
  }

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
  const s3 = parseRawPromptToCinematic('galaxy hook — Alexander Wang vibe coding clarity')
  console.assert(s3.length === 5, 'expected 5 galaxy scenes')
  console.assert(s3[0].caption.includes('বিলিয়নিয়ার'), 'galaxy hook caption')
  console.assert(s3[4].caption.includes('Hostamar.com'), 'galaxy CTA')
  console.assert(s3.reduce((a, s) => a + s.duration, 0) === 18, 'galaxy total 18s')
  console.assert(s3.every((s, i) => (s.start ?? -1) === ([0,3,6,10,14][i])), 'galaxy explicit start times')
  console.log('cinematic-parser self-check OK')
}
if (process.argv[1] === new URL(import.meta.url).pathname) selfCheck()
