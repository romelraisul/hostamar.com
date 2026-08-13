export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { getCreditAccount, deductCredits, CREDIT_COSTS } from '@/lib/credits'

const OLLAMA_BASE = process.env.QWEN_URL || process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11435'
const DEFAULT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'Qwen/Qwen3.6-35B-A3B-FP8'

// Google Token Guard for fallback
let googleGuard: any = null
async function getGoogleGuard() {
  if (!googleGuard) {
    const { GoogleTokenGuard } = await import('@/guard/google_token_guard')
    googleGuard = new GoogleTokenGuard()
  }
  return googleGuard
}

// Helper: call Google Gemini with Token Guard
async function callGemini(messages: any[]): Promise<string> {
  const guard = await getGoogleGuard()
  
  const callFn = async (key: string) => {
    const systemMsg = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')
    const contents = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
    
    const systemInstruction = systemMsg
      ? { parts: [{ text: systemMsg.content }] }
      : undefined

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
        }),
      }
    )
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      const error = new Error(`Gemini ${resp.status}`)
      ;(error as any).response = { json: () => Promise.resolve(err), text: JSON.stringify(err) }
      throw error
    }
    return resp.json()
  }

  const result = await guard.callWithGuard(callFn, 'gemini-2.5-flash')
  const data = result[0]
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'
}

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

    const chatCost = CREDIT_COSTS.chat_message
    const chatAccount = await getCreditAccount(authUser.id)
    if (chatAccount.credits < chatCost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: chatCost, balance: chatAccount.credits },
        { status: 402 },
      )
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

    await deductCredits(authUser.id, chatCost, 'chat_message', 'Chat message')

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
      { role: 'system' as ChatRole, content: systemPrompt },
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

    // Request from local Ollama
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messagesPayload,
        stream: false,
        options: { temperature: 0.7 },
      }),
    }).catch(() => undefined)

    let fallbackUsed = false
    let fullContent = ''

    if (!ollamaRes || !ollamaRes.ok) {
      fallbackUsed = true
      try {
        fullContent = await callGemini(messagesPayload)
      } catch (geminiError) {
        console.error('[Chat] Gemini fallback failed:', geminiError)
        // Last resort: deterministic mock response so the endpoint never 500s
        fullContent = `I received your message: "${message}". Local AI models are currently unavailable. Please configure OLLAMA_BASE or GOOGLE_API_KEY for AI responses.`
      }
    } else {
      const data = await ollamaRes.json().catch(() => null)
      fullContent = data?.message?.content || 'No response generated.'
    }

    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: activeConversationId,
        userId: authUser.id as any,
        role: 'assistant',
        content: fullContent,
        model,
      } as any,
    })

    await prisma.conversation.update({
      where: { id: activeConversationId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      content: fullContent,
      conversationId: activeConversationId,
      fallback: fallbackUsed,
    })
  } catch (error) {
    console.error('Chat generate error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    const errCode = (error as any)?.code
    const errMeta = (error as any)?.meta
    return NextResponse.json(
      { error: 'Internal server error', debug: { message: errMsg, code: errCode, meta: errMeta } },
      { status: 500 }
    )
  }
}
