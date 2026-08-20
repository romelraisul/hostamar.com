'use client'
import { useState } from 'react'

export default function AndroidBuilder(){
  const [prompt, setPrompt] = useState('Create todo app with login, green #0E7C3A theme')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [buildLog, setBuildLog] = useState('')
  const [apkUrl, setApkUrl] = useState<string|null>(null)
  const [credits, setCredits] = useState(6000)

  const generate = async ()=>{
    setLoading(true); setCode(''); setApkUrl(null); setBuildLog('🤖 Generating with 93 models…')
    try{
      const res = await fetch('/api/ai/android/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt }) })
      const j = await res.json()
      if(j.code) setCode(j.code.slice(0,15000))
      if(typeof j.remaining==='number') setCredits(j.remaining)
      setBuildLog(j.message || '✔ Generated Expo app in /tmp/ai-android — preview ready')
    }catch(e:any){ setBuildLog('✕ '+(e.message||'error')) }
    setLoading(false)
  }
  const buildApk = async ()=>{
    setBuildLog('▲ Building APK 0 Taka — credit -100… (gradle 3-4 min)')
    try{
      const res = await fetch('/api/ai/android/build', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) })
      const j = await res.json()
      if(j.apkUrl) { setApkUrl(j.apkUrl); setBuildLog('✔ APK ready — '+j.apkUrl) }
      else setBuildLog(j.error || j.message || 'Build queued — check /tmp/ai-android build.log')
      if(typeof j.remaining==='number') setCredits(j.remaining)
    }catch(e:any){ setBuildLog('✕ Build error: '+(e.message)) }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🤖 AI Android Builder — 0 Taka</h1>
        <span className="text-sm px-3 py-1 rounded-full bg-[#0E7C3A] text-white font-bold">{credits}/6000</span>
      </div>
      <p className="text-sm text-zinc-600 mt-2">Prompt → Expo 51 app → QR + web preview → Build APK 0 Taka (credit 100)</p>
      <div className="mt-4 flex gap-2">
        <input value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Create todo app with login" className="flex-1 border rounded-xl px-4 py-2.5 text-sm" />
        <button onClick={generate} disabled={loading} className="px-6 py-2.5 rounded-full bg-[#0E7C3A] text-white font-bold disabled:opacity-50">{loading?'…':'Generate'}</button>
      </div>
      {code && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-zinc-50 p-3 overflow-auto max-h-[500px]">
            <div className="text-xs font-mono text-zinc-500 mb-2">App.tsx — copy to /tmp/ai-android</div>
            <pre className="text-xs font-mono whitespace-pre-wrap">{code}</pre>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm font-semibold">Build</div>
            <p className="text-xs text-zinc-600 mt-1">npx expo prebuild + eas build --local (no EXPO_TOKEN)</p>
            <button onClick={buildApk} className="mt-3 w-full py-2.5 rounded-full bg-zinc-900 text-white font-bold">Build APK 0 Taka — credit 100</button>
            {apkUrl && <a href={apkUrl} className="mt-2 block text-center py-2 rounded-full bg-[#0E7C3A] text-white font-bold">Download .apk</a>}
            <pre className="mt-3 text-xs bg-black text-green-400 p-3 rounded-xl whitespace-pre-wrap">{buildLog}</pre>
            <div className="mt-3 text-xs text-zinc-500">QR: run <code className="bg-zinc-100 px-1 rounded">npx expo start</code> then Expo Go scan</div>
          </div>
        </div>
      )}
      {!code && <pre className="mt-4 text-xs bg-black text-green-400 p-3 rounded-xl">{buildLog || '$ Ready — type prompt and Generate'}</pre>}
    </div>
  )
}
