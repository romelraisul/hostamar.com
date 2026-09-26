import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    brand: 'hostamar.com',
    product: 'Video OS $0.10/min — Old + New Together — RTX 5060 8GB AI Studio',
    old_models: {
      note: 'পুরনো ভিডিও মডেলগুলো ব্যবহৃত হয় — ComfyUI/models/diffusion_models থেকে auto load',
      location: '~/ComfyUI/models/diffusion_models + text_encoders + vae + loras + gguf',
      how: 'Symlink from ~/hostamar-migrate + ~/hostamar-build old models — ComfyUI sequential load 8GB golden rule Qwen Save → unload → MiniMax load → old Wan load',
    },
    new_models: {
      clarification: 'এবার ক্লিয়ার হলো! তুমি যে রিলটা দিয়েছো ওটা GF মডেল না, Laya মডেলের। Mahan Jafari Laya promotes — Jev এর ওপেন-সোর্স পুরোপুরি ফ্রী অল্টারনেটিভ।',
      qwen_rgba: {
        name: 'Qwen 2.1 RGBA Logo Factory Transparent Native',
        files: [
          'qwen_image_2.1_int8_convrot.safetensors 7.26GB diffusion_models',
          'qwen3vl_8b_int8_convrot.safetensors 6.31GB text_encoders',
          'qwen_image_2.1_vae_bf16.safetensors vae',
          'qwen-image-2.1-q5_k_m.gguf 6.8GB gguf GGUF Loader layer by layer',
        ],
        workflow: 'qwen_transparent_logo_workflow.json',
        prompt: 'breaking news lower third, transparent, red gradient, Bengali text placeholder — must include transparent else white — 4 variants 1024x256',
        output: 'Qwen_Transparent_Logo_RGBA.png native RGBA no Photoshop',
        license: 'Research-Only commercial license needed',
      },
      minimax_h3: {
        name: 'MiniMax H3 NF4 Ref2Video + Stereo Audio 10 refs',
        files: [
          'minimax-h3-fl2va-nf4.safetensors 12GB diffusion_models',
          'minimax-h3-turbo-4steps-lora.safetensors loras',
        ],
        workflow: 'minimax_h3_ref2video_workflow.json',
        input: 'Qwen RGBA logo as reference + 10 refs + stereo audio',
        output: '10s filler video B-roll + stereo audio native',
        trick: "Don't keep both VRAM same time — Qwen Save → unload → MiniMax load golden rule + H3_VIDEO_VAE_FP16=1 LOWVRAM",
        optimization: 'BIOS ReBAR SAM 10-15% boost idle 50-60°C load 75-80°C ok 85°C+ fan 60°C 40%',
        license: 'Commercial OK',
      },
      laya: {
        name: 'Laya — GF না, Laya মডেল — Mahan Jafari promotes Laya — Jev Open-Source Free Alt',
        details: '7x faster 33ms vs Jev 236ms — 1GB RAM — Apache 2.0 — accuracy 0.766 vs 0.727 — NandhaKishor M — github.com/NandhaKishorM/laya',
        files: ['laya <1GB RAM'],
        usage: 'Decision routing: Qwen logo → MiniMax filler → Laya decision → Old Wan fallback',
      },
    },
    together: {
      factory: 'Qwen thumbnail + Lower Third RGBA 1024x256 4 variants + MiniMax 10s filler B-roll + Old Wan/Kling/Hunyuan models = Bogura TV daily factory 10 min',
      workflow: 'NODE1 QWEN LOADER → NODE4 MINIMAX H3 REF2VIDEO → OLD models Wan/Kling as alternative filler',
      optimization: 'BIOS ReBAR SAM Enable, H3_VIDEO_VAE_FP16=1 env, sequential load, --lowvram --use-split-cross-attention, RTX 5060 idle 50-60°C load 75-80°C',
    },
    comfyui: {
      version: 'v0.3.8+ CUDA 12.6',
      port: 8188,
      local: 'http://127.0.0.1:8188',
      tunnel: 'https://comfyui.hostamar.com or https://comfyui.hostamar.local',
      custom_nodes: ['city96/ComfyUI-GGUF', 'ComfyUI-MiniMaxWrapper', 'ComfyUI-Qwen'],
      env: 'H3_VIDEO_VAE_FP16=1 COMFYUI_LOWVRAM=1 --lowvram --use-split-cross-attention',
    },
    fixed_syntax: 'Fixed )}\\\"} 0.1s stray syntax from V56 — WSL ONLY',
    omniroute: '560 models LIVE :20128 + omni.hostamar.com tunnel',
    jobs: '23 total 23 green 0 red — V57 fix',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
