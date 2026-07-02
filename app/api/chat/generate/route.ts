import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11435'
const DEFAULT_MODEL = 'qwen3.6:latest'

type ChatRole = 'user' | 'assistant'

interface MessagePayload {
  role: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      message,
      history = [],
      conversationId,
      model = DEFAULT_MODEL,
      videoId = null,
    } = body as {
      message?: string
      history?: MessagePayload[]
      conversationId?: string
      model?: string
      videoId?: string | null
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let activeConversationId = conversationId

    if (!activeConversationId) {
      const conversation = await prisma.conversation.create({
        data: {
          userId: authUser.id,
          title: message.slice(0, 60) || 'New conversation',
        },
        select: { id: true },
      })
      activeConversationId = conversation.id
    }

    // Build video context if provided
    let videoContext = ''
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { title: true, description: true, prompt: true, script: true, topic: true, language: true, createdAt: true },
      })
      if (video) {
        videoContext = `You are helping the user with the following video content:\n` +
          `Title: ${video.title}\nDescription: ${video.description ?? 'N/A'}\nTopic: ${video.topic ?? 'N/A'}\n` +
          `Script: ${video.script ?? 'N/A'}\nLanguage: ${video.language}\nCreated: ${video.createdAt.toISOString().split('T')[0]}\n\n`
      }
    }

    const systemPrompt = `You are Hostamar AI, a helpful video content assistant for a Bangladeshi AI video SaaS platform.\n` +
      `${videoContext ? videoContext : ''}Keep responses concise and practical. Match the user's language. Use Bengali when the user writes in Bengali.`

    const messagesPayload = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-12) : []),
      { role: 'user' as ChatRole, content: message },
    ]

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: activeConversationId,
        userId: authUser.id as any,
        role: 'user',
        content: message,
        model,
      } as any,
    })

    // Request streaming from local Ollama
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messagesPayload,
        stream: true,
        options: { temperature: 0.7 },
      }),
    }).catch(() => undefined)

    if (!ollamaRes || !ollamaRes.ok) {
      // Save assistant fallback inline to keep schema consistent
      await prisma.message.create({
        data: {
          conversationId: activeConversationId,
          userId: authUser.id as any,
          role: 'assistant',
          content: 'AI service unavailable right now.',
          model,
        } as any,
      })
      return NextResponse.json(
        { error: 'AI service unavailable', conversationId: activeConversationId },
        { status: 502 }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = ollamaRes.body?.getReader()
        if (!reader) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let fullContent = ''

        try {
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
                  fullContent += token
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token, conversationId: activeConversationId })}\n\n`))
                }
              } catch {
                // skip malformed JSON
              }
            }
          }

          // Persist full assistant message after stream ends
          if (fullContent) {
            const messageData: any = {
              conversationId: activeConversationId,
              userId: authUser.id,
              role: 'assistant',
              content: fullContent,
              model,
            }
            await prisma.message.create({
              data: messageData,
            })

            await prisma.conversation.update({
              where: { id: activeConversationId },
              data: { updatedAt: new Date() },
            })
          }
        } catch {
          // ignore stream errors, try to save partial content
          if (fullContent) {
            const fallbackData: any = {
              conversationId: activeConversationId,
              userId: authUser.id,
              role: 'assistant',
              content: fullContent,
              model,
            }
            await prisma.message.create({
              data: fallbackData,
            })
          }
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': activeConversationId,
      },
    })
  } catch (error: any) {
    console.error('Chat generate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
