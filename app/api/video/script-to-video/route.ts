'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { deductCredits, getCreditAccount, CREDIT_COSTS } from '@/lib/credits'
import { buildHunyuanScriptWorkflow, buildWanT2VWorkflow } from '@/lib/comfyWorkflow'

const COMFYUI_INTERNAL = process.env.COMFYUI_URL || 'http://localhost:8188'

async function generateScript(prompt: string): Promise<any> {
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
    combinedPrompt: `Cinematic intro for Hostamar.com, a Bangladeshi AI video maker startup. Style: Photorealistic, 4K, modern tech commercial, bright. Duration: 30s, 16:9. Visuals: Bangladeshi female entrepreneur struggling to edit video, then using Hostamar.com to generate professional video in 30 seconds. Show bKash payment, no credit card needed, laptop and phone mockups with video playing. Large burned-in Bangla subtitles throughout: "বাংলাদেশি ব্যবসার জন্য AI ভিডিও মেকার, মাত্র ৩০ সেকেন্ডে, bKash পেমেন্টে". English voiceover with slight Bangladeshi accent: "Meet Hostamar - The AI video maker built for Bangladeshi businesses. Just upload your product photo and get a professional marketing video with Bengali voiceover and subtitles in 30 seconds. No editing skills, no credit card. Pay with bKash." Music: Uplifting corporate tech. End card: Hostamar.com logo + tagline. User prompt: ${prompt}`
  }
}

async function tryComfyUI(body: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
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
      return { success: false, error: `ComfyUI HTTP ${response.status}: ${err.slice(0, 300)}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Network error' }
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

    // Step 2: Try Hunyuan first, fallback to Wan2.1
    let body = buildHunyuanScriptWorkflow({
      prompt: script.combinedPrompt,
      numFrames: duration <= 5 ? 49 : duration <= 10 ? 81 : 121,
      steps: 30,
      filenamePrefix: `hostamar_script_${Date.now()}`,
    })

    let result = await tryComfyUI(body)
    let modelUsed = 'hunyuan1.5'
    let productBucket: 'video_hunyuan_5s' | 'video_wan_5s' = 'video_hunyuan_5s'

    // If Hunyuan fails (e.g., GGUF node not loaded), fallback to Wan2.1
    if (!result.success) {
      console.log('Hunyuan failed, falling back to Wan2.1:', result.error)
      body = buildWanT2VWorkflow({
        prompt: script.combinedPrompt,
        numFrames: duration <= 5 ? 49 : 81,
        steps: 30,
        filenamePrefix: `hostamar_script_${Date.now()}`,
      })
      result = await tryComfyUI(body)
      modelUsed = 'wan2.1'
      productBucket = 'video_wan_5s'

      if (!result.success) {
        return NextResponse.json({ error: 'All video models unavailable', detail: result.error }, { status: 503 })
      }
    }

    const data = result.data!

    if (customerId) {
      await deductCredits(customerId, cost, productBucket, `Script-to-video: ${prompt.slice(0, 50)}...`)
    }

    return NextResponse.json({
      success: true,
      prompt_id: data.prompt_id,
      model: modelUsed,
      duration,
      credits_cost: cost,
      message: `Script-to-video generation started (${modelUsed})`,
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
    models: ['hunyuan1.5', 'wan2.1'],
    description: 'Script-to-video: simple prompt → LLM script → Hunyuan 1.5 (fallback Wan2.1) video',
    cost: CREDIT_COSTS.video_hunyuan_5s,
  })
}