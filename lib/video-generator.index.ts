/**
 * Video Generation Service - Auto-detects API availability
 * Falls back to demo mode when no API keys are configured
 */

// Try real video generator, fallback to demo
let videoGenerator: typeof import('./video-generator.demo');

async function getGenerator() {
  // Check if real API keys are available
  const hasGithubToken = !!process.env.GITHUB_TOKEN;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasGithubToken || hasOpenAI) {
    try {
      const real = await import('./video-generator');
      console.log('[Video Gen] Using real AI mode');
      return real;
    } catch {
      console.log('[Video Gen] Real mode unavailable, falling back to demo');
    }
  }

  // Fallback to demo
  if (!videoGenerator) {
    videoGenerator = await import('./video-generator.demo');
    console.log('[Video Gen] Using DEMO mode (no API key configured)');
  }
  return videoGenerator;
}

export async function generateMarketingVideo(params: any) {
  const gen = await getGenerator();
  return gen.generateMarketingVideo(params);
}

export async function generateVideoScript(params: any) {
  const gen = await getGenerator();
  return gen.generateVideoScript(params);
}

export async function suggestVideoTopics(businessName: string, industry: string) {
  const gen = await getGenerator();
  return gen.suggestVideoTopics(businessName, industry);
}