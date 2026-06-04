import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { prompt } = await request.json()

  // Connect to ComfyUI for video generation
  const comfyuiResponse = await fetch('http://localhost:8188/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      model: 'llava:13b',
      duration: 10
    })
  })

  return NextResponse.json({
    success: true,
    message: 'ভিডিও তৈরি শুরু হয়েছে',
    jobId: Date.now()
  })
}