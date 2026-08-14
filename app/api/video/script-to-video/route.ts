'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { deductCredits, getCreditAccount, CREDIT_COSTS } from '@/lib/credits'
import { buildHunyuanScriptWorkflow } from '@/lib/comfyWorkflow'

const COMFYUI_INTERNAL = process.env.COMFYUI_URL || 'http://localhost:8188'

// Script generation prompt template
const SCRIPT_SYSTEM_PROMPT = `You are a professional video script writer for Bangladeshi AI startup Hostamar.com. 
Given a simple prompt, generate a detailed cinematic video script for a 30-second 16:9 video.

Output JSON format:
{
  "title": "string",
  "duration": 30,
  "style": "string",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 5,
      "visualDescription": "detailed visual description for this scene",
      "voiceover": "English with slight Bangladeshi accent",
      "subtitleBengali": "Bangla subtitle text"
    }
  ],
  "music": "Uplifting corporate tech",
  "endCard": "Hostamar.com logo + tagline",
  "combinedPrompt": "single detailed prompt combining all scenes for video generation"
}`

async function generateScript(prompt: string): Promise<any> {
  // Use the hosted LLM endpoint for script generation
  const response = await fetch('https://hostamar.com/api/ai/chat/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Generate a detailed video script for Hostamar.com based on this simple prompt: "${prompt}"

Requirements:
- 30 seconds, 16:9
- Photorealistic, 4K, modern tech commercial
- Bengali female entrepreneur story
- Show bKash payment, no credit card
- Laptop and phone mockups
- Large burned-in Bangla subtitles
- English voiceover with Bangladeshi accent
- Music: Uplifting corporate tech
- End card: Hostamar.com logo + tagline

Return valid JSON with scenes array and combinedPrompt for video generation.`,
      model: 'Qwen/Qwen3.6-35B-A3B-FP8',
      temperature: 0.7,
    }),
  })

  const data = await response.json()
  if (!data.content) throw new Error('Script generation failed')

  try {
    // Extract JSON from the response
    const jsonMatch = data.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(data.content)
  } catch (e) {
    console.error('Script parse error:', e)
    // Fallback script
    return {
      title: 'Hostamar.com - Bangladeshi AI Video Maker',
      duration: 30,
      style: 'Photorealistic, 4K, modern tech commercial, bright',
      scenes: [
        {
          sceneNumber: 1,
          duration: 5,
          visualDescription: 'Bangladeshi female entrepreneur sitting at desk, frustrated with complex video editing software on laptop, papers scattered around',
          voiceover: 'Meet Hostamar - The AI video maker built for Bangladeshi businesses.',
          subtitleBengali: 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও মেকার'
        },
        {
          sceneNumber: 2,
          duration: 5,
          visualDescription: 'She discovers Hostamar.com on her phone, clean interface with upload button',
          voiceover: 'Just upload your product photo and get a professional marketing video with Bengali voiceover and subtitles in 30 seconds.',
          subtitleBengali: 'মাত্র ৩০ সেকেন্ডে প্রফেশনাল ভিডিও'
        },
        {
          sceneNumber: 3,
          duration: 5,
          visualDescription: 'Upload product photo, AI generates video instantly, split screen shows before/after',
          voiceover: 'No editing skills, no credit card. Pay with bKash.',
          subtitleBengali: 'কোনো এডিটিং স্কিল লাগে না, bKash পেমেন্টে'
        },
        {
          sceneNumber: 4,
          duration: 5,
          visualDescription: 'bKash payment screen on phone, successful transaction, video downloads to laptop',
          voiceover: 'Hostamar makes video marketing accessible for every Bangladeshi entrepreneur.',
          subtitleBengali: 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও মেকার, মাত্র ৩০ সেকেন্ডে, bKash পেমেন্টে'
        },
        {
          sceneNumber: 5,
          duration: 5,
          visualDescription: 'Final video playing on laptop and phone mockups, professional quality with Bangla subtitles',
          voiceover: 'Start creating today at Hostamar dot com.',
          subtitleBengali: 'আজ থেকেই শুরু করুন Hostamar.com-এ'
        },
        {
          sceneNumber: 6,
          duration: 5,
          visualDescription: 'End card with Hostamar.com logo, tagline "AI Video for Bangladeshi Business", bKash/Nagad/Rocket icons',
          voiceover: 'Hostamar.com - AI Video for Bangladeshi Business.',
          subtitleBengali: 'Hostamar.com - বাংলাদেশি ব্যবসার জন্য AI ভিডিও'
        }
      ],
      music: 'Uplifting corporate tech',
      endCard: 'Hostamar.com logo + tagline',
      combinedPrompt: 'Cinematic intro for Hostamar.com, a Bangladeshi AI video maker startup. Photorealistic, 4K, modern tech commercial, bright. 30s, 16:9. Visuals: Bangladeshi female entrepreneur struggling to edit video, then using Hostamar.com to generate professional video in 30 seconds. Show bKash payment, no credit card needed, laptop and phone mockups with video playing. Large burned-in Bangla subtitles throughout: "বাংলাদেশি ব্যবসার জন্য AI ভিডিও মেকার, মাত্র ৩০ সেকেন্ডে, bKash পেমেন্টে". English voiceover with slight Bangladeshi accent: "Meet Hostamar - The AI video maker built for Bangladeshi businesses. Just upload your product photo and get a professional marketing video with Bengali voiceover and subtitles in 30 seconds. No editing skills, no credit card. Pay with bKash." Music: Uplifting corporate tech. End card: Hostamar.com logo + tagline.'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    const customerId = user?.id

    const { prompt, duration = 30 } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const cost = CREDIT_COSTS.video_hunyuan_5s * Math.max(1, Math.ceil(duration / 5))

    if (customerId) {
      const account = await getCreditAccount(customerId)
      if (account.credits < cost) {
        return NextResponse.json({ error: 'Insufficient credits', required: cost, balance: account.credits }, { status: 402 })
      }
    }

    // Step 1: Generate script from simple prompt
    const script = await generateScript(prompt)

    // Step 2: Build Hunyuan workflow with the combined detailed prompt
    const body = buildHunyuanScriptWorkflow({
      prompt: script.combinedPrompt,
      numFrames: duration <= 5 ? 49 : duration <= 10 ? 81 : 121,
      steps: 30,
      filenamePrefix: `hostamar_script_${Date.now()}`,
    })

    // Step 3: Submit to ComfyUI
    const response = await fetch(`${COMFYUI_INTERNAL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      return NextResponse.json({ error: 'ComfyUI unavailable', detail: err.slice(0, 300) }, { status: 503 })
    }

    const data = await response.json()

    if (customerId) {
      await deductCredits(customerId, cost, 'video_hunyuan_5s', `Script-to-video: ${prompt.slice(0, 50)}...`)
    }

    return NextResponse.json({
      success: true,
      prompt_id: data.prompt_id,
      model: 'hunyuan1.5',
      duration,
      credits_cost: cost,
      message: 'Script-to-video generation started',
      script: {
        title: script.title,
        scenes: script.scenes.length,
        combinedPrompt: script.combinedPrompt.slice(0, 200) + '...',
      },
    })
  } catch (error: any) {
    console.error('Script-to-video error:', error)
    return NextResponse.json({ error: 'Failed to start script-to-video generation', detail: error?.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    available: true,
    comfyui_url: COMFYUI_INTERNAL,
    model: 'hunyuan1.5',
    description: 'Script-to-video: simple prompt → LLM script → Hunyuan 1.5 video',
    cost: CREDIT_COSTS.video_hunyuan_5s,
  })
}