import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

// V86 H3 ReferenceToVideo — reference video copy (NAKOL) fully local.
// Flow: customer video -> first frame (identity lock) -> MiniMaxH3ReferenceToVideo
// (native ComfyUI core node, NO API) -> KSampler -> VAEDecode -> VHS MP4.
export default async function ReferenceCopy() {
  let queued = 0, done = 0, lastFile: string | null = null
  try {
    const rows = await prisma.videoQueue.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
    queued = rows.filter((r) => r.status === 'pending' || r.status === 'processing').length
    done = rows.filter((r) => r.status === 'completed').length
    lastFile = rows.find((r) => r.videoUrl)?.videoUrl ?? null
  } catch {
    // real DB failure shows as 0/0 — no mock fallback
  }
  return (
    <div className="p-6 bg-[#fffdf6] min-h-screen text-black">
      <h1 className="text-xl font-bold">H3 ReferenceToVideo — ভিডিও দিলে ওই ভিডিওর মতো নকল বানাবে? — WSL Local Unlimited Free NO API</h1>
      <p className="text-xs mt-2">
        Reference video → first frame = identity lock (same person, same saree, same background) → prompt gives the NEW motion.
        ReferenceToVideo keeps identity, not exact motion copy — exact motion copy needs pose control (MiniMaxH3FunControlNetApply, present locally).
        ComfyUI core node <code>MiniMaxH3ReferenceToVideo</code> (comfy_extras/nodes_minimax_h3.py) — zero API key, unlimited free.
      </p>
      <div className="mt-4 grid md:grid-cols-2 gap-4 text-xs">
        <div className="border bg-white p-3 rounded">
          <p className="font-bold">REFERENCE VIDEO তুমি দেবে</p>
          <p>Input: ~/ComfyUI/input/ (first frame extracted with system ffmpeg). API লাগবে? না — সম্পূর্ণ লোকাল WSL. Local = unlimited free.</p>
        </div>
        <div className="border bg-white p-3 rounded">
          <p className="font-bold">OUTPUT NAKOL VIDEO</p>
          <p>Output: ~/ComfyUI/output/H3_REFERENCE_COPY_LOCAL_UNLIMITED_*.mp4 — 768x1344 9:16, 129 frames @24fps (~5.4s, trained range 124-362).</p>
        </div>
      </div>
      <div className="mt-4 text-xs border bg-white p-3 rounded">
        <p className="font-bold">Models (~/ComfyUI, all local)</p>
        <p>TE: qwen3vl_32b_minimax_h3_nvfp4_awq 15GB (CLIPLoader type=minimax, device=cpu) · DiT: minimax_h3_ref2va_pruned_fp8_scaled 20GB · VAE: minimax_h3_video_vae_int8_convrot 2.7GB · audio VAE 578MB · exact-motion: minimax-h3-fl2va-nf4 16GB</p>
      </div>
      <div className="mt-4 text-xs">
        <p>Queue DB (real Turso): pending/processing {queued} · completed {done} · last file: {lastFile ?? 'none'}</p>
        <p className="text-gray-500 mt-2">Workflow: ~/ComfyUI/workflows/h3_reference_video_copy_local.json · autogrow ref_images dict form · VHS_VideoCombine video/h264-mp4</p>
      </div>
    </div>
  )
}
