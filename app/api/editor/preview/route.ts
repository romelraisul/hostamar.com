export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11435'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId, title, subtitle } = await req.json().catch(() => ({}))

    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 })
    }

    // Call Ollama to generate a preview description/concept
    const prompt = `You are a video editor AI. Given a template and content, describe the video preview concept.

Template ID: ${templateId}
Title: ${title || 'Untitled'}
Subtitle: ${subtitle || ''}

Respond with a creative, 2-3 sentence description of what the video preview looks like, including visual style, mood, and color scheme. Mention Bangladeshi cultural elements if relevant. Keep it concise.

Respond in JSON format:
{
  "description": "string",
  "mood": "string",
  "style": "string",
  "duration": 10
}`

    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_EDITOR_MODEL || 'hermes3:latest',
        messages: [
          { role: 'system', content: 'You are a creative video editor AI assistant. Respond ONLY with valid JSON, no markdown.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
        options: { temperature: 0.8, max_tokens: 500 },
      }),
    })

    if (!ollamaRes.ok) {
      return NextResponse.json({
        success: true,
        previewUrl: null,
        concept: {
          description: `Preview for template "${templateId}" with title "${title || 'Untitled'}"`,
          mood: 'dynamic',
          style: 'modern',
          duration: 10,
        },
      })
    }

    const data = await ollamaRes.json()
    const content = data.message?.content || ''

    let concept
    try {
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
      concept = JSON.parse(cleaned)
    } catch {
      concept = {
        description: content.slice(0, 200),
        mood: 'creative',
        style: 'template-based',
        duration: 10,
      }
    }

    return NextResponse.json({
      success: true,
      previewUrl: null,
      concept,
    })
  } catch (error) {
    console.error('Editor preview error:', error)
    return NextResponse.json(
      { success: true, previewUrl: null, concept: { description: 'Preview generation failed', mood: 'error', style: 'none', duration: 10 } },
      { status: 200 }
    )
  }
}