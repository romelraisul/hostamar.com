import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, negative_prompt, width = 512, height = 512, steps = 20, guidance_scale = 7.5, num_images = 1 } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Use Docker Model Runner's Diffusers API endpoint
    const response = await fetch('http://localhost:12434/engines/diffusers/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'stable-diffusion:latest',
        prompt,
        negative_prompt: negative_prompt || '',
        size: `${Math.min(width, 1024)}x${Math.min(height, 1024)}`,
        steps: Math.min(steps, 50),
        guidance_scale,
        n: Math.min(num_images, 4),
        response_format: 'b64_json'
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Stable Diffusion API error:', error)
      throw new Error(`Stable Diffusion API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      images: data.data?.map((img: any) => img.b64_json || img.url) || [],
      model: 'stable-diffusion:latest',
      prompt,
      width,
      height
    })
  } catch (error) {
    console.error('Stable Diffusion error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Image generation failed' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    model: 'stable-diffusion:latest',
    type: 'diffusers',
    capabilities: ['text-to-image'],
    default_params: {
      width: 512,
      height: 512,
      steps: 20,
      guidance_scale: 7.5,
      max_width: 1024,
      max_height: 1024,
      max_steps: 50
    }
  })
}
