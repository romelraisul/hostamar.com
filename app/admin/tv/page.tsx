import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TV & Streaming | Hostamar Admin',
  description: 'Manage HLS2 live stream, YouTube push, restream, and Cloudflare tunnels',
}

export default function AdminTvPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#1C1917]">TV & Streaming</h1>
        <p className="text-sm text-[#B8AFA3]">HLS2 audio, YouTube push, restream, tunnels</p>
      </header>

      {/* Status Overview */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Live Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard label="HLS2 Audio" value="-16.8 dB" status="ok" note="Audible" />
          <StatusCard label="YouTube Push" value="2 ESTABLISHED" status="ok" note="To Google" />
          <StatusCard label="restream.service" value="active" status="ok" note="systemd" />
          <StatusCard label="Cloudflare Tunnels" value="4 running" status="ok" note="tv.hostamar.com" />
        </div>
      </section>

      {/* HLS2 Section */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">HLS2 Encoder</h2>
        <div className="space-y-3 text-sm">
          <Row label="Service" value="tv-ffmpeg-vp9.service (active, rewritten)" />
          <Row label="Audio Filter" value="[0:a]aresample=48000:async=1,loudnorm=I=-16:TP=-1.5:LRA=11[a]" />
          <Row label="Output" value="docker/tv-station/hls2/seg%04d.mp4 + init_v2.mp4" />
          <Row label="Playlist" value="master.m3u8 (200, 351 bytes)" />
          <Row label="PID Check" value="pgrep -af libvpx → should be ONE only" />
          <Row label="Cache Bust" value="init_v2.mp4 bypasses Cloudflare 1-year stale cache" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CmdButton cmd="systemctl --user status tv-ffmpeg-vp9.service" label="Service Status" />
          <CmdButton cmd="pgrep -af libvpx" label="Check PIDs" />
          <CmdButton cmd="tail -20 /tmp/vp9.log" label="View Log" />
        </div>
      </section>

      {/* YouTube Section */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">YouTube Push</h2>
        <div className="space-y-3 text-sm">
          <Row label="Channel" value="UCEbTau5-kjqIVexOwL9C3dQ" />
          <Row label="RTMP" value="rtmps://a.rtmps.youtube.com/live2/" />
          <Row label="restream.py" value="Active (reads from HLS2 playlist)" />
          <Row label="Connections" value="2-3 ESTABLISHED to 142.250.xxx:443" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <CmdButton cmd="systemctl --user status restream.service" label="Restream Status" />
          <CmdButton cmd="ss -tnp | grep 142.250" label="Check Connections" />
          <CmdButton cmd="tail -20 /tmp/restream.log" label="View Log" />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="rounded-xl bg-[#FFFDF6] p-4 shadow-sm ring-1 ring-[#D8CDB4]">
        <h2 className="mb-3 text-lg font-semibold text-[#1C1917]">Quick Fix Actions</h2>
        <p className="mb-3 text-xs text-[#B8AFA3]">Run these in fresh WSL terminal (setsid + &lt; /dev/null to avoid Hermes background-wrapper limits)</p>
        <div className="grid gap-2 text-xs">
          <ActionCard
            title="Restart HLS2 Encoder"
            command={`pkill -9 -f libvpx; sleep 3; rm -rf docker/tv-station/hls2/*; mkdir -p docker/tv-station/hls2/; cd ~/hostamar-build && setsid bash -c 'ffmpeg -re -stream_loop -1 -f concat -safe 0 -i docker/tv-station/videos/playlist.host.txt -i public/logo.png -filter_complex "[0:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p[base];[1:v]scale=48:-1[wm];[base][wm]overlay=W-w-6:6:format=yuv420,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='"'"'hostamar.com'"'"':fontsize=10:fontcolor=white:x=w-text_w-8:y=58[v];[0:a]aresample=48000:async=1,loudnorm=I=-16:TP=-1.5:LRA=11[a]" -map "[v]" -map "[a]" -c:v libvpx-vp9 -b:v 400k -deadline realtime -cpu-used 8 -row-mt 1 -tile-columns 2 -c:a libopus -b:a 48k -ar 48000 -f hls -hls_time 4 -hls_list_size 6 -hls_flags delete_segments+append_list -hls_segment_type fmp4 -hls_fmp4_init_filename init_v2.mp4 -hls_segment_filename docker/tv-station/hls2/seg%04d.mp4 docker/tv-station/hls2/master.m3u8 > /tmp/vp9.log 2>&1 < /dev/null &'`}
          />
          <ActionCard
            title="Restart Restream"
            command="pkill -9 -f restream.py; sleep 2; cd ~/hostamar-build && setsid python3 restream.py > /tmp/restream.log 2>&1 < /dev/null &"
          />
          <ActionCard
            title="Verify HLS2 Audio"
            command="ffmpeg -v error -i docker/tv-station/hls2/master.m3u8 -t 5 -af volumedetect -f null - 2>&1 | grep mean_volume"
          />
        </div>
      </section>
    </div>
  )
}

function StatusCard({ label, value, status, note }: { label: string; value: string; status: 'ok' | 'warn' | 'error' | 'info'; note: string }) {
  const colors = { ok: 'text-[#0E7C3A]', warn: 'text-amber-600', error: 'text-red-600', info: 'text-blue-600' }
  const icons = { ok: '✅', warn: '⚠️', error: '❌', info: '🔍' }
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-[#D8CDB4]">
      <div className="flex items-center gap-1 text-xs text-[#B8AFA3]">{icons[status]} {label}</div>
      <div className={`text-lg font-semibold ${colors[status]}`}>{value}</div>
      <div className="text-xs text-[#B8AFA3]">{note}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-[#B8AFA3]">{label}</span>
      <span className="break-all text-[#1C1917] font-mono">{value}</span>
    </div>
  )
}

function CmdButton({ cmd, label }: { cmd: string; label: string }) {
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(cmd)}
      className="rounded bg-[#0E7C3A] px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
      title="Click to copy"
    >
      {label}
    </button>
  )
}

function ActionCard({ title, command }: { title: string; command: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-[#D8CDB4]">
      <div className="mb-1 text-sm font-medium text-[#1C1917]">{title}</div>
      <code className="block overflow-x-auto whitespace-pre-wrap rounded bg-[#FBF4E4] p-2 text-xs text-[#1C1917]">{command}</code>
    </div>
  )
}
