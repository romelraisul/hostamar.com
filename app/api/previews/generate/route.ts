import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11435'
const OLLAMA_MODEL = process.env.OLLAMA_PREVIEW_MODEL || 'hermes3:latest'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId, prompt, title } = await req.json().catch(() => ({}))

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Verify video ownership if videoId is provided
    if (videoId) {
      const video = await prisma.video.findUnique({ where: { id: videoId }, select: { customerId: true } })
      if (!video || video.customerId !== authUser.id) {
        return NextResponse.json({ error: 'Video not found or unauthorized' }, { status: 403 })
      }
    }

    // Call remote Ollama to generate preview concept
    const systemPrompt = `You are an AI video preview designer for a Bangladeshi video SaaS platform called Hostamar.

Given a user's prompt and optional video info, generate a concise 10-second video preview concept.

Rules:
1. Generate a short, catchy title (max 50 chars)
2. Write a 1-2 sentence description of what the preview shows
3. Suggest visual style and mood
4. Duration should be exactly 10 seconds
5. Include Bengali cultural elements when relevant

Respond ONLY with valid JSON, no markdown:
{
  "title": "string (max 50 chars)",
  "description": "string (1-2 sentences)",
  "style": "string",
  "mood": "string",
  "duration": 10
}`

    const userPrompt = `Generate a 10-second video preview concept based on:
${title ? `Video title: ${title}` : ''}
${videoId ? `Video ID: ${videoId}` : ''}
User's prompt: ${prompt}`

    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.8, max_tokens: 500 },
      }),
    })

    if (!ollamaRes.ok) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })
    }

    const data = await ollamaRes.json()
    const rawContent = data.message?.content || ''

    // Parse JSON from response
    let concept: { title: string; description: string; style?: string; mood?: string; duration: number }
    try {
      const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
      concept = JSON.parse(cleaned)
    } catch {
      concept = {
        title: (title || 'AI Preview').slice(0, 50),
        description: rawContent.slice(0, 200),
        style: 'cinematic',
        mood: 'dynamic',
        duration: 10,
      }
    }

    // Store preview in database
    const preview = await prisma.preview.create({
      data: {
        videoId: videoId || null,
        customerId: authUser.id,
        title: concept.title || 'Untitled Preview',
        description: concept.description || '',
        thumbnailUrl: null,
        duration: concept.duration || 10,
        prompt,
        style: concept.style || 'cinematic',
        mood: concept.mood || 'dynamic',
      },
    })

    return NextResponse.json({
      success: true,
      preview: {
        id: preview.id,
        videoId: preview.videoId,
        title: preview.title,
        description: preview.description,
        thumbnailUrl: preview.thumbnailUrl,
        duration: preview.duration,
        prompt: preview.prompt,
        createdAt: preview.createdAt.toISOString(),
      },
      message: 'AI preview concept generated successfully!',
    })
  } catch (error: any) {
    console.error('Preview generation error:', error?.message || error)
    return NextResponse.json({ error: 'Preview generation failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const videoId = searchParams.get('videoId')

    const where: any = { customerId: authUser.id }
    if (videoId) where.videoId = videoId

    const previews = await prisma.preview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    })

    return NextResponse.json({
      success: true,
      previews: previews.map((p) => ({
        id: p.id,
        videoId: p.videoId,
        title: p.title,
        description: p.description,
        thumbnailUrl: p.thumbnailUrl,
        duration: p.duration,
        prompt: p.prompt,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error('Preview fetch error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to fetch previews' }, { status: 500 })
  }
}
