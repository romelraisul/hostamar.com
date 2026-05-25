import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11435'
const OLLAMA_MODEL = process.env.OLLAMA_CHAT_MODEL || 'hermes3:latest'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { message, videoId, history } = await req.json().catch(() => ({ message: '', videoId: null, history: [] }))

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 })
    }

    // Build video context if videoId provided
    let videoContext = ''
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { title: true, description: true, prompt: true, script: true, topic: true, language: true, createdAt: true },
      })
      if (video) {
        videoContext = `The user is asking about this video:
Title: ${video.title}
Description: ${video.description || 'N/A'}
Topic: ${video.topic || 'N/A'}
Script: ${video.script || 'N/A'}
Language: ${video.language}
Created: ${video.createdAt.toISOString().split('T')[0]}

`
      }
    }

    const systemPrompt = `You are Hostamar AI, a helpful video content assistant for a Bangladeshi AI video SaaS platform.

${videoContext ? `Current video context:\n${videoContext}` : ''}

You can answer questions about:
- Video content, scripts, and concepts
- Video editing tips and best practices
- Marketing strategy for Bangladeshi businesses
- Bengali and English video production
- How to use Hostamar features

Keep responses concise and practical. Use Bengali when the user writes in Bengali. Be friendly and professional.`

    // Build message history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10), // last 10 messages
      { role: 'user', content: message },
    ]

    // Call remote Ollama with streaming
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
        options: { temperature: 0.7, max_tokens: 1024 },
      }),
    })

    if (!ollamaRes.ok) {
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), { status: 502 })
    }

    // Stream the response back
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = ollamaRes.body?.getReader()
          if (!reader) {
            controller.enqueue(encoder.encode(JSON.stringify({ error: 'No response stream' })))
            controller.close()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('{')) continue
              try {
                const chunk = JSON.parse(line)
                const token = chunk.message?.content || ''
                if (token) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
                }
              } catch {
                // skip malformed JSON
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
