import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// Replicate API configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const REPLICATE_API_BASE = 'https://api.replicate.com/v1'

// Model configurations
const MODEL_CONFIGS = {
  general: {
    model: 'meta/llama-3.3-70b-instruct',
    max_tokens: 1024,
    temperature: 0.7,
  },
  code: {
    model: 'meta/codellama-70b-instruct',
    max_tokens: 1024,
    temperature: 0.3,
  },
  creative: {
    model: 'meta/llama-3.3-70b-instruct',
    max_tokens: 1024,
    temperature: 0.9,
  },
}

// Tone preset system prompts
const TONE_PROMPTS = {
  formal: 'You are a professional assistant. Respond in a formal, academic style with proper grammar and structure.',
  casual: 'You are a friendly assistant. Be conversational, warm, and approachable in your responses.',
  business: 'You are a business consultant. Provide concise, actionable insights with professional language.',
}

// Build messages array for Replicate
function buildMessages(userMessage: string, history: Array<{ role: string; content: string }>, systemPrompt: string): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content })
  }

  messages.push({ role: 'user', content: userMessage })

  return messages
}

// Create a streaming prediction on Replicate
async function createPrediction(messages: Array<{ role: string; content: string }>, model: string, max_tokens: number, temperature: number) {
  const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model.includes('llama') ? 'meta/llama-3.3-70b-instruct:0c3cd290fd2005b9f1d35f4ce09b38f8c4c4da79c3cc8c3a11e0e3b3c8e3c8e3' : 'meta/codellama-70b-instruct:1c0b2f7e8b3a5f4a9c8e7d6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5',
      input: {
        messages,
        max_tokens,
        temperature,
        stream: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Replicate API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Poll for prediction completion and stream response
async function* streamPrediction(predictionUrl: string): AsyncGenerator<string> {
  const SSE_URL = predictionUrl.replace('predictions', 'predictions/stream')

  const response = await fetch(SSE_URL, {
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Accept': 'text/event-stream',
    },
  })

  if (!response.ok) {
    throw new Error(`Stream error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              yield parsed.token
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * POST /api/ai/chat
 *
 * Request body:
 *   conversationId?: string  (for continuing a conversation)
 *   message: string          (the user's message)
 *   model: 'general' | 'code' | 'creative'
 *   tone: 'formal' | 'casual' | 'business'
 *
 * Response: SSE stream of the AI response
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { conversationId, message, model = 'general', tone = 'casual' } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const trimmedMessage = message.trim()

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, customerId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          customerId: user.id,
          title: trimmedMessage.slice(0, 50),
          model,
          tone,
        },
      })
    }

    // Get conversation history
    const history = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Add system prompt based on tone
    const systemPrompt = TONE_PROMPTS[tone as keyof typeof TONE_PROMPTS] || TONE_PROMPTS.casual

    // Build messages
    const messages = buildMessages(trimmedMessage, history, systemPrompt)

    // Get model config
    const config = MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS] || MODEL_CONFIGS.general

    // Create prediction
    const prediction = await createPrediction(messages, config.model, config.max_tokens, config.temperature)

    // Store user message
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: trimmedMessage,
      },
    })

    // Create a readable stream for SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream the response
          let fullResponse = ''
          for await (const token of streamPrediction(prediction.urls?.stream || `${REPLICATE_API_BASE}/predictions/${prediction.id}/stream`)) {
            fullResponse += token
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
          }

          // Store assistant message
          if (fullResponse) {
            await prisma.chatMessage.create({
              data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: fullResponse,
              },
            })

            // Update conversation title if it's the first exchange
            if (history.length === 0) {
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { title: trimmedMessage.slice(0, 50) },
              })
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: conversation.id })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('[ai/chat] Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[ai/chat]', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}

/**
 * GET /api/ai/chat
 *
 * Query params:
 *   conversationId: string  (get messages for a conversation)
 *   shareSlug: string      (get shared conversation by slug)
 *
 * Returns conversation with messages
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const shareSlug = searchParams.get('shareSlug')

    if (shareSlug) {
      // Get shared conversation (public)
      const conversation = await prisma.conversation.findUnique({
        where: { shareSlug },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })

      if (!conversation || !conversation.isPublic) {
        return NextResponse.json({ error: 'Shared conversation not found' }, { status: 404 })
      }

      return NextResponse.json({ conversation })
    }

    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, customerId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json({ conversation })
    }

    // List user's conversations
    const conversations = await prisma.conversation.findMany({
      where: { customerId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        model: true,
        tone: true,
        isPublic: true,
        shareSlug: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('[ai/chat GET]', error)
    return NextResponse.json({ error: 'Failed to get conversations' }, { status: 500 })
  }
}

/**
 * PATCH /api/ai/chat
 *
 * Update conversation settings (share, title, etc.)
 *
 * Request body:
 *   conversationId: string
 *   action: 'share' | 'unshare' | 'updateTitle'
 *   title?: string
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { conversationId, action, title } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, customerId: user.id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    switch (action) {
      case 'share': {
        const shareSlug = randomUUID().slice(0, 8)
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { isPublic: true, shareSlug },
        })
        return NextResponse.json({ shareSlug, url: `/ai-chat/shared/${shareSlug}` })
      }

      case 'unshare': {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { isPublic: false, shareSlug: null },
        })
        return NextResponse.json({ success: true })
      }

      case 'updateTitle': {
        if (!title) {
          return NextResponse.json({ error: 'title is required' }, { status: 400 })
        }
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title },
        })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[ai/chat PATCH]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/ai/chat
 *
 * Delete a conversation
 *
 * Request body:
 *   conversationId: string
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, customerId: user.id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.conversation.delete({ where: { id: conversationId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ai/chat DELETE]', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
