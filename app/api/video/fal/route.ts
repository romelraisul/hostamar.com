import { NextRequest, NextResponse } from 'next/server'

// fal.ai video generation fallback
// When ComfyUI (Windows host) is offline, use fal.ai API instead

const FAL_API_KEY = process.env.FAL_API_KEY
const FAL_API_URL = 'https://fal.ai/api'

export async function POST(req: NextRequest) {
  if (!FAL_API_KEY) {
    return NextResponse.json(
      { error: 'fal.ai not configured', fallback: 'comfyui' },
      { status: 501 }
    )
  }

  try {
    const body = await req.json()
    const { prompt, model, duration, aspect_ratio } = body

    // Default to Kling 3.0 for video generation
    const modelId = model || 'fal-ai/kling-video/v2/standard/text-to-video'

    const response = await fetch(`${FAL_API_URL}/${modelId}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt || 'A beautiful product showcase video',
        duration: duration || '5',
        aspect_ratio: aspect_ratio || '16:9',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[fal.ai] API error:', errorText)
      return NextResponse.json(
        { error: 'fal.ai generation failed', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      provider: 'fal.ai',
      model: modelId,
      result: data,
    })
  } catch (error) {
    console.error('[fal.ai] Error:', error)
    return NextResponse.json(
      { error: 'Video generation failed', details: String(error) },
      { status: 500 }
    )
  }
}

// Check fal.ai queue status
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('requestId')
  if (!requestId) {
    return NextResponse.json({ error: 'requestId required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${FAL_API_URL}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${FAL_API_KEY}` },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Status check failed' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, status: data })
  } catch (error) {
    console.error('[fal.ai] Status check error:', error)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
