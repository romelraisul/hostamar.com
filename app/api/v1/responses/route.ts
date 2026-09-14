import { NextRequest, NextResponse } from 'next/server'
import { callBestModel } from '@/lib/ai-fallback'
import { recordSurveillance } from '@/lib/surveillance'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'
import { slidingWindow, getClientIpEdge } from '@/lib/rate-limit-edge'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

/**
 * /api/v1/responses — minimal OpenAI Responses API adapter (2026-09-14).
 *
 * Codex CLI now speaks POST /v1/responses. This route translates the Responses
 * payload into our chat building blocks (callBestModel + toolsPayload passthrough)
 * and re-encodes the answer either as a Responses JSON object (non-streaming) or
 * the SSE event sequence Codex needs (streaming).
 *
 * Stateless by design: store / previous_response_id are accepted and IGNORED —
 * the client must send full conversation history in `input` each turn (Codex
 * does this when store:false).
 */

const DEFAULT_SYSTEM_PROMPT =
  'You are Hostamar AI — an assistant for Bangladeshi businesses. Reply in Bangla or English matching the user. Hostamar offers 50+ AI services (video, logo, ads, social), 6000 FREE credits, bKash personal payment 01822417463, plans Starter ৳599 / Pro ৳1299 / Business ৳2999. Be concise and helpful.'

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}

// ── Responses → chat translation helpers ────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

function contentToText(content: any): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((p: any) => (typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('\n')
  }
  if (typeof content === 'object' && typeof content.text === 'string') return content.text
  return ''
}

/**
 * Responses `input` (string | item array) → chat `messages`.
 * - message items: user/assistant kept; system/developer folded to system role.
 * - function_call items → assistant message with tool_calls (agent loop turn N).
 * - function_call_output items → role:'tool' message (agent loop turn N+1).
 * - reasoning / item_reference / other types: skipped (stateless adapter).
 */
function responsesInputToMessages(input: any): any[] {
  if (typeof input === 'string') {
    return input.trim() ? [{ role: 'user', content: input }] : []
  }
  if (!Array.isArray(input)) return []
  const out: any[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    if (item.type === 'message') {
      const role =
        item.role === 'assistant'
          ? 'assistant'
          : item.role === 'system' || item.role === 'developer'
            ? 'system'
            : 'user'
      const text = contentToText(item.content)
      if (text || role === 'assistant') out.push({ role, content: text })
    } else if (item.type === 'function_call') {
      out.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: item.call_id || genId('call'),
            type: 'function',
            function: {
              name: item.name || '',
              arguments:
                typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments ?? {}),
            },
          },
        ],
      })
    } else if (item.type === 'function_call_output') {
      out.push({
        role: 'tool',
        tool_call_id: item.call_id || '',
        content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output ?? ''),
      })
    }
    // default: skip unknown item types
  }
  return out
}

/** Responses tools [{type:'function', name, description, parameters, strict}] → chat tools format. */
function responsesToolsToChatTools(tools: any): any[] {
  if (!Array.isArray(tools)) return []
  return tools
    .filter((t: any) => t && t.type === 'function')
    .map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        ...(t.description !== undefined ? { description: t.description } : {}),
        ...(t.parameters !== undefined ? { parameters: t.parameters } : {}),
        ...(t.strict !== undefined ? { strict: t.strict } : {}),
      },
    }))
}

/** callBestModel result → Responses `output` items (message + function_call). */
function buildOutputItems(result: any): any[] {
  const items: any[] = []
  const text = result?.text || ''
  if (text) {
    items.push({
      type: 'message',
      id: genId('msg'),
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text, annotations: [] }],
    })
  }
  const toolCalls = result?.message?.tool_calls || []
  for (const tc of toolCalls) {
    items.push({
      type: 'function_call',
      id: genId('fc'),
      call_id: tc?.id || genId('call'),
      name: tc?.function?.name || '',
      arguments:
        typeof tc?.function?.arguments === 'string'
          ? tc.function.arguments
          : JSON.stringify(tc?.function?.arguments ?? {}),
      status: 'completed',
    })
  }
  return items
}

