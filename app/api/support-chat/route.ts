import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTS } from '@/lib/products'
import {
  getPaymentByTranId,
  isValidEmail,
  isValidPlan,
} from '@/lib/provisioning'
import { ensureSchema } from '@/lib/ensure-schema'

// ============================================================================
// Live support chat — RAG-backed by Hostamar's SELF-HOSTED stack:
//   • Ollama  (generation)  via OLLAMA_PUBLIC_URL
//   • Qdrant  (retrieval)   via QDRANT_PUBLIC_URL  -> collection "hostamar_kb"
//   • nomic-embed-text      (embeddings) via Ollama /api/embed
// Zero third-party API cost; data stays in Bangladesh (dogfooding the AI Chat product).
// ============================================================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GEN_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest'
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
const OLLAMA_URL = (process.env.OLLAMA_PUBLIC_URL || 'http://localhost:11434').replace(/\/$/, '')
const QDRANT_URL = (process.env.QDRANT_PUBLIC_URL || 'http://localhost:8200').replace(/\/$/, '')
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'hostamar_kb'

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!res.ok) throw new Error(`embed ${res.status}`)
  const data = (await res.json()) as { embeddings: number[][] }
  return data.embeddings[0]
}

async function retrieve(query: string, k = 4): Promise<string[]> {
  const vec = await embed(query)
  const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vector: vec, limit: k, with_payload: true }),
  })
  if (!res.ok) throw new Error(`qdrant ${res.status}`)
  const data = (await res.json()) as { result: { payload?: { text?: string; product?: string } }[] }
  return (data.result || [])
    .map((r) => (r.payload?.text ? `[${r.payload.product}] ${r.payload.text}` : ''))
    .filter(Boolean)
}

