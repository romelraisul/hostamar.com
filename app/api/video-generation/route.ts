import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      type = 'text-to-video',  // 'text-to-video', 'image-to-video', 'keyframes-to-video'
      frames = 16,
      fps = 8,
      width = 576,
      height = 1024,
      steps = 25,
      guidance_scale = 7.5,
      seed
    } = await request.json()

    if (!prompt && type !== 'keyframes-to-video') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (type === 'text-to-video') {
      // Generate keyframes using Stable Diffusion, then interpolate
      const keyframePrompts = generateKeyframePrompts(prompt, frames)
      const keyframes = []

      for (let i = 0; i < keyframePrompts.length; i++) {
        const response = await fetch('http://localhost:12434/engines/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'stable-diffusion:latest',
            prompt: keyframePrompts[i],
            width,
            height,
            steps,
            guidance_scale,
            n: 1,
            response_format: 'b64_json',
            seed: seed ? seed + i : undefined
          }),
        })

        if (response.ok) {
          const data = await response.json()
          keyframes.push(data.data?.[0]?.b64_json)
        }
      }

      return NextResponse.json({
        success: true,
        type: 'keyframes',
        keyframes,
        prompt,
        frames: keyframes.length,
        width,
        height,
        note: 'Use ffmpeg or a video library to interpolate keyframes into video'
      })
    }

    if (type === 'image-to-video') {
      // For future: use Stable Video Diffusion when available
      return NextResponse.json({
        success: false,
        error: 'Image-to-video requires Stable Video Diffusion model (not yet in Docker Model Runner)'
      }, { status: 501 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Video generation failed' 
    }, { status: 500 })
  }
}

function generateKeyframePrompts(mainPrompt: string, numFrames: number): string[] {
  // Generate intermediate prompts for keyframes
  const prompts = []
  const numKeyframes = Math.min(Math.ceil(numFrames / 4), 8) // 8 keyframes max
  
  for (let i = 0; i < numKeyframes; i++) {
    const progress = i / (numKeyframes - 1)
    prompts.push(`${mainPrompt}, frame ${i + 1} of ${numKeyframes}, smooth transition, high quality, cinematic`)
  }
  
  return prompts
}

export async function GET() {
  return NextResponse.json({
    models: ['stable-diffusion:latest'],
    capabilities: ['text-to-image', 'keyframes-for-video'],
    video_types: ['keyframes', 'text-to-video-keyframes'],
    note: 'Full video generation requires Stable Video Diffusion or similar model'
  })
}