function usageOf(systemPrompt: string, messages: any[], completionText: string) {
  const promptTokens = Math.ceil(
    (systemPrompt.length + messages.reduce((n: number, m: any) => n + (m?.content?.length || 0), 0)) / 4,
  )
  const completionTokens = Math.ceil(completionText.length / 4)
  return {
    input_tokens: promptTokens,
    output_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = slidingWindow(`responses:${getClientIpEdge(req)}`, 100, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: { message: 'Rate limit exceeded — 100 req/min. Try again shortly.', code: 429 } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON', code: 400 } }, { status: 400 })
  }

  const messages: any[] = responsesInputToMessages(body.input)
  if (!messages.length) {
    return NextResponse.json(
      { error: { message: 'input is required (string or item array)', code: 400 } },
      { status: 400 },
    )
  }

  let authUser: any = null
  try {
    authUser = await getAuthUser(req)
  } catch {
    authUser = null
  }

  // Responses tools → chat tools; forwarded verbatim via toolsPayload (V100 chain).
  const chatTools = responsesToolsToChatTools(body.tools)
  const toolsPayload = chatTools.length
    ? {
        tools: chatTools,
        ...(body.tool_choice !== undefined ? { tool_choice: body.tool_choice } : {}),
        ...(body.parallel_tool_calls !== undefined ? { parallel_tool_calls: body.parallel_tool_calls } : {}),
        anonymous: !authUser,
      }
    : undefined

  // Codex instructions win when present; otherwise the Hostamar brand prompt.
  const systemPrompt: string = contentToText(body.instructions) || DEFAULT_SYSTEM_PROMPT
  const requestedModel: string = body.model || 'hostamar-1m-a'
  const debug = new URL(req.url).searchParams.get('debug') === '1'

  // ── Streaming: buffered upstream call → Responses SSE event sequence ──────
  if (body.stream === true) {
    const encoder = new TextEncoder()
    const respId = genId('resp')
    const createdAt = Math.floor(Date.now() / 1000)
    const baseResponse: any = {
      id: respId,
      object: 'response',
      created_at: createdAt,
      status: 'in_progress',
      model: requestedModel,
      output: [],
      usage: null,
    }

    const stream = new ReadableStream({
      async start(controller) {
        let seq = 0
        const send = (type: string, payload: Record<string, unknown>) => {
          seq += 1
          controller.enqueue(
            encoder.encode(`event: ${type}\ndata: ${JSON.stringify({ type, sequence_number: seq, ...payload })}\n\n`),
          )
        }

        send('response.created', { response: { ...baseResponse } })

        // Warmups can take ~30s — SSE comment heartbeats keep the pipe alive.
        const hb = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'))
          } catch {}
        }, 15_000)

        let result: any
        try {
          result = await callBestModel(messages as any, systemPrompt, body.model || undefined, debug, toolsPayload)
        } catch (e: any) {
          clearInterval(hb)
          send('response.failed', {
            response: {
              ...baseResponse,
              status: 'failed',
              error: { code: 'upstream_error', message: String(e?.message || e) },
            },
          })
          controller.close()
          return
        }
        clearInterval(hb)

        const items = buildOutputItems(result)
        const completionText: string =
          result?.text || (items.some((i) => i.type === 'function_call') ? JSON.stringify(items) : '')

        // Best-effort metering/telemetry — never breaks the stream.
        try {
          await recordSurveillance({
            clientIp: getClientIpEdge(req),
            userAgent: req.headers.get('user-agent'),
            userId: authUser?.id || null,
            model: result?.model,
            prompt: String(messages[messages.length - 1]?.content || ''),
            responseLen: completionText.length,
          })
          if (authUser) {
            const usage = usageOf(systemPrompt, messages, completionText)
            const { computeCharge } = await import('@/lib/pricing/market-pricing')
            const { credits } = computeCharge(result.model, usage.input_tokens, usage.output_tokens)
            await deductCredits(authUser.id, -credits, 'chat', `responses ${result.model} ${usage.total_tokens}tk`)
          }
        } catch {}

        for (let i = 0; i < items.length; i++) {
          const item: any = items[i]
          if (item.type === 'message') {
            send('response.output_item.added', {
              output_index: i,
              item: { ...item, status: 'in_progress', content: [] },
            })
            const text: string = item.content?.[0]?.text || ''
            const CHUNK = 200
            for (let j = 0; j < text.length; j += CHUNK) {
              send('response.output_text.delta', {
                item_id: item.id,
                output_index: i,
                content_index: 0,
                delta: text.slice(j, j + CHUNK),
              })
            }
          } else {
            // function_call
            send('response.output_item.added', {
              output_index: i,
              item: { ...item, status: 'in_progress', arguments: '' },
            })
            send('response.function_call_arguments.delta', {
              item_id: item.id,
              output_index: i,
              delta: item.arguments,
            })
            send('response.function_call_arguments.done', {
              item_id: item.id,
              output_index: i,
              arguments: item.arguments,
            })
          }
          send('response.output_item.done', { output_index: i, item })
        }

        send('response.completed', {
          response: {
            ...baseResponse,
            status: 'completed',
            output: items,
            usage: usageOf(systemPrompt, messages, completionText),
          },
        })
        controller.close()
      },
    })

    return new Response(stream, { headers: SSE_HEADERS })
  }

  // ── Non-streaming: Responses JSON object ──────────────────────────────────
  let result: any
  try {
    result = await callBestModel(messages as any, systemPrompt, body.model || undefined, debug, toolsPayload)
  } catch (e: any) {
    return NextResponse.json(
      { error: { message: String(e?.message || 'upstream error'), code: 502 } },
      { status: 502 },
    )
  }

  const output = buildOutputItems(result)
  const hasToolCalls = output.some((i) => i.type === 'function_call')
  const completionText: string = result?.text || (hasToolCalls ? JSON.stringify(output) : '')
  const usage = usageOf(systemPrompt, messages, completionText)

  // Same sampled logging as the chat route (never breaks the response).
  await recordSurveillance({
    clientIp: getClientIpEdge(req),
    userAgent: req.headers.get('user-agent'),
    userId: authUser?.id || null,
    model: result?.model,
    prompt: String(messages[messages.length - 1]?.content || ''),
    responseLen: completionText.length,
  }).catch(() => null)

  let credits: { charged: number; remaining: number | null } | undefined
  if (authUser) {
    try {
      const { computeCharge } = await import('@/lib/pricing/market-pricing')
      const { credits: charge } = computeCharge(result.model, usage.input_tokens, usage.output_tokens)
      const spend: any = await deductCredits(
        authUser.id,
        -charge,
        'chat',
        `responses ${result.model} ${usage.total_tokens}tk`,
      )
      if (spend && 'creditsRemaining' in spend) {
        credits = { charged: charge, remaining: spend.creditsRemaining }
      } else if (spend && spend.error === 'INSUFFICIENT_CREDITS') {
        credits = { charged: 0, remaining: spend.balance ?? null }
      }
    } catch {
      credits = undefined
    }
  }

  const response: any = {
    id: genId('resp'),
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'completed',
    model: requestedModel,
    output,
    usage,
    ...(credits ? { credits } : {}),
    ...(debug && result?.trace ? { trace: result.trace } : {}),
  }

  return NextResponse.json(response, {
    headers: { 'X-AI-Provider': String(result?.provider || ''), 'X-AI-Model': String(result?.model || ''), 'Cache-Control': 'no-store' },
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/v1/responses',
    usage: 'POST {model, instructions?, input (string | items[]), tools?, tool_choice?, parallel_tool_calls?, stream?} — OpenAI Responses API, minimal adapter for Codex CLI. Stateless: store/previous_response_id ignored.',
    auth: 'optional — public works, authed users get credit accounting',
  })
}
