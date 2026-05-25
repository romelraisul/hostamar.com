/**
 * Video Generation Worker
 *
 * BullMQ worker that listens for 'generate-video' jobs.
 * Workflow:
 *   1. Receive job: {script, style, voiceOver, duration, userId}
 *   2. Generate images via Replicate (flux-schnell)
 *   3. Assemble video with ffmpeg (images + voiceOver + text overlays)
 *   4. Upload result to R2
 *   5. Update job progress throughout
 *
 * Run with: npx tsx workers/video-generation.ts
 * Or in production as: node dist/workers/video-generation.js
 */
import { Worker, type Job } from 'bullmq';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { getRedisConnection, QUEUE_NAMES, type VideoGenerationJobData } from '@/lib/queue';
import { generateImages, getPrediction } from '@/lib/replicate';
import { uploadFromPath } from '@/lib/r2';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------

const TEMP_DIR = path.join(process.cwd(), 'temp', 'video-generation');
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

// Style presets — passed as prompts / ffmpeg filter params
const STYLE_PRESETS: Record<string, {
  imagePromptPrefix: string;
  videoFilters: string[];
  audioFade: number;
}> = {
  cinematic: {
    imagePromptPrefix: 'Cinematic shot, film grain, dramatic lighting, 4K, ',
    videoFilters: ['colorbalance=rs=.1:gs=.05:bs=-.05', 'unsharp=5:5:0.8'],
    audioFade: 0.5,
  },
  modern: {
    imagePromptPrefix: 'Clean modern look, bright lighting, vibrant colors, high contrast, ',
    videoFilters: ['eq=brightness=0.05:saturation=1.2'],
    audioFade: 0.3,
  },
  vintage: {
    imagePromptPrefix: 'Vintage film look, warm tone, slight sepia, film grain, ',
    videoFilters: ['colorbalance=rs=.15:gs=.05:bs=-.1', 'curves=vintage'],
    audioFade: 0.5,
  },
  minimalist: {
    imagePromptPrefix: 'Minimalist style, soft lighting, pastel colors, clean composition, ',
    videoFilters: ['eq=brightness=0.1:contrast=0.9:saturation=0.7'],
    audioFade: 0.3,
  },
};

// ---------------------------------------------------------------
// Worker Definition
// ---------------------------------------------------------------

