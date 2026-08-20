import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public AI assist — proxy to /api/support-chat or canned Bangla replies.
 * Free-only, no extra deps. Enforces 100 msg/day via client localStorage
 * (key: hostamar_ai_assist_count) — server also honors X-Assist-Count header
 * and body.count as a secondary guard. Brand #2563EB.
 */

// ---------------------------------------------------------------------------
// Canned Bangla knowledge (from docs/knowledge fallback)
// ---------------------------------------------------------------------------
type Canned = { keywords: RegExp; reply: string };

const CANNED: Canned[] = [
  {
    keywords: /(payment|pay|bkash|nagad|rocket|পেমেন্ট|টাকা|বিকাশ|নগদ)/i,
    reply:
      "পেমেন্ট নিয়ে চিন্তার কিছু নেই! Hostamar এ bKash / Nagad / Rocket — সবগুলো সাপোর্ট করে। পেমেন্ট করার পর tran_id দিয়ে আমাদের জানান, আমরা সাথে সাথে ভেরিফাই করে দেব। কোনো সমস্যা হলে /api/support-chat এ tran_id পাঠান। — Hostamar #2563EB",
  },
  {
    keywords: /(hosting|server|bdix|ssd|uptime|হোস্টিং|সার্ভার)/i,
    reply:
      "Hostamar হোস্টিং BDIX-কানেক্টেড — ঢাকায় 18-22ms ল্যাটেন্সি, 99.97% আপটাইম। SSD, LiteSpeed + cPanel, ফ্রি SSL, ডেইলি ব্যাকআপ। /api/hosting/status এ লাইভ স্ট্যাটাস দেখতে পারেন। — Hostamar #2563EB",
  },
  {
    keywords: /(domain|ডোমেইন)/i,
    reply:
      "ডোমেইন রেজিস্ট্রেশন/ট্রান্সফার দুটোই Hostamar এ পাবেন — .com/.xyz/.online সব জনপ্রিয় TLD সাপোর্টেড। ডোমেইন সার্চ করতে /hosting পেজ দেখুন। — Hostamar #2563EB",
  },
  {
    keywords: /(game|credit|ক্রেডিট|গেম|generate)/i,
    reply:
      "Hostamar Game — প্রতিদিন ফ্রি 50 ক্রেডিট (সর্বোচ্চ 10000 পর্যন্ত জমা)। /api/game/credits থেকে ব্যালেন্স দেখুন, /api/game/generate দিয়ে জেনারেট করুন। — Hostamar #2563EB",
  },
  {
    keywords: /(video|ভিডিও|generate|ছবি|ইমেজ)/i,
    reply:
      "Hostamar Generate — প্রম্পট লিখুন, ছবি/ভিডিও তৈরি করুন। হিস্ট্রি দেখতে /api/generate/history (localStorage key: hostamar_generate_history)। — Hostamar #2563EB",
  },
  {
    keywords: /(support|help|support-chat|হেল্প|সাহায্য|সমস্যা)/i,
    reply:
      "আমরা আছি 24/7! আপনার প্রশ্নটি /api/support-chat এ RAG-ভিত্তিক AI (Qdrant + Ollama) দিয়ে উত্তর দেওয়া হয়। এখানেও একই প্রশ্ন পাঠাতে পারেন। — Hostamar #2563EB",
  },
];

const FALLBACK_REPLY =
  "আসসালামু আলাইকুম! আমি Hostamar AI Assist 🤖 — হোস্টিং, ডোমেইন, পেমেন্ট বা গেম/জেনারেট যেকোনো বিষয়ে প্রশ্ন করুন। আরও বিস্তারিত সাহায্যের জন্য /api/support-chat ব্যবহার করুন। — Hostamar #2563EB";

function pickCanned(message: string): string {
  for (const c of CANNED) if (c.keywords.test(message)) return c.reply;
  return FALLBACK_REPLY;
}

const DAILY_LIMIT = 100;
const COUNT_HEADER = "x-assist-count";
const LOCAL_STORAGE_KEY = "hostamar_ai_assist_count";
const LOCAL_STORAGE_DATE_KEY = "hostamar_ai_assist_date";

