export const metadata = { title: 'Content & Automation | Hostamar Admin', description: 'ComfyUI, content calendar, cron fleet, Piper narration' }

export default function AdminContentPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1C1917]">Content & Automation</h1>
        <p className="text-sm text-[#B8AFA3]">ComfyUI, content calendar, cron fleet, Piper narration</p>
      </header>

      {/* ComfyUI WSL */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">ComfyUI WSL Bridge</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Status</span><span className="text-[#0E7C3A]">200 OK ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Port</span><span className="font-mono text-[#1C1917]">127.0.0.1:8188 (not 8189)</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">GPU</span><span className="font-mono text-[#1C1917]">RTX 5060 8GB</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Model</span><span className="font-mono text-[#1C1917]">sd_xl_turbo_1.0_fp16.safetensors</span></div>
        </div>
      </section>

      {/* Auto-content worker */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Auto-Content Worker</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Status</span><span className="text-amber-600">⚠️ Not producing</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">NASA API</span><span className="text-[#1C1917]">DEMO_KEY (replace with real key)</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Pexels/Pixabay</span><span className="text-[#1C1917]">Keys missing</span></div>
        </div>
      </section>

      {/* Content Calendar */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Content Calendar</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Schedules</span><span className="text-[#0E7C3A]">3 active</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Timezone</span><span className="text-[#1C1917]">Asia/Dhaka +06:00</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Channels</span><span className="text-[#1C1917]">1 wired</span></div>
        </div>
      </section>

      {/* Cron Fleet */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Cron Fleet</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Total</span><span className="text-[#0E7C3A]">13 workers</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Node path</span><span className="font-mono text-[#0E7C3A]">/home/romel/.local/bin/node ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Monitor</span><span className="text-[#0E7C3A]">6/6 green incl TV</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Queue</span><span className="text-[#0E7C3A]">D1 pending: 0</span></div>
        </div>
      </section>

      {/* Piper & Shelf */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Piper & Shelf</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Model</span><span className="text-[#0E7C3A]">74MB bn_BD-google-medium ✅</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Silent files</span><span className="text-amber-600">90 need narration</span></div>
          <div className="flex justify-between"><span className="text-[#B8AFA3]">Path</span><span className="font-mono text-[#1C1917]">docker/tts/models/bn_BD-google-medium/</span></div>
        </div>
      </section>
    </div>
  )
}