// ----------------------------------------------------------------------------
// (B) Agent tool bridge — lets হোস্টা check a payment and (only if already
// paid in the ledger) trigger provisioning. SAFE: chat can NEVER free-provision;
// it only acts on tran_ids the verify step already marked `paid`.
// ----------------------------------------------------------------------------
const TRAN_ID_RE = /(tran[_-]?id|txn|transaction|trx)[:\s#-]*([A-Za-z0-9_-]{4,})/i

function extractTranId(text: string): string | null {
  const m = text.match(TRAN_ID_RE)
  return m ? m[2] : null
}

function wantsProvision(text: string): boolean {
  const bn = /(অ্যাকাউন্ট পাইনি|সার্ভিস চালু|অ্যাকাউন্ট দেন|পেমেন্ট করেছি কিন্তু|টাকা দিছি)/i
  const en = /(no account|activate|provision|paid but|didn't get|account yet)/i
  return bn.test(text) || en.test(text)
}

async function runProvisionTools(
  message: string,
): Promise<{ tranId: string | null; context: string }> {
  const tranId = extractTranId(message)
  if (!tranId) return { tranId: null, context: '' }

  let ledger: Awaited<ReturnType<typeof getPaymentByTranId>> = null
  try {
    ledger = await getPaymentByTranId(tranId)
  } catch {
    return { tranId, context: `(লেজার চেক করতে ডাটাবেসে সমস্যা হয়েছে)` }
  }

  if (!ledger) {
    return {
      tranId,
      context: `(get_invoice_status: tran_id "${tranId}" লেজারে পাওয়া যায়নি — এখনও ভেরিফাই হয়নি।)`,
    }
  }

  const statusLine = `(get_invoice_status: tran_id "${tranId}" → status="${ledger.status}", plan="${ledger.plan}", email="${ledger.customerEmail}")`

  if (ledger.status === 'provisioned') {
    return {
      tranId,
      context: `${statusLine}\n(provision_account: ইতিমধ্যে অ্যাকাউন্ট প্রোভিশনড — loginUrl=${ledger.loginUrl})`,
    }
  }

  if (ledger.status === 'paid' && wantsProvision(message)) {
    try {
      const res = await fetch(
        `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/internal/provision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
          },
          body: JSON.stringify({
            email: ledger.customerEmail,
            plan: ledger.plan,
            tran_id: tranId,
          }),
        },
      )
      const json = (await res.json()) as {
        success?: boolean
        loginUrl?: string
        accountId?: string
      }
      if (json.success) {
        return {
          tranId,
          context: `${statusLine}\n(provision_account: ✅ অ্যাকাউন্ট চালু হয়েছে → ${json.loginUrl})`,
        }
      }
      return {
        tranId,
        context: `${statusLine}\n(provision_account: প্রোভিশন ব্যর্থ — সাপোর্টে যোগাযোগ করুন)`,
      }
    } catch {
      return { tranId, context: `${statusLine}\n(provision_account: কল করতে সমস্যা)` }
    }
  }

  return { tranId, context: statusLine }
}

function buildSystemPrompt(rag: string[]): string {
  const productLines = PRODUCTS.map(
    (p) => `- ${p.nameBn} (${p.nameEn}): ${p.taglineBn}. ${p.description} Status: ${p.status}.`,
  ).join('\n')

  const ragBlock = rag.length
    ? rag.map((c, i) => `${i + 1}. ${c}`).join('\n\n')
    : '(কোনো কাস্টম ডক পাওয়া যায়নি — শুধু সাধারণ product info ব্যবহার করুন)'

  return `আপনি Hostamar-এর অফিসিয়াল AI সাপোর্ট ইঞ্জিনিয়ার "হোস্টা"। বাংলাদেশি ব্যবহারকারীদের সাহায্য করেন।

কোম্পানি: Hostamar — বাংলাদেশের AI প্ল্যাটফর্ম (AI ভিডিও, ক্লাউড হোস্টিং, AI চ্যাট, AI ব্রাউজার, গেমিং, Dev IDE)।
পেমেন্ট: bKash / Nagad / Rocket। সব দাম বাংলাদেশি টাকায় (৳)।
প্রাইসিং: Free (৳0), Starter (৳2,000/মাস), Business (৳3,500/মাস)। এক সাবস্ক্রিপশনে ৬টি পণ্য।

আমাদের ৬টি পণ্য:
${productLines}

প্রাসঙ্গিক ডকুমেন্ট (RAG থেকে পাওয়া — এগুলোই সত্য, বানাবেন না):
${ragBlock}

নিয়ম:
1. সবসময় বাংলায় উত্তর দিন (টেকনিক্যাল টার্ম ইংরেজিতে রাখতে পারেন)।
2. RAG কনটেক্সট থাকলে সেটা ব্যবহার করুন, বানিয়ে বলবেন না।
3. সংক্ষিপ্ত, সহায়ক ও বন্ধুত্বপূর্ণ হন।
4. জানেন না এমন কিছু হলে সৎ থাকুন: "এ বিষয়ে নিশ্চিত নই, support@hostamar.com-এ ইমেইল করুন।"
5. কখনো root পাসওয়ার্ড বা bKash PIN চাইবেন না।`
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = (await request.json()) as {
      message?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Retrieve relevant docs (degrade gracefully if Qdrant/Ollama-embed is down).
    let rag: string[] = []
    try {
      rag = await retrieve(message, 4)
    } catch {
      rag = []
    }

    // (B) Agent tool bridge — check invoice / trigger provision if paid.
    let toolCtx = ''
    try {
      await ensureSchema().catch(() => undefined)
      const tool = await runProvisionTools(message)
      toolCtx = tool.context
    } catch {
      toolCtx = ''
    }

    const sys = buildSystemPrompt(rag)
    const context =
      (history || [])
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'ব্যবহারকারী' : 'সহকারী'}: ${m.content}`)
        .join('\n') +
      (toolCtx ? `\n\n[টুল আউটপুট]:\n${toolCtx}\n` : '') +
      `\nব্যবহারকারী: ${message}\nসহকারী:`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    let text = ''
    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: GEN_MODEL,
          prompt: `${sys}\n\n${context}`,
          stream: false,
          options: { temperature: 0.5, num_predict: 400 },
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`ollama ${res.status}`)
      const data = (await res.json()) as { response?: string }
      text = (data.response || '').trim()
    } catch {
      clearTimeout(timeout)
      return NextResponse.json(
        {
          reply:
            'দুঃখিত, এই মুহূর্তে AI সাপোর্ট মডেলটি অনুপলব্ধ। কিছুক্ষণ পর আবার চেষ্টা করুন বা support@hostamar.com-এ ইমেইল করুন।',
          degraded: true,
        },
        { status: 200 },
      )
    }
    clearTimeout(timeout)

    if (!text) text = 'দুঃখিত, উত্তর তৈরি করা যায়নি। অন্য ভাবে প্রশ্ন করুন।'

    return NextResponse.json({ reply: text, ragUsed: rag.length })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
