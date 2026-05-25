/**
 * Video Rendering Service
 *
 * Uses Remotion + Ollama (localhost:11435) to generate AI videos.
 * Supports Bengali and English text overlays with animated gradient backgrounds.
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from './prisma';

// ─── Constants ───────────────────────────────────────────────────────────────

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11435';
const OLLAMA_MODEL = process.env.OLLAMA_VIDEO_MODEL || 'hermes3:latest';
const VIDEOS_DIR = path.resolve(process.cwd(), 'public/videos');
const FPS = 30;

// Style presets for color palettes
const STYLE_PALETTES: Record<
  string,
  { gradient: [string, string]; brandColor: string }
> = {
  cinematic:  { gradient: ['#0f0c29', '#302b63'], brandColor: '#e94560' },
  modern:     { gradient: ['#667eea', '#764ba2'], brandColor: '#f093fb' },
  dynamic:    { gradient: ['#1a1a2e', '#16213e'], brandColor: '#0f3460' },
  vibrant:    { gradient: ['#ff6b6b', '#556270'], brandColor: '#ffd93d' },
  corporate:  { gradient: ['#0B101E', '#1B2A4A'], brandColor: '#4FC3F7' },
  warm:       { gradient: ['#c94b4b', '#4b134f'], brandColor: '#ffd700' },
  nature:     { gradient: ['#134e5e', '#71b280'], brandColor: '#a8e063' },
  dark:       { gradient: ['#000000', '#1a1a2e'], brandColor: '#e94560' },
  light:      { gradient: ['#f5f7fa', '#c3cfe2'], brandColor: '#667eea' },
  minimal:    { gradient: ['#ece9e6', '#ffffff'], brandColor: '#2d3436' },
};

const DEFAULT_PALETTE = STYLE_PALETTES.cinematic;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScriptSegment {
  text: string;
  startTime: number;
  duration: number;
}

interface VideoScript {
  title: string;
  segments: ScriptSegment[];
  music: boolean;
  language: string;
}

interface RenderResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
}

// ─── Ollama Script Generation ────────────────────────────────────────────────

/**
 * Generate a timed video script using Ollama.
 * The LLM returns a structured JSON with segments (text + timing).
 */
async function generateScript(
  prompt: string,
  style: string,
  totalDuration: number,
  title?: string
): Promise<VideoScript> {
  const systemPrompt = `You are an expert Bengali + English video script writer for Hostamar, an AI video marketing platform.

Given a user prompt, generate a structured video script with timed segments.

Rules:
- Total duration must be exactly ${totalDuration} seconds
- Create 1 title segment (2s) followed by 3-6 content segments
- Each segment has "text", "startTime" (seconds), "duration" (seconds)
- Keep text concise — max 12 words per segment
- Support Bengali (Bangla) and English — use the language that matches the prompt
- Make it natural and engaging for social media

Respond with ONLY valid JSON, no markdown:
{
  "title": "string (max 60 chars)",
  "language": "bn" | "en" | "mixed",
  "music": false,
  "segments": [
    { "text": "string", "startTime": number, "duration": number },
    ...
  ]
}`;

  const userMessage = `Generate a ${totalDuration}-second video script for:
Style: ${style}
${title ? `Title hint: ${title}` : ''}
Prompt: ${prompt}`;

  const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      options: { temperature: 0.7, max_tokens: 1000 },
    }),
  });

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text().catch(() => '');
    throw new Error(`Ollama API error (${ollamaRes.status}): ${text}`);
  }

  const data = await ollamaRes.json();
  const rawContent = data.message?.content || '';

  // Parse JSON — handle markdown fences if present
  let cleaned = rawContent
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')
    .trim();

  const script: VideoScript = JSON.parse(cleaned);

  // Validate & fill defaults
  if (!script.segments || !Array.isArray(script.segments)) {
    throw new Error('Ollama returned invalid script: missing segments');
  }

  script.language = script.language || 'bn';
  script.title = script.title || 'Hostamar Video';
  script.music = false;

  // Ensure segments cover the full duration
  if (script.segments.length === 0) {
    script.segments = [
      { text: script.title || 'Welcome', startTime: 1, duration: totalDuration - 1 },
    ];
  }

  return script;
}

