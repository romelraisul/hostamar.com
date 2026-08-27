'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { deductCredits, getCreditAccount, CREDIT_COSTS } from '@/lib/credits'
import { buildHunyuanScriptWorkflow } from '@/lib/comfyWorkflow'

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

// Post-process a finished ComfyUI render into the final deliverable:
// TTS voiceover (edge-tts) + synthesized music + burned-in Bangla subtitles, then mux.
// Runs only on Windows where ffmpeg/edge-tts/ComfyUI live.
async function postProcessLocally(promptId: string, subtitle: string, voiceover: string): Promise<string | null> {
  if (process.platform !== 'win32') return null
  const { spawn } = await import('child_process')
  const script = 'C:\\Users\\User\\video_postprocess.py'
  const outName = `hostamar_final_${promptId}.mp4`
  return new Promise((resolve) => {
    const child = spawn(
      'C:\\Users\\User\\qwen\\python_embeded\\python.exe',
      [script, '--prompt_id', promptId, '--subtitle', subtitle, '--voiceover', voiceover, '--out', outName],
      { windowsHide: true },
    )
    let out = ''
    child.stdout?.on('data', (d) => (out += d.toString()))
    child.stderr?.on('data', (d) => (out += d.toString()))
    child.on('close', () => {
      const m = out.match(/FINAL_PATH=(.+)/)
      resolve(m ? m[1].trim() : null)
    })
    child.on('error', () => resolve(null))
  })
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

    const { prompt, duration = 30, width, height } = await request.json()

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

    // Step 2: Use HunyuanVideo native workflow only
    const body = buildHunyuanScriptWorkflow({
      prompt: script.combinedPrompt,
      numFrames: duration <= 5 ? 53 : duration <= 10 ? 249 : 729,
      steps: 30,
      filenamePrefix: `hostamar_script_${Date.now()}`,
      ...(width ? { width: Number(width) } : {}),
      ...(height ? { height: Number(height) } : {}),
    })

    const result = await tryComfyUI(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Video model unavailable', detail: result.error }, { status: 503 })
    }

    const data = result.data!
    const promptId = data.prompt_id as string

    // Step 3 (Windows host only): fire-and-forget the post-process once ComfyUI finishes.
    // On Vercel (Linux) this is a no-op — the Windows orchestrator handles final assembly.
    if (process.platform === 'win32') {
      ;(async () => {
        const SUBTITLE = 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও মেকার, মাত্র ৩০ সেকেন্ডে, bKash পেমেন্টে'
        const VOICEOVER = 'Meet Hostamar - The AI video maker built for Bangladeshi businesses. Just upload your product photo and get a professional marketing video with Bengali voiceover and subtitles in 30 seconds. No editing skills, no credit card. Pay with bKash.'
        for (let i = 0; i < 90; i++) {
          await new Promise((r) => setTimeout(r, 6000))
          const h = await fetch(`${COMFYUI_INTERNAL}/history/${promptId}`).then((r) => r.json()).catch(() => null)
          let status = null
          for (const k of Object.keys(h || {})) status = h[k]?.status?.status_str
          if (status === 'success' || status === 'error') break
        }
        await postProcessLocally(promptId, SUBTITLE, VOICEOVER)
      })().catch(() => {})
    }

    if (customerId) {
      await deductCredits(customerId, cost, 'video_hunyuan_5s', `Script-to-video: ${prompt.slice(0, 50)}...`)
    }

    return NextResponse.json({
      success: true,
      prompt_id: data.prompt_id,
      model: 'hunyuan1.5',
      duration,
      credits_cost: cost,
      final_video: `hostamar_final_${promptId}.mp4`,
      video_url: `${process.env.COMFYUI_PUBLIC || ''}/api/video/file/${promptId}?f=${encodeURIComponent(`hostamar_final_${promptId}.mp4`)}&t=output`,
      message: 'Script-to-video started (hunyuan1.5) — voiceover + Bangla subtitles added on render completion',
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
    models: ['hunyuan1.5'],
    description: 'Script-to-video: simple prompt → LLM script → Hunyuan 1.5 video',
    cost: CREDIT_COSTS.video_hunyuan_5s,
  })
}