const worker = new Worker<VideoGenerationJobData>(
  QUEUE_NAMES.VIDEO_GENERATION,
  async (job: Job<VideoGenerationJobData>) => {
    const { script, style, voiceOver, duration, userId, previewId } = job.data;

    console.log(`[VideoGen Worker] Starting job ${job.id} for user ${userId}`);
    console.log(`[VideoGen Worker] Style: ${style}, Duration: ${duration}s`);

    // --- Phase 1: Initialize ---
    await job.updateProgress(0);
    await updateJobStatus(job, userId, previewId, 'initializing');

    const jobId = job.id!;
    const workDir = path.join(TEMP_DIR, jobId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      // --- Phase 2: Generate images with Replicate ---
      await job.updateProgress(15);
      await updateJobStatus(job, userId, previewId, 'generating_images');

      const stylePreset = STYLE_PRESETS[style] || STYLE_PRESETS.modern;
      const imagePrompt = `${stylePreset.imagePromptPrefix}${script}`;

      // Generate scene images (1 image per 5 seconds of video, minimum 2)
      const numImages = Math.max(2, Math.ceil(duration / 5));
      console.log(`[VideoGen Worker] Generating ${numImages} images via Replicate...`);

      const imagePromises: Promise<string[]>[] = [];
      for (let i = 0; i < numImages; i++) {
        const scenePrompt = `${imagePrompt} — scene ${i + 1}: ${getSceneDescription(script, i, numImages)}`;
        imagePromises.push(
          generateImages(scenePrompt, {
            num_outputs: 1,
            width: 1920,
            height: 1080,
            num_inference_steps: 4,
            output_format: 'png',
          })
        );
      }

      const imageResults = await Promise.all(imagePromises);
      const imageUrls = imageResults.flat();

      console.log(`[VideoGen Worker] Generated ${imageUrls.length} images`);

      // Download images locally for ffmpeg assembly
      await job.updateProgress(40);
      await updateJobStatus(job, userId, previewId, 'downloading_assets');

      const imagePaths: string[] = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const ext = path.extname(new URL(imageUrls[i]).pathname) || '.png';
        const destPath = path.join(workDir, `scene_${String(i).padStart(3, '0')}${ext}`);
        await downloadFile(imageUrls[i], destPath);
        imagePaths.push(destPath);
        console.log(`[VideoGen Worker] Downloaded image ${i + 1}/${imageUrls.length}`);
      }

      // --- Phase 3: Prepare voice-over ---
      await job.updateProgress(60);
      await updateJobStatus(job, userId, previewId, 'assembling_video');

      // voiceOver can be a URL or text to synthesize
      const voiceOverPath = path.join(workDir, 'voiceover.mp3');

      if (voiceOver && voiceOver.startsWith('http')) {
        // It's already a URL — download it
        await downloadFile(voiceOver, voiceOverPath);
      } else if (voiceOver) {
        // It's text — we'd use TTS (for now create a silent track)
        // In production, integrate with ElevenLabs or Google TTS here
        console.log('[VideoGen Worker] voiceOver is text, would use TTS. Creating silent track.');
        await createSilentAudio(voiceOverPath, duration);
      } else {
        // No voice-over — create silent track
        await createSilentAudio(voiceOverPath, duration);
      }

      // --- Phase 4: Assemble video with ffmpeg ---
      await job.updateProgress(75);
      await updateJobStatus(job, userId, previewId, 'rendering_video');

      const outputPath = path.join(workDir, 'final.mp4');
      await assembleVideo({
        imagePaths,
        voiceOverPath,
        outputPath,
        duration,
        style,
        filters: stylePreset.videoFilters,
        audioFade: stylePreset.audioFade,
        job,
      });

      console.log(`[VideoGen Worker] Video assembled: ${outputPath}`);

      // --- Phase 5: Upload to R2 ---
      await job.updateProgress(90);
      await updateJobStatus(job, userId, previewId, 'uploading');

      const uploadResult = await uploadFromPath(outputPath, `videos/${userId}`);

      console.log(`[VideoGen Worker] Uploaded to R2: ${uploadResult.url}`);

      // --- Phase 6: Update DB records ---
      await job.updateProgress(100);
      await updateJobStatus(job, userId, previewId, 'complete', uploadResult.url);

      // Update VideoQueue record if one exists
      if (previewId) {
        await prisma.preview.update({
          where: { id: previewId },
          data: {
            videoUrl: uploadResult.url,
            renderStatus: 'complete',
          },
        }).catch((err) => {
          console.error(`[VideoGen Worker] Failed to update preview ${previewId}:`, err.message);
        });
      }

      console.log(`[VideoGen Worker] Job ${job.id} completed successfully`);

      return {
        success: true,
        videoUrl: uploadResult.url,
        key: uploadResult.key,
        imagesGenerated: imageUrls.length,
      };
    } catch (error: any) {
      console.error(`[VideoGen Worker] Job ${job.id} failed:`, error.message);
      await updateJobStatus(job, userId, previewId, 'failed', undefined, error.message);
      throw error; // BullMQ will handle retries
    } finally {
      // Cleanup temp files
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 2, // process up to 2 jobs concurrently
    lockDuration: 300000, // 5 minutes lock
    stalledInterval: 60000, // check for stalled jobs every 60s
    maxStalledCount: 3,
  }
);

// ---------------------------------------------------------------
// FFmpeg Video Assembly
// ---------------------------------------------------------------

interface AssembleParams {
  imagePaths: string[];
  voiceOverPath: string;
  outputPath: string;
  duration: number;
  style: string;
  filters: string[];
  audioFade: number;
  job: Job;
}

