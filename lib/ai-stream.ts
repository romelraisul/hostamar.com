/**
 * lib/ai-stream.ts — V62: TRUE SSE streaming for /api/v1/chat/completions.
 *
 * Root cause of customer EmptyStreamError (2026-09-11, 2 msgs ~12.4K tokens,
 * model hostamar-1m-a): the route ignored body.stream and always buffered the
 * whole completion through callBestModel() into ONE JSON body. OpenAI-SDK
 * clients that request stream:true read SSE frames — they got a JSON object
 * instead: zero `data:` frames, no finish_reason → "Provider returned empty
 * stream with no finish_reason". The 55.25s/66s/120s/179s failure ceilings
 * were Vercel's maxDuration kill on the buffering path, not context size.
 *
 * This relay speaks real SSE: kilocode upstream with stream:true → parse
 * frames → re-emit proper chat.completion.chunk deltas + finish_reason +
 * guaranteed data: [DONE], with a 15s heartbeat chunk so idle warmups never
 * look dead. hostamar-* SKUs ride the same kilocode capacity slot as the
 * non-streaming path and are BRANDED as the requested model (V12 parity).
 */

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}

type AuthUser = { id: string } | null

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

function chunkOf(model: string, delta: Record<string, unknown>, finish: string | null) {
  return {
    id: 'chatcmpl-hostamar-stream',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finish }],
  }
}

export async function streamChatCompletion(body: any, authUser: AuthUser): Promise<Response> {
  const wanted: string = body.model || 'kilo-auto/free'
  const upstreamModel = wanted.startsWith('hostamar-') ? 'kilo-auto/free' : wanted

  const base = process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway'
  const key = process.env.KILOCODE_API_KEY
  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: 'stream backend not configured', code: 500 } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.filter((m: any) => m?.content)
    : []
  if (!messages.length) {
    return new Response(
      JSON.stringify({ error: { message: 'messages[] required', code: 400 } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const encoder = new TextEncoder()
  let full = ''
  const started = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      const push = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s))
        } catch {
          /* client gone */
        }
      }
      // Heartbeat: keepalive empty chunk every 15s of upstream silence so
      // SDK timeouts (and CF/Vercel proxies) never see a dead stream.
      const hb = setInterval(() => push(sse(chunkOf(wanted, {}, null))), 15_000)

      try {
        const up = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: upstreamModel,
            messages,
            temperature: 0.7,
            max_tokens: Number(body.max_tokens) || 1200,
            stream: true,
          }),
          // TTFT guard only — once frames flow, we relay until upstream closes.
          signal: AbortSignal.timeout(60_000),
        })

        if (!up.ok || !up.body) {
          const t = await up.text().catch(() => '')
          push(
            sse({
              error: { message: `upstream ${up.status}: ${t.slice(0, 200)}`, code: up.status },
            }),
          )
          clearInterval(hb)
          controller.close()
          return
        }

        const reader = up.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let done_sent = false

        // OpenAI clients expect the role declaration first.
        push(sse(chunkOf(wanted, { role: 'assistant', content: '' }, null)))

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let idx: number
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx).trim()
            buf = buf.slice(idx + 1)
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (payload === '[DONE]') {
              push('data: [DONE]\n\n')
              done_sent = true
              continue
            }
            try {
              const j = JSON.parse(payload)
              const c = j.choices?.[0]
              const content: string = c?.delta?.content || ''
              const finish: string | null = c?.finish_reason ?? null
              if (content) full += content
              push(sse(chunkOf(wanted, content ? { content } : {}, finish)))
            } catch {
              /* partial JSON across TCP frames — skip */
            }
          }
        }
        if (!done_sent) push('data: [DONE]\n\n')
      } catch (e) {
        push(
          sse({
            error: { message: `stream failed: ${(e as Error).message}`, code: 502 },
          }),
        )
        push('data: [DONE]\n\n')
      } finally {
        clearInterval(hb)
        try {
          controller.close()
        } catch {
          /* already closed */
        }

        // Best-effort credit accounting (same market pricing as non-stream
        // path) AFTER the stream is closed — never block the client stream.
        if (authUser?.id && full) {
          const promptTokens = Math.ceil(
            (body.messages as any[]).reduce((n: number, m: any) => n + (m.content?.length || 0), 0) / 4,
          )
          const completionTokens = Math.ceil(full.length / 4)
          Promise.all([
            import('@/lib/pricing/market-pricing'),
            import('@/lib/credits'),
          ])
            .then(async ([{ computeCharge }, { deductCredits }]) => {
              const { credits } = computeCharge(wanted, promptTokens, completionTokens)
              await deductCredits(
                authUser.id,
                -credits,
                'chat',
                `chat-stream ${wanted} ${promptTokens + completionTokens}tk`,
              ).catch(() => null)
            })
            .catch(() => null)
        }
        void started
      }
    },
  })

  return new Response(stream, {
    headers: { ...SSE_HEADERS, 'X-AI-Model': wanted, 'X-AI-Provider': `${wanted}-stream` },
  })
}
