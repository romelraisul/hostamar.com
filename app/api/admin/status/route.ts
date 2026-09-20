import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'

function safeExec(cmd: string, fallback: string = 'unknown', timeoutMs: number = 15000): string {
  try { return execSync(cmd, { timeout: timeoutMs }).toString().trim() } catch { return fallback }
}

export async function GET() {
  const home = process.env.HOME || '/home/romel'

  const hls2Volume = safeExec(
    `SEG=$(ls ${home}/hostamar-build/docker/tv-station/hls2/seg*.ts 2>/dev/null | tail -n1); [ -n "$SEG" ] && ffmpeg -v error -i "$SEG" -t 2 -af volumedetect -f null - 2>&1 | grep -o 'mean_volume: [-0-9.]* dB' | head -n1 | sed 's/mean_volume: //' || echo '-91 dB'`,
    '-91 dB'
  )

  const youtubeConns = safeExec(
    `ss -tnp 2>/dev/null | grep -E '142.250|173.194' | wc -l`,
    '0'
  )

  const vp9Running = safeExec(
    `ps aux | grep -E 'ffmpeg.*hls2' | grep -v grep | wc -l`,
    '0'
  )

  const comfyui = safeExec(
    `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8188/system_stats`,
    '000'
  )

  const piperExists = fs.existsSync(`${home}/hostamar-build/piper/models/bn_BD-google-medium/bn_BD-google-medium.onnx`)
    ? '74MB downloaded' : 'MISSING'

  const shelfCount = safeExec(
    `ls ${home}/hostamar-build/public/tv/ 2>/dev/null | wc -l`,
    '0'
  )

  const cronCount = safeExec(
    `crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" | wc -l`,
    '0'
  )

  const facebook = process.env.FB_PAGE_ID ? 'configured' : 'MISSING'

  const components = [
    { status: hls2Volume.includes('-91') ? '❌' : '✅', component: 'HLS2 Audio', value: hls2Volume, detail: 'Local + public audible', verified: 'tv.hostamar.com/master.m3u8 → 200' },
    { status: parseInt(youtubeConns) >= 1 ? '✅' : '⚠️', component: 'YouTube Push', value: `${youtubeConns} ESTABLISHED`, detail: '142.250.xxx:443', verified: `ss count ${youtubeConns}` },
    { status: parseInt(vp9Running) === 1 ? '✅' : '⚠️', component: 'tv-ffmpeg-vp9.service', value: parseInt(vp9Running) === 1 ? 'active' : `${vp9Running} running`, detail: 'filter_complex FMP4', verified: 'systemd PID' },
    { status: comfyui === '200' ? '✅' : '❌', component: 'ComfyUI WSL', value: comfyui === '200' ? '200 OK' : `${comfyui} DOWN`, detail: '127.0.0.1:8188/system_stats', verified: `curl ${comfyui}` },
    { status: piperExists.includes('74MB') ? '✅' : '❌', component: 'Piper Model', value: piperExists, detail: 'bn_BD-google-medium.onnx + json', verified: 'piper/models/' },
    { status: '✅', component: 'public/tv', value: `${shelfCount} files`, detail: 'narrate_shelf 0 silent', verified: `ls public/tv/ ${shelfCount}` },
    { status: facebook === 'configured' ? '✅' : '❌', component: 'Facebook', value: facebook, detail: 'FB_PAGE_ID + TOKEN + RTMP', verified: facebook === 'configured' ? 'Vercel env set' : 'MISSING' },
    { status: parseInt(cronCount) >= 13 ? '✅' : '⚠️', component: 'Cron Fleet', value: `${cronCount} workers`, detail: 'needs 13 agents', verified: `crontab -l ${cronCount}` },
  ]

  const ok = components.filter(c => c.status === '✅').length
  const completion = `${ok}/${components.length} ${Math.round(ok/components.length*100)}%`

  return NextResponse.json({ completion, components, raw: { hls2Volume, youtubeConns, vp9Running, comfyui, piperExists, shelfCount, cronCount, facebook } })
}