// ─── Fallback Script (if Ollama is down) ─────────────────────────────────────

function generateFallbackScript(
  prompt: string,
  style: string,
  totalDuration: number
): VideoScript {
  // Create a simple script from the prompt text
  const words = prompt.split(/\s+/).slice(0, 50);
  const segCount = Math.min(4, Math.ceil(totalDuration / 3));
  const segDuration = (totalDuration - 2) / segCount;
  const segments: ScriptSegment[] = [];

  for (let i = 0; i < segCount; i++) {
    const startWords = Math.floor((words.length / segCount) * i);
    const endWords = Math.floor((words.length / segCount) * (i + 1));
    const text = words.slice(startWords, endWords).join(' ') || 'Hostamar';
    segments.push({
      text,
      startTime: 2 + i * segDuration,
      duration: segDuration,
    });
  }

  return {
    title: prompt.slice(0, 60),
    language: /[ঀ-৿]/.test(prompt) ? 'bn' : 'en',
    music: false,
    segments,
  };
}

// ─── Remotion Rendering ──────────────────────────────────────────────────────

let cachedServeUrl: string | null = null;

/**
 * Bundle the Remotion composition (cached after first call).
 */
async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;

  const { bundle } = await import('@remotion/bundler');

  cachedServeUrl = await bundle({
    entryPoint: path.resolve(process.cwd(), 'remotion/index.ts'),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        // Ensure remotion package resolves from project node_modules
        alias: {
          ...config.resolve?.alias,
          remotion: path.resolve(process.cwd(), 'node_modules/remotion'),
        },
      },
    }),
  });

  return cachedServeUrl;
}

/**
 * Detect a Chrome/Chromium executable for Puppeteer.
 * Checks common locations and env var.
 */
async function findChromeExecutable(): Promise<string | undefined> {
  const envPath = process.env.CHROME_EXECUTABLE || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    try {
      await fs.access(envPath);
      return envPath;
    } catch {
      // env var set but not accessible
    }
  }

  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
    '/usr/lib/chromium-browser/chromium-browser',
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  // Try puppeteer's bundled chromium
  try {
    const puppeteer = await import('puppeteer');
    const executablePath = puppeteer.executablePath();
    await fs.access(executablePath);
    return executablePath;
  } catch {
    return undefined;
  }
}

/**
 * Render the video using Remotion.
 */
async function renderVideo(
  entryPoint: string,
  compositionId: string,
  inputProps: Record<string, unknown>,
  outputPath: string
): Promise<void> {
  const { renderMedia, selectComposition } = await import('@remotion/renderer');

  const serveUrl = await getServeUrl();

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  const chromeExecutable = await findChromeExecutable();

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: chromeExecutable
      ? { executable: chromeExecutable }
      : undefined,
    pixelFormat: 'yuv420p',
    videoBitrate: '2M',
    x264Preset: 'medium',
    onProgress: (progress) => {
      if (progress.progress % 0.1 < 0.02) {
        console.log(`[Render] ${Math.round(progress.progress * 100)}%`);
      }
    },
  });
}

// ─── Generate Thumbnail ──────────────────────────────────────────────────────

/**
 * Generate a thumbnail from the first frame using ffmpeg.
 * Falls back to a gradient placeholder.
 */
async function generateThumbnail(
  videoPath: string,
  thumbnailPath: string
): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    execSync(
      `ffmpeg -i "${videoPath}" -vframes 1 -q:v 2 -y "${thumbnailPath}"`,
      { timeout: 15000, stdio: 'pipe' }
    );
    return thumbnailPath;
  } catch {
    // Fallback: create a simple HTML-based placeholder PNG (or just return the video path)
    console.warn('[Thumbnail] FFmpeg not available, using video as thumbnail source');
    return videoPath;
  }
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export type RenderStatus = 'pending' | 'generating' | 'complete' | 'failed';

interface RenderProgress {
  previewId: string;
  status: RenderStatus;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
  progress: number;
}

const renderProgressMap = new Map<string, RenderProgress>();

export function getRenderProgress(previewId: string): RenderProgress | null {
  return renderProgressMap.get(previewId) || null;
}

/**
 * Main entry point: renders a video for a given Preview record.
 *
 * 1. Reads the Preview from DB
 * 2. Calls Ollama for script generation
 * 3. Renders via Remotion
 * 4. Updates Preview record with URLs
 */
