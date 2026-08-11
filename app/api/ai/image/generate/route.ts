import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { validateApiKey, checkApiKeyRateLimit } from '@/lib/apikey'

const COMFYUI_BASE = process.env.COMFYUI_URL || process.env.COMFYUI_PUBLIC_URL || 'http://localhost:8188'

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT = 10 // requests per window
const RATE_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false
  }
  
  entry.count++
  return true
}

// Validate prompt for injection attacks
function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt must be a string' }
  }
  
  if (prompt.length < 3) {
    return { valid: false, error: 'Prompt too short (min 3 chars)' }
  }
  
  if (prompt.length > 2000) {
    return { valid: false, error: 'Prompt too long (max 2000 chars)' }
  }
  
  // Block code injection attempts
  const blockedPatterns = [
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bos\s*\.\s*system/i,
    /\bsubprocess\b/i,
    /\b__import__\b/i,
    /\bimport\s+os\b/i,
    /\bopen\s*\(\s*['"]\s*\//i,
    /\.\.\//, // path traversal
    /\bshutdown\b/i,
    /\brm\s+-rf\b/i,
    /<\s*script/i,
    /javascript\s*:/i,
    /\bon\w+\s*=/i, // event handlers
  ]
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: 'Prompt contains blocked content' }
    }
  }
  
  return { valid: true }
}

// Validate dimensions
function validateDimensions(width: number, height: number): { valid: boolean; error?: string } {
  const validSizes = [256, 512, 720, 768, 832, 1024, 1280, 1536, 1920, 2048]
  
  if (!validSizes.includes(width) || !validSizes.includes(height)) {
    return { valid: false, error: 'Invalid dimensions. Use: 256, 512, 720, 768, 832, 1024, 1280, 1536, 1920, 2048' }
  }
  
  if (width * height > 2048 * 2048) {
    return { valid: false, error: 'Total pixels too large (max 2048x2048)' }
  }
  
  return { valid: true }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET() {
  // Return available models (public info)
  const models = [
    { id: 'sd_xl_turbo_1.0_fp16.safetensors', name: 'SDXL Turbo', speed: '~1s', quality: 'Good', vram: '6GB' },
  ]
  
  return NextResponse.json({
    models,
    comfyui_online: false, // Don't expose internal status
    rate_limit: `${RATE_LIMIT} requests/minute`,
  })
}

export async function POST(req: NextRequest) {
  try {
    // Check for API key first (Bearer token or X-API-Key header)
    const authHeader = req.headers.get('authorization')
    const apiKeyHeader = req.headers.get('x-api-key')
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader
    
    if (apiKey) {
      const keyData = await validateApiKey(apiKey)
      if (!keyData) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      }
      if (!keyData.canGenerateImage) {
        return NextResponse.json({ error: 'API key does not have image generation permission' }, { status: 403 })
      }
      // Rate limit by API key
      const allowed = await checkApiKeyRateLimit(keyData.id, keyData.rateLimitPerMinute)
      if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
    } else {
      // Fall back to cookie auth
      const user = await getAuthUser(req)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized — provide API key or login' }, { status: 401 })
      }
      if (!checkRateLimit(clientIp)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
    }

    const body = await req.json().catch(() => ({}))
    
    // Validate prompt
    const promptCheck = validatePrompt(body.prompt)
    if (!promptCheck.valid) {
      return NextResponse.json({ error: promptCheck.error }, { status: 400 })
    }
    
    // Validate dimensions
    const width = body.width || 1024
    const height = body.height || 1024
    const dimCheck = validateDimensions(width, height)
    if (!dimCheck.valid) {
      return NextResponse.json({ error: dimCheck.error }, { status: 400 })
    }
    
    // Validate model (whitelist only - prevent model path injection)
    const allowedModels = ['sd_xl_turbo_1.0_fp16.safetensors']
    const model = body.model || 'sd_xl_turbo_1.0_fp16.safetensors'
    if (!allowedModels.includes(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }
    
    // Validate steps (prevent abuse)
    const steps = Math.min(Math.max(body.steps || 4, 1), 50)
    const cfg = Math.min(Math.max(body.cfg || 7.0, 1), 30)
    const seed = body.seed ? Math.floor(body.seed) % 2147483647 : Math.floor(Math.random() * 2147483647)
    
    // Sanitize prompt (remove potential XSS/injection)
    const sanitizedPrompt = body.prompt
      .replace(/[<>]/g, '')
      .replace(/["\\]/g, '')
      .slice(0, 2000)
    
    const sanitizedNegative = (body.negativePrompt || 'blurry, low quality, ugly, distorted, watermark, text')
      .replace(/[<>]/g, '')
      .replace(/["\\]/g, '')
      .slice(0, 1000)

    // Check ComfyUI availability
    const healthResp = await fetch(`${COMFYUI_BASE}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null)
    
    if (!healthResp || !healthResp.ok) {
      return NextResponse.json({ error: 'Image generation service temporarily unavailable' }, { status: 503 })
    }

    // Build SDXL workflow
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": seed,
          "steps": steps,
          "cfg": cfg,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0],
        },
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": model,
        },
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": width,
          "height": height,
          "batch_size": 1,
        },
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": sanitizedPrompt,
          "clip": ["4", 1],
        },
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": sanitizedNegative,
          "clip": ["4", 1],
        },
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2],
        },
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": `hostamar_${Date.now()}`,
          "images": ["8", 0],
        },
      },
    }

    // Submit to ComfyUI
    const submitResp = await fetch(`${COMFYUI_BASE}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(10000),
    })

    if (!submitResp.ok) {
      return NextResponse.json({ error: 'Failed to submit to generation service' }, { status: 500 })
    }

    const { prompt_id } = await submitResp.json()

    // Poll for completion (up to 2 minutes)
    const startTime = Date.now()
    while (Date.now() - startTime < 120000) {
      await sleep(2000)
      
      const histResp = await fetch(`${COMFYUI_BASE}/history/${prompt_id}`, {
        signal: AbortSignal.timeout(5000),
      }).catch(() => null)
      
      if (!histResp || !histResp.ok) continue
      
      const history = await histResp.json()
      const entry = history[prompt_id]
      if (!entry) continue
      
      const status = entry.status?.status_str
      if (status === 'success') {
        const images = entry.outputs?.['9']?.images || []
        const imageUrls = images.map((img: { filename: string; type: string }) => {
          const cleanName = img.filename.replace(/\\/g, '/').split('/').pop() || img.filename
          return `${COMFYUI_BASE}/view?type=${img.type}&filename=${encodeURIComponent(cleanName)}`
        })
        
        return NextResponse.json({
          success: true,
          images: imageUrls,
          prompt_id,
          model,
          seed,
          steps,
        })
      }
      if (status === 'error') {
        return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Generation timed out' }, { status: 408 })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
