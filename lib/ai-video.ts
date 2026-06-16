import Replicate from 'replicate'
import { FalClient } from '@fal-ai/client'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

const fal = new FalClient({
  credentials: process.env.FAL_AI_API_KEY,
})

export interface VideoGenerationOptions {
  prompt: string
  style?: string
  duration?: number
  aspectRatio?: string
  provider?: 'replicate' | 'fal'
}

export interface VideoGenerationResult {
  videoUrl: string
  thumbnailUrl?: string
  duration: number
  provider: string
}

export async function generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  const { prompt, style = 'cinematic', duration = 5, aspectRatio = '16:9', provider = 'replicate' } = options

  if (provider === 'fal') {
    return generateVideoFal(prompt, style, duration, aspectRatio)
  }

  return generateVideoReplicate(prompt, style, duration, aspectRatio)
}

async function generateVideoReplicate(prompt: string, style: string, duration: number, aspectRatio: string): Promise<VideoGenerationResult> {
  const model = 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438'
  
  const output = await replicate.run(model, {
    input: {
      prompt: `${prompt}, ${style} style, ${duration}s duration`,
      aspect_ratio: aspectRatio,
      motion_bucket_id: 127,
      fps: 24,
    }
  })

  return {
    videoUrl: output,
    duration,
    provider: 'replicate',
  }
}

async function generateVideoFal(prompt: string, style: string, duration: number, aspectRatio: string): Promise<VideoGenerationResult> {
  const result = await fal.subscribe('fal-ai/video-generation', {
    input: {
      prompt: `${prompt}, ${style} style`,
      duration,
      aspect_ratio: aspectRatio,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        console.log('Video generation progress:', update.logs)
      }
    },
  })

  return {
    videoUrl: result.data.video_url,
    thumbnailUrl: result.data.thumbnail_url,
    duration,
    provider: 'fal',
  }
}

export async function checkVideoStatus(videoId: string, provider: 'replicate' | 'fal'): Promise<{ status: string; videoUrl?: string }> {
  if (provider === 'fal') {
    const result = await fal.queue.status('fal-ai/video-generation', { requestId: videoId })
    return { status: result.status, videoUrl: result.data?.video_url }
  }
  
  // For Replicate, check prediction status
  const prediction = await replicate.predictions.get(videoId)
  return { status: prediction.status, videoUrl: prediction.output }
}