function getClientCount(req: NextRequest, bodyCount?: unknown): number | null {
  const h = req.headers.get(COUNT_HEADER) || req.headers.get("x-hostamar-msg-count");
  if (h) {
    const n = parseInt(h, 10);
    if (!Number.isNaN(n)) return n;
  }
  if (typeof bodyCount === "number" && !Number.isNaN(bodyCount)) return bodyCount;
  return null;
}

async function trySupportChat(message: string, req: NextRequest): Promise<string | null> {
  // Try internal proxy to /api/support-chat. If it fails, return null -> canned fallback.
  const origin =
    req.nextUrl.origin ||
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const url = `${origin.replace(/\/$/, "")}/api/support-chat`;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | { reply?: string; answer?: string; message?: string; text?: string }
      | null;
    if (!data) return null;
    return data.reply || data.answer || data.message || data.text || null;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json(
    {
      service: "Hostamar AI Assist",
      brand: "#2563EB",
      dailyLimit: DAILY_LIMIT,
      localStorageKey: LOCAL_STORAGE_KEY,
      localStorageDateKey: LOCAL_STORAGE_DATE_KEY,
      usage: `Client must track count in localStorage["${LOCAL_STORAGE_KEY}"] + date in localStorage["${LOCAL_STORAGE_DATE_KEY}"]; send X-Assist-Count header or {count} in body. Limit ${DAILY_LIMIT}/day.`,
      endpoints: {
        "POST /api/chat/ai-assist": '{ message: string, count?: number } -> { reply, source, remaining, brand }',
      },
      docs: "Tries POST /api/support-chat internally; falls back to canned Bangla replies from docs/knowledge.",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  let body: { message?: string; count?: number; prompt?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", brand: "#2563EB" }, { status: 400 });
  }

  const message = (body.message || body.prompt || "").toString().trim();
  if (!message) {
    return NextResponse.json({ error: "message is required", brand: "#2563EB" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "message too long (max 4000 chars)", brand: "#2563EB" }, { status: 400 });
  }

  // 100 msg/day guard — server honors client-reported count (localStorage)
  const clientCount = getClientCount(req, body.count);
  if (clientCount !== null && clientCount >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily limit reached (${DAILY_LIMIT}/day). Please try again tomorrow.`,
        error_bn: `দৈনিক লিমিট শেষ (${DAILY_LIMIT}/দিন)। অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন।`,
        limit: DAILY_LIMIT,
        count: clientCount,
        remaining: 0,
        localStorageKey: LOCAL_STORAGE_KEY,
        localStorageDateKey: LOCAL_STORAGE_DATE_KEY,
        brand: "#2563EB",
      },
      { status: 429, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  // 1) Try live support-chat (RAG)
  const liveReply = await trySupportChat(message, req);
  if (liveReply) {
    const remaining = clientCount !== null ? Math.max(0, DAILY_LIMIT - (clientCount + 1)) : null;
    return NextResponse.json(
      {
        reply: liveReply,
        source: "support-chat",
        via: "/api/support-chat",
        remaining,
        limit: DAILY_LIMIT,
        count: clientCount !== null ? clientCount + 1 : undefined,
        localStorageKey: LOCAL_STORAGE_KEY,
        localStorageDateKey: LOCAL_STORAGE_DATE_KEY,
        brand: "#2563EB",
      },
      { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
    );
  }

  // 2) Canned Bangla fallback (docs/knowledge)
  const canned = pickCanned(message);
  const remaining = clientCount !== null ? Math.max(0, DAILY_LIMIT - (clientCount + 1)) : null;
  return NextResponse.json(
    {
      reply: canned,
      source: "canned",
      via: "docs/knowledge fallback",
      remaining,
      limit: DAILY_LIMIT,
      count: clientCount !== null ? clientCount + 1 : undefined,
      localStorageKey: LOCAL_STORAGE_KEY,
      localStorageDateKey: LOCAL_STORAGE_DATE_KEY,
      brand: "#2563EB",
      hint: `Client should increment localStorage["${LOCAL_STORAGE_KEY}"] and check ${DAILY_LIMIT}/day.`,
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Assist-Count, X-Hostamar-Msg-Count",
    },
  });
}
