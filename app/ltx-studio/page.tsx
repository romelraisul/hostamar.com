import { promises as fs } from 'node:fs'
import path from 'node:path'

interface VideoFile {
  name: string
  url: string
  sizeBytes: number
  sizeMB: number
  modifiedAt: string
}

const MODEL_NAME = 'LTX-Video 2B v0.9.8 (Distilled fp8)'
const MODEL_FILE = 'ltx-video-2b-v0.9.8-distilled-fp8.safetensors'
const MODEL_SIZE_GB = 4.16

const PROMPTS = [
  'A serene ocean wave at sunrise, cinematic, golden hour light, photorealistic, slow motion',
  'A futuristic city skyline at night, neon lights reflecting on wet streets, 4K',
  'A misty mountain range at dawn, timelapse clouds rolling over peaks',
  'A cozy fireplace crackling in a warm living room, ambient lighting, cozy',
  'A dancer spinning in the rain under streetlights, slow motion, cinematic',
]

async function listSampleVideos(): Promise<VideoFile[]> {
  // Compute lazily (not at module top-level) so Vercel's serverless Lambda
  // never evaluates process.cwd()/fs at import time.
  const SAMPLES_DIR = path.join(process.cwd(), 'public', 'videos', 'ltx-samples')
  try {
    const entries = await fs.readdir(SAMPLES_DIR)
    const files = await Promise.all(
      entries
        .filter((n) => n.endsWith('.mp4'))
        .map(async (name) => {
          const stat = await fs.stat(path.join(SAMPLES_DIR, name))
          return {
            name,
            url: `/videos/ltx-samples/${name}`,
            sizeBytes: stat.size,
            sizeMB: stat.size / 1024 / 1024,
            modifiedAt: stat.mtime.toISOString(),
          }
        })
    )
    return files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
  } catch {
    return []
  }
}

export const dynamic = 'force-dynamic'

export default async function LTXStudioPage() {
  const videos = await listSampleVideos()

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-slate-100">
      

      <section className="mb-10 grid md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <p className="text-slate-400 mb-1">Active Model</p>
          <p className="font-mono text-sky-300">{MODEL_NAME}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <p className="text-slate-400 mb-1">File</p>
          <p className="font-mono text-xs break-all">{MODEL_FILE}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
          <p className="text-slate-400 mb-1">Disk Footprint</p>
          <p className="font-mono text-emerald-300">{MODEL_SIZE_GB.toFixed(2)} GB</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Generated Samples</h2>
        {videos.length === 0 ? (
          <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-6">
            <p className="font-medium text-amber-300 mb-2">No sample videos have been generated yet.</p>
            <p className="text-slate-300 text-sm mb-4">
              Run the generation script on the host to produce videos. They will
              show up here automatically.
            </p>
            <pre className="rounded bg-slate-950/80 p-4 text-xs overflow-x-auto">
{`# Activate the venv
source /home/romel/models/ltx-video/.venv/bin/activate

# Run a generation (uses GPU)
/home/romel/models/ltx-video/.venv/bin/python \\
  /home/romel/models/ltx-video/generate.py \\
  --prompt "A serene ocean wave at sunrise, cinematic 4K" \\
  --name sample-ocean-sunrise \\
  --height 256 --width 384 --frames 16 --steps 8`}
            </pre>
            <p className="text-slate-400 text-xs mt-3">
              Output written to <code>public/videos/ltx-samples/</code> and{' '}
              published at <code>/videos/ltx-samples/[name].mp4</code>.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <figure key={v.name} className="rounded-lg border border-slate-700 overflow-hidden bg-slate-900">
                <video src={v.url} controls preload="metadata" className="w-full aspect-video bg-black" />
                <figcaption className="p-3 text-xs text-slate-400">
                  <p className="font-mono text-sky-300 truncate">{v.name}</p>
                  <p>{v.sizeMB.toFixed(2)} MB</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Suggested Prompts</h2>
        <ul className="space-y-2 text-slate-300 text-sm">
          {PROMPTS.map((p, i) => (
            <li key={i} className="rounded border border-slate-800 bg-slate-900/50 px-4 py-3 font-mono text-xs">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Model Notes</h2>
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            The model file is permanently installed at
            {' '}<code className="text-sky-300">/home/romel/models/ltx-video/</code>.
            Generation runs offline, no external API keys required, no per-second charges.
          </p>
          <p>
            <strong className="text-amber-300">Why not LTX-2.3 (22B)?</strong>{' '}
            Lightricks flagship 2025 model is 27-43 GB and requires substantial
            VRAM (over 12 GB). Your deployment target (RTX 5060, 8 GB) cannot run
            it. The smaller 2B v0.9.8 distilled variant is the latest Lightricks
            model that fits and produces full-motion 24 fps video at small cost.
          </p>
          <p>
            Defaults target 24 frames (~1 second) at 256x384 with 8 inference steps.
            On RTX 5060 a single 16-frame clip takes ~5-12 minutes once the model
            is cached.
          </p>
        </div>
      </section>
    </main>
  )
}