async function assembleVideo(params: AssembleParams): Promise<void> {
  const { imagePaths, voiceOverPath, outputPath, duration, filters, audioFade, job } = params;
  const { execa } = await import('execa');

  // Calculate display duration per image
  const imageDuration = duration / imagePaths.length;

  // Build input arguments
  const inputArgs: string[] = [];
  const inputFiles: string[] = [];

  // Create concat demuxer file for images
  const concatLines = imagePaths.map((imgPath, i) => {
    const safePath = imgPath.replace(/'/g, "'\\''");
    return `file '${safePath}'\nduration ${imageDuration}`;
  });
  // Last frame needs extra duration
  concatLines.push(`file '${imagePaths[imagePaths.length - 1].replace(/'/g, "'\\''")}'`);

  const concatFile = path.join(path.dirname(voiceOverPath), 'concat.txt');
  await fs.writeFile(concatFile, concatLines.join('\n'));

  // Build ffmpeg command
  const filterParts: string[] = [];

  // Add image scaling to 1920x1080
  filterParts.push('[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v]');

  // Apply style filters
  if (filters.length > 0) {
    filterParts.push(`[v]${filters.join(',')}[vf]`);
    filterParts.push('[vf]');
  } else {
    filterParts.push('[v]');
  }

  // Fade in/out audio
  const audioFadeIn = `[1:a]afade=t=in:st=0:d=${audioFade}[a0]`;
  const audioFadeOut = `[a0]afade=t=out:st=${duration - audioFade}:d=${audioFade}[a]`;
  filterParts.push(audioFadeIn);
  filterParts.push(audioFadeOut);

  const filterComplex = filterParts.join(';');

  const args = [
    '-y', // overwrite output
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-i', voiceOverPath,
    '-filter_complex', filterComplex,
    '-map', '[a]' as string,
    '-map', '0:v' as string,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    '-t', String(duration),
    '-movflags', '+faststart',
    outputPath,
  ];

  // Remove the quotes from map args — they're actual ffmpeg arguments
  const ffmpegArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-i', voiceOverPath,
    '-filter_complex', filterComplex,
    '-map', '[a]',
    '-map', '0:v',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    '-t', String(duration),
    '-movflags', '+faststart',
    outputPath,
  ];

  console.log(`[VideoGen Worker] Running ffmpeg with ${imagePaths.length} images, ${duration}s duration`);

  const subprocess = execa(FFMPEG_PATH, ffmpegArgs, {
    timeout: 600000, // 10 minutes max
  });

  // Track progress from ffmpeg stderr
  if (subprocess.stderr) {
    subprocess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const seconds = parseFloat(timeMatch[3]);
        const elapsed = hours * 3600 + minutes * 60 + seconds;
        const progress = Math.min(0.74 + (elapsed / duration) * 0.16, 0.9);
        job.updateProgress(Math.round(progress * 100)).catch(() => {});
      }
    });
  }

  await subprocess;
  console.log('[VideoGen Worker] ffmpeg completed');
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

async function createSilentAudio(outputPath: string, durationSec: number): Promise<void> {
  const { execa } = await import('execa');
  await execa(FFMPEG_PATH, [
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', String(durationSec),
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ]);
}

function getSceneDescription(script: string, sceneIndex: number, totalScenes: number): string {
  const words = script.split(/\s+/);
  const wordsPerScene = Math.max(1, Math.floor(words.length / totalScenes));
  const start = sceneIndex * wordsPerScene;
  const end = Math.min(start + wordsPerScene, words.length);
  const sceneWords = words.slice(start, end);
  return sceneWords.join(' ') || script.slice(0, 100);
}

async function updateJobStatus(
  job: Job<VideoGenerationJobData>,
  userId: string,
  previewId?: string,
  status?: string,
  videoUrl?: string,
  error?: string
): Promise<void> {
  // Update the video_queue entry in Prisma if applicable
  if (previewId) {
    try {
      const updateData: Record<string, unknown> = {};
      if (status) updateData.renderStatus = status;
      if (videoUrl) updateData.videoUrl = videoUrl;
      if (error) updateData.renderError = error;

      await prisma.preview.update({
        where: { id: previewId },
        data: updateData as any,
      });
    } catch (err: any) {
      console.error(`[VideoGen Worker] Failed to update preview status:`, err.message);
    }
  }
}

// ---------------------------------------------------------------
// Start Worker
// ---------------------------------------------------------------

console.log('╔══════════════════════════════════════════════╗');
console.log('║   Hostamar Video Generation Worker           ║');
console.log('║   Queue: video-generation                    ║');
console.log('║   Redis: ' + (process.env.REDIS_URL || 'redis://localhost:6379').padEnd(36) + '║');
console.log('╚══════════════════════════════════════════════╝');

worker.on('completed', (job: Job) => {
  console.log(`[VideoGen Worker] Job ${job.id} completed`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[VideoGen Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err: Error) => {
  console.error('[VideoGen Worker] Worker error:', err.message);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[VideoGen Worker] Shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[VideoGen Worker] Shutting down...');
  await worker.close();
  process.exit(0);
});

export default worker;
