import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11435'
const OLLAMA_MODEL = process.env.OLLAMA_SUBTITLE_MODEL || 'hermes3:latest'

interface SubtitleSegment {
  start: number
  end: number
  text: string
}

// POST: Generate subtitles for a video
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { videoId, language } = body

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const lang = language || 'bn'
    if (!['bn', 'en'].includes(lang)) {
      return NextResponse.json({ error: 'Language must be "bn" or "en"' }, { status: 400 })
    }

    // Fetch the video and verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.customerId !== authUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if subtitles already exist for this video/language
    const existing = await prisma.subtitle.findFirst({
      where: { videoId, language: lang },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        subtitle: existing,
        cached: true,
        message: lang === 'bn' ? 'সাবটাইটেল ইতিমধ্যেই জেনারেট করা হয়েছে' : 'Subtitles already generated',
      })
    }

    // Build prompt for subtitle generation
    const languageInstruction = lang === 'bn'
      ? 'Reply in Bengali exclusively.'
      : 'Reply in English exclusively.'

    const systemPrompt = `You are an expert subtitle and script writer for video content. ${languageInstruction}

Given a video title and description, generate a realistic subtitle transcript as if it were spoken in a video.

Rules:
1. Generate 8-12 subtitle segments covering 30-60 seconds of spoken content
2. Each segment must have: start time (seconds), end time (seconds), text
3. Timestamps should be realistic (no gaps, sequential)
4. Text should be natural spoken language related to the video topic
5. Each segment text should be 1-2 sentences (5-20 words)
6. Total duration should be between 30-60 seconds

Respond with valid JSON ONLY, no markdown, no code fences:
{
  "segments": [
    { "start": 0, "end": 3.5, "text": "..." },
    { "start": 3.5, "end": 7.2, "text": "..." }
  ],
  "fullText": "The complete concatenated transcript text."
}`

    const userPrompt = `Generate a subtitle transcript for this video:

Title: ${video.title || 'Untitled'}
Description: ${video.description || ''}
Topic: ${video.topic || ''}
Prompt: ${video.prompt || ''}
Script: ${video.script || ''}

Language: ${lang === 'bn' ? 'Bengali (বাংলা)' : 'English'}

Generate natural spoken subtitles that match this video content.`

    // Call remote Ollama
    const ollamaResponse = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 2000,
        },
      }),
    })

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text()
      console.error('Ollama API error:', ollamaResponse.status, errorText)
      return NextResponse.json(
        { error: 'AI subtitle generation failed. Please try again.' },
        { status: 502 }
      )
    }

    const ollamaData = await ollamaResponse.json()
    const rawContent = ollamaData.message?.content || ''

    // Parse JSON from response (handle potential markdown fences)
    let parsed: { segments: SubtitleSegment[]; fullText?: string }
    try {
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse AI response. Please try again.' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response. Please try again.' },
          { status: 500 }
        )
      }
    }

    if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      return NextResponse.json(
        { error: 'AI returned invalid subtitle format. Please try again.' },
        { status: 500 }
      )
    }

    // Build full text from segments if not provided
    const fullText = parsed.fullText || parsed.segments.map((s: SubtitleSegment) => s.text).join(' ')

    // Store in database
    const subtitle = await prisma.subtitle.create({
      data: {
        videoId,
        language: lang,
        content: fullText,
        timestamps: parsed.segments,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: authUser.id,
        action: 'subtitle_generated',
        description: `Subtitles generated for video: ${video.title} (${lang})`,
        metadata: JSON.stringify({ videoId, language: lang, segmentCount: parsed.segments.length }),
      },
    })

    return NextResponse.json({
      success: true,
      subtitle,
      cached: false,
      message: lang === 'bn'
        ? 'সাবটাইটেল সফলভাবে জেনারেট হয়েছে!'
        : 'Subtitles generated successfully!',
    })
  } catch (error: any) {
    console.error('Subtitle generation error:', error?.message || error)
    return NextResponse.json(
      { error: 'সাবটাইটেল জেনারেশনে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।' },
      { status: 500 }
    )
  }
}

// GET: Fetch subtitles for a video
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get('videoId')
    const language = searchParams.get('language') || undefined

    if (!videoId) {
      return NextResponse.json({ error: 'videoId query parameter required' }, { status: 400 })
    }

    // Verify video ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { customerId: true, title: true },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.customerId !== authUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const where: any = { videoId }
    if (language) where.language = language

    const subtitles = await prisma.subtitle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      subtitles,
      video: { id: videoId, title: video.title },
    })
  } catch (error) {
    console.error('Subtitle fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch subtitles' }, { status: 500 })
  }
}
