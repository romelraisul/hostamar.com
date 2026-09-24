import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const repo = new URL(req.url).searchParams.get('repo') || 'Hostamar'
  // Qwen-Image 2.1 weights resuming via v70-qwen-dl.sh (~28GB, BD egress).
  return NextResponse.json({
    model: 'Qwen-Image-2.1',
    size: '1024x256',
    format: 'RGBA',
    repo,
    prompt: `Logo for ${repo}, green black hybrid #0E7C3A, Hostamar OS, transparent background`,
    status: 'Qwen BG downloading ~28GB 1.5-2h - /home/romel/ComfyUI/models/diffusion_models/ + text_encoders/ + vae/',
    factory: 'Bogura TV Factory 10 min auto render lower third',
    output: `~/ComfyUI/output/${repo.toLowerCase()}-rgba-1024x256.png`,
  })
}
