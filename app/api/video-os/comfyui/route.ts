import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { type, prompt } = await req.json().catch(() => ({}))
  // RTX 5060 8GB VRAM AI STUDIO - ComfyUI v0.3.8+ CUDA 12.6
  // Qwen 2.1 = RGBA logo factory (native transparent RGBA, no Photoshop needed)
  // MiniMax H3 NF4 = Ref2Video + native stereo audio (10 refs, turbo LoRA)
  // Laya = Decision router Jev free alt (33ms, 1GB RAM, Apache 2.0)
  // Golden rule: Qwen + MiniMax can't share VRAM at the same time

  if (type === 'laya') {
    return NextResponse.json({
      clarification: 'এবার ক্লিয়ার হলো! তুমি যে রিলটা দিয়েছো ওটা GF মডেল না, Laya মডেলের। ওই রিলে যাকে দেখছো Mahan Jafari - ও Laya কে প্রমোট করছে, যেটা হলো Jev এর ওপেন-সোর্স, পুরোপুরি ফ্রী অল্টারনেটিভ।',
      brand: 'hostamar.com', product: 'Video OS + Agent Cloud Decision Router — Laya Jev Free Alt',
      model: 'Laya — Open Source Jev Alternative Apache 2.0 — NandhaKishor M',
      details: {
        speed: '33ms single forward pass, T4 GPU 32.8ms vs Jev 236-276ms 7x faster — runs under 1GB RAM',
        accuracy: '0.766 typed-decisions benchmark vs Jev 0.727',
        license: 'Apache 2.0 weights on Hugging Face Convai Innovations',
        jev_closed: 'Jev by TypeSafe AI Diogo Almeida Sep 2026 — no papers, no weights, no datasets — $0.042/M',
        laya_open: 'Laya 7x faster 33ms vs 150ms — 0.766 vs 0.727 accuracy — Self-hosted $0 inference cost',
        usage: 'Decision routing: Is customer angry? 0.9 probability — route Qwen logo → MiniMax filler → Laya decision',
        repo: 'https://github.com/NandhaKishorM/laya',
      },
      download: { huggingface: 'Laya weights Apache 2.0', local: '~/ComfyUI/models/laya — WSL ONLY' },
      wsl_only: 'WSL ~/ not /mnt/c — Windows C: no space — ext4.vhdx',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  if (type === 'qwen-logo') {
    return NextResponse.json({
      brand: 'hostamar.com',
      product: 'Video OS P2 — Qwen 2.1 RGBA Logo Factory',
      workflow: 'qwen_transparent_logo_workflow.json',
      model: 'Comfy-Org/Qwen-Image-2.1 qwen_image_2.1_int8_convrot 7.26GB + qwen3vl_8b_int8 6.31GB + vae_bf16',
      vram_note: '13GB total but ComfyUI loads sequentially → 8GB works',
      prompt: prompt || 'breaking news lower third, transparent, red gradient, Bengali text placeholder — 4 variants 1024x256',
      output: 'Qwen_Transparent_Logo_RGBA.png — native RGBA, no background removal needed',
      vram: '8GB VRAM + 16GB RAM (GGUF loader layer-by-layer)',
      optimization: 'BIOS ReBAR SAM Enable → 10-15% boost',
      next_step: 'Save logo → ComfyUI restart/unload → Load MiniMax H3 for Ref2Video',
      license: 'Qwen Research-Only — commercial license needed for YouTube/TV',
      pc_vps: 'RTX 5060 8GB Ultimate AI Studio — Made for Bogura TV Factory',
    }, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  // MiniMax H3 Ref2Video
  return NextResponse.json({
    brand: 'hostamar.com',
    product: 'Video OS P2 — MiniMax H3 Ref2Video + Stereo Audio',
    workflow: 'minimax_h3_ref2video_workflow.json',
    model: 'DiffSynth-Studio/MiniMax-H3-NF4 minimax-h3-fl2va-nf4 12GB + turbo-4steps-lora',
    input: 'Qwen_Transparent_Logo_RGBA.png as reference + up to 10 ref images + stereo audio',
    prompt: prompt || 'Bogura News filler 10s — transparent lower third overlay B-roll stereo audio',
    output: '10s filler video + stereo audio (native)',
    vram_trick: "Don't keep both VRAM — Qwen Save → unload → MiniMax load (golden rule) + H3_VIDEO_VAE_FP16=1 LOWVRAM force",
    optimization: 'BIOS ReBAR SAM 10-15%, idle 50-60°C, load 75-80°C OK, 85°C+ use MSI Afterburner 60°C 40% fan',
    factory: 'Bogura TV Daily Factory 10 min: Qwen thumbnail+Lower Third RGBA → MiniMax 10s filler B-roll',
    license: 'MiniMax H3 Commercial OK / Hunyuan Video alternative Commercial OK',
    endpoints: { comfyui: 'http://127.0.0.1:8188', omni: 'https://omni.hostamar.com', glm: 'https://glm.hostamar.local' },
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