export async function renderPreviewVideo(
  previewId: string
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  // Validate preview exists
  const preview = await prisma.preview.findUnique({ where: { id: previewId } });
  if (!preview) {
    throw new Error(`Preview not found: ${previewId}`);
  }

  // Mark as generating
  await prisma.preview.update({
    where: { id: previewId },
    data: { renderStatus: 'generating' },
  });

  renderProgressMap.set(previewId, {
    previewId,
    status: 'generating',
    videoUrl: null,
    thumbnailUrl: null,
    error: null,
    progress: 0,
  });

  const videoId = preview.id;
  const outputFilename = `${videoId}.mp4`;
  const thumbnailFilename = `${videoId}-thumb.jpg`;
  const outputPath = path.join(VIDEOS_DIR, outputFilename);
  const thumbnailPath = path.join(VIDEOS_DIR, thumbnailFilename);

  // Ensure output directory
  await fs.mkdir(VIDEOS_DIR, { recursive: true });

  // Duration from preview or default
  const totalDuration = preview.duration || 10;

  try {
    // ── 1. Generate script ──────────────────────────────────────────────────
    renderProgressMap.set(previewId, {
      ...renderProgressMap.get(previewId)!,
      progress: 0.1,
    });

    let script: VideoScript;
    try {
      script = await generateScript(
        preview.prompt,
        preview.style,
        totalDuration,
        preview.title
      );
      console.log(`[Render] Script generated: "${script.title}" (${script.segments.length} segments)`);
    } catch (ollamaError) {
      console.warn('[Render] Ollama failed, using fallback script:', String(ollamaError));
      script = generateFallbackScript(preview.prompt, preview.style, totalDuration);
    }

    renderProgressMap.set(previewId, {
      ...renderProgressMap.get(previewId)!,
      progress: 0.3,
    });

    // ── 2. Determine colors from style ──────────────────────────────────────
    const palette = STYLE_PALETTES[preview.style] || DEFAULT_PALETTE;

    // ── 3. Render video via Remotion ────────────────────────────────────────
    renderProgressMap.set(previewId, {
      ...renderProgressMap.get(previewId)!,
      progress: 0.4,
    });

    await renderVideo(
      path.resolve(process.cwd(), 'remotion/index.ts'),
      'VideoComposition',
      {
        title: script.title,
        segments: script.segments,
        backgroundColor: palette.gradient,
        brandColor: palette.brandColor,
        style: preview.style,
        language: script.language,
      },
      outputPath
    );

    renderProgressMap.set(previewId, {
      ...renderProgressMap.get(previewId)!,
      progress: 0.8,
    });

    // ── 4. Generate thumbnail ───────────────────────────────────────────────
    await generateThumbnail(outputPath, thumbnailPath);

    renderProgressMap.set(previewId, {
      ...renderProgressMap.get(previewId)!,
      progress: 0.95,
    });

    // ── 5. Update preview record ────────────────────────────────────────────
    const videoUrl = `/videos/${outputFilename}`;
    const thumbnailUrl = `/videos/${thumbnailFilename}`;

    await prisma.preview.update({
      where: { id: previewId },
      data: {
        videoUrl,
        thumbnailUrl,
        renderStatus: 'complete',
        renderError: null,
      },
    });

    // Also create/update the Video record if needed
    if (preview.videoId) {
      await prisma.video.update({
        where: { id: preview.videoId },
        data: {
          url: videoUrl,
          thumbnailUrl,
          status: 'ready',
          duration: totalDuration,
        },
      });
    }

    renderProgressMap.set(previewId, {
      previewId,
      status: 'complete',
      videoUrl,
      thumbnailUrl,
      error: null,
      progress: 1.0,
    });

    return { videoUrl, thumbnailUrl };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('[Render] Failed:', errMsg);

    await prisma.preview.update({
      where: { id: previewId },
      data: {
        renderStatus: 'failed',
        renderError: errMsg,
      },
    });

    renderProgressMap.set(previewId, {
      previewId,
      status: 'failed',
      videoUrl: null,
      thumbnailUrl: null,
      error: errMsg,
      progress: 0,
    });

    throw error;
  }
}
