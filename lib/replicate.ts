/**
 * Replicate API Client Wrapper
 *
 * Thin wrapper around Replicate's REST API (https://api.replicate.com/v1).
 * Supports image generation via flux-schnell and other models.
 */
import { randomUUID } from 'crypto';

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

function getApiKey(): string {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) {
    throw new Error('REPLICATE_API_KEY environment variable is not set');
  }
  return key;
}

interface ReplicateApiError {
  detail?: string;
  title?: string;
  status?: number;
}

function isReplicateError(err: unknown): err is ReplicateApiError {
  return typeof err === 'object' && err !== null && ('detail' in err || 'title' in err);
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${REPLICATE_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'hostamar/1.0',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorBody: ReplicateApiError | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // ignore parse errors
    }

    const message = isReplicateError(errorBody)
      ? errorBody.detail || errorBody.title || 'Unknown Replicate error'
      : `Replicate API error: ${response.status} ${response.statusText}`;

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// --- Types ---

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  model: string;
  version: string;
  input: Record<string, unknown>;
  output: string[] | string | null;
  error: string | null;
  logs: string | null;
  metrics: {
    predict_time?: number;
  } | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  urls: {
    get: string;
    cancel: string;
  };
}

export interface ReplicateModelVersion {
  id: string;
  model: string;
}

// --- Constants ---

export const MODELS = {
  // flux-schnell: fast image generation
  FLUX_SCHNELL: 'black-forest-labs/flux-schnell',
  // Default version for flux-schnell (latest as of writing)
  FLUX_SCHNELL_VERSION: 'd1a52e0e6287d0e5b8d2a0e8b3b2f8b8c7e0b8a2c3d4e5f6a7b8c9d0e1f2a3b',
  // sdxl: alternative for higher quality
  SDXL: 'stability-ai/sdxl',
} as const;

// --- Image Generation ---

export interface ImageGenerationInput {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_outputs?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  output_format?: 'webp' | 'png' | 'jpg';
}

/**
 * Generate images using flux-schnell (or another model).
 * Returns an array of image URLs.
 */
export async function generateImages(
  prompt: string,
  options: Partial<ImageGenerationInput> = {},
  model: string = MODELS.FLUX_SCHNELL
): Promise<string[]> {
  const input: Record<string, unknown> = {
    prompt,
    num_outputs: options.num_outputs ?? 1,
    width: options.width ?? 1920,
    height: options.height ?? 1080,
    num_inference_steps: options.num_inference_steps ?? 4,
    output_format: options.output_format ?? 'webp',
    ...(options.negative_prompt ? { negative_prompt: options.negative_prompt } : {}),
    ...(options.guidance_scale ? { guidance_scale: options.guidance_scale } : {}),
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
  };

  const prediction = await apiRequest<ReplicatePrediction>('/predictions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      input,
      webhook: process.env.REPLICATE_WEBHOOK_URL || null,
      webhook_events_filter: ['completed'],
    }),
  });

  console.log(`[Replicate] Created prediction ${prediction.id} for prompt: "${prompt.slice(0, 60)}..."`);

  // Poll until complete
  const result = await pollPrediction(prediction.id);

  // Normalize output to string array
  const outputs = result.output;
  if (!outputs) {
    throw new Error(`Replicate prediction ${result.id} returned no output`);
  }

  if (Array.isArray(outputs)) {
    return outputs as string[];
  }

  // Single string output
  return [outputs as string];
}

/**
 * Poll a prediction until it completes, fails, or times out.
 */
async function pollPrediction(
  predictionId: string,
  intervalMs: number = 2000,
  timeoutMs: number = 120000
): Promise<ReplicatePrediction> {
  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Replicate prediction ${predictionId} timed out after ${timeoutMs}ms`);
    }

    const prediction = await apiRequest<ReplicatePrediction>(
      `/predictions/${predictionId}`
    );

    switch (prediction.status) {
      case 'succeeded':
        return prediction;
      case 'failed':
        throw new Error(
          `Replicate prediction ${predictionId} failed: ${prediction.error || 'Unknown error'}`
        );
      case 'canceled':
        throw new Error(`Replicate prediction ${predictionId} was canceled`);
      case 'starting':
      case 'processing':
        // Continue polling
        await sleep(intervalMs);
        continue;
    }
  }
}

/**
 * Get a prediction by ID (non-blocking).
 */
export async function getPrediction(
  predictionId: string
): Promise<ReplicatePrediction> {
  return apiRequest<ReplicatePrediction>(`/predictions/${predictionId}`);
}

/**
 * Cancel a running prediction.
 */
export async function cancelPrediction(predictionId: string): Promise<void> {
  await apiRequest(`/predictions/${predictionId}/cancel`, { method: 'POST' });
}

// --- Utility ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  generateImages,
  getPrediction,
  cancelPrediction,
  MODELS,
};
