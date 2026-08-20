'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const Monaco = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false, loading: () => <div className="h-full grid place-items-center text-xs text-zinc-500 bg-[#0F1115]">Loading Monaco…</div> })

type FileNode = { name: string; path: string; type: 'file' | 'dir'; children?: FileNode[] }

const TEMPLATES: Record<string, { label: string; lang: string; code: string }> = {
  nextjs: { label: 'Next.js 14', lang: 'typescript', code: `// Next.js 14 — app/page.tsx
import { VideoCard } from '@/components/VideoCard'
export default function Page(){
  // ঈদ অফার ভিডিও
  const video = await generateVideo({ prompt: 'ঈদ অফার - ৫০% ছাড়', voice: 'bn-female' })
  return <VideoCard src={video.url} cta="bKash এ পে করুন" />
}
` },
  expo: { label: 'Expo Android', lang: 'typescript', code: `// Expo — App.tsx (Android)
import { View, Text, Pressable } from 'react-native'
export default function App(){
  return (
    <View style={{flex:1, backgroundColor:'#0E7C3A', padding:20, justifyContent:'center'}}>
      <Text style={{color:'white', fontSize:22, fontWeight:'bold'}}>Hostamar Android</Text>
      <Text style={{color:'white', marginTop:8}}>6000 credit • Tailscale 100.89.x.x</Text>
      <Pressable style={{backgroundColor:'white', padding:12, borderRadius:12, marginTop:16}}>
        <Text style={{color:'#0E7C3A', fontWeight:'bold', textAlign:'center'}}>Build APK</Text>
      </Pressable>
    </View>
  )
}
` },
  node: { label: 'Node / Express', lang: 'javascript', code: `// Node.js — server.js
import express from 'express'
const app = express()
app.get('/api/health', (req,res)=> res.json({ ok:true, region:'dhaka' }))
app.listen(3000, ()=> console.log('ready on http://localhost:3000'))
` },
  python: { label: 'Python FastAPI', lang: 'python', code: `# Python — main.py
from fastapi import FastAPI
app = FastAPI()
@app.get("/api/offer")
def offer():
    return {"title": "ঈদ অফার", "discount": "50%"}
print("FastAPI ready — 200 OK")
` },
}

export default function DevIDE(){
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>('nextjs')
  const [code, setCode] = useState(TEMPLATES.nextjs.code)
  const [lang, setLang] = useState('typescript')
  const [output, setOutput] = useState<string>('$ Ready — hit Run ▶ (credit 5) / Build (credit 100)')
  const [running, setRunning] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployUrl, setDeployUrl] = useState<string|null>(null)
  const [credits, setCredits] = useState(6000)
  const [pct, setPct] = useState(100)
  const [mobileNav, setMobileNav] = useState(false)
  const [termOpen, setTermOpen] = useState(true)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [files, setFiles] = useState<FileNode[]>([{ name: 'app', path: 'app', type: 'dir', children: [{ name: 'page.tsx', path: 'app/page.tsx', type: 'file' }] }])
  const [activeFile, setActiveFile] = useState('app/page.tsx')

  useEffect(()=>{ const t=TEMPLATES[tpl]; setCode(t.code); setLang(t.lang) },[tpl])
  useEffect(()=> setPct(Math.round((credits/6000)*100)), [credits])
  useEffect(()=>{
    fetch('/api/ide/files').then(r=>r.json()).then(j=>{ if(j.files) setFiles(j.files) }).catch(()=>{})
    fetch('/api/dev/credit').then(r=>r.json()).then(j=>{ if(typeof j.credits==='number') setCredits(j.credits) }).catch(()=>{})
  }, [])

  const save = async ()=>{
    await fetch('/api/dev/files', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path: activeFile, content: code }) }).catch(()=>{})
  }

  const run = async ()=>{
    setRunning(true); setOutput('▶ Running… (credit -5)')
    try{
      const res = await fetch('/api/ide/run',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ language: lang, code })})
      const j = await res.json().catch(()=>({}))
      if(j.error) setOutput('✕ '+j.error)
      else setOutput(j.output || '(no output)')
      if(typeof j.remaining==='number') setCredits(j.remaining)
      else setCredits(c=> Math.max(0, c-5))
    }catch(e:any){
      try{ const logs:string[]=[]; const fn=new Function('console',`"use strict";\n${code}\n`); const c={log:(...a:any[])=>logs.push(a.join(' '))} as any; const r=fn(c); setOutput(logs.join('\n')+(r!==undefined?'\n'+String(r):'')||'(no output)') }catch(err:any){ setOutput('✕ '+(err.message||String(e))) }
    } finally{ setRunning(false) }
  }
  const build = async ()=>{
    setDeploying(true); setOutput('▲ Building… (credit -100)')
    try{
      const res = await fetch('/api/ide/deploy',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mode:'tarball', code, lang })})
      if(res.headers.get('Content-Type')?.includes('gzip')){ setDeployUrl('https://demo.hostamar.dev — tarball ready'); setOutput('✔ Build tarball — download ready (hostamar.dev live in 2s)') }
      else { const j=await res.json(); setDeployUrl(j.dockerCompose?'docker-compose ready':'https://demo.hostamar.dev'); setOutput('✔ Build — '+ (j.message||'live on Dhaka CDN')); if(typeof j.remaining==='number') setCredits(j.remaining); else setCredits(c=> Math.max(0,c-100)) }
    }catch{ setDeployUrl('https://demo.hostamar.dev'); setOutput('✔ Build stub — live on Dhaka CDN (offline mock)') }
    setDeploying(false)
  }
  const askAI = async ()=>{
    if(!aiPrompt.trim()) return
    setAiLoading(true)
    try{
      const res = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[{role:'user', content: aiPrompt}], model:'general' }) })
      const j = await res.json()
      const text = j.content || j.message || j.reply || ''
      if(text) setCode(text.slice(0,12000))
      setOutput('🤖 AI → editor filled ('+text.length+' chars)')
    }catch(e:any){ setOutput('✕ AI error: '+(e.message||'unknown')) }
    setAiLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-zinc-900 flex flex-col min-w-[320px]">
      <div className="h-11 shrink-0 flex items-center justify-between px-3 md:px-4 border-b bg-white sticky top-0 z-20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-[#0E7C3A] grid place-items-center text-white font-bold text-[13px]">H</span>
          <span className="font-semibold text-sm hidden sm:inline">Hostamar /dev</span>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-2">● 6000 credit live</span>
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-zinc-900 text-white ml-1">{pct}% • Video 100 • Chat 1 • Browser 5 • IDE 10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-1.5">
            <div className="h-6 w-20 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-[#0E7C3A]" style={{width: pct+'%'}}/></div>
            <span className="text-[11px] font-medium text-zinc-600">{credits}/6000</span>
          </div>
          <button onClick={run} disabled={running} className="h-8 px-3.5 rounded-full bg-[#0E7C3A] text-white text-xs font-semibold hover:bg-[#0c6a32] disabled:opacity-50">{running?'…':'▶ Run'}</button>
          <button onClick={build} disabled={deploying} className="h-8 px-3.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-black disabled:opacity-50 hidden sm:inline-flex items-center">{deploying?'Building…':'▲ Build'}</button>
          <Link href="/dev/android" className="h-8 px-3 rounded-full bg-[#2563EB] text-white text-xs font-semibold hidden sm:inline-flex items-center">🤖 Android</Link>
          <button onClick={()=>setMobileNav(!mobileNav)} className="md:hidden h-8 w-8 grid place-items-center rounded-lg border bg-white">≡</button>
        </div>
      </div>

      <div className="lg:hidden px-3 py-2 bg-white border-b flex items-center justify-between text-[11px]">
        <span className="text-zinc-600">6000 credit • <b className="text-[#0E7C3A]">{credits}/6000 {pct}%</b></span>
        <span className="text-zinc-500">Replit $25 vs <b className="text-[#0E7C3A]">Hostamar ৳0</b></span>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className={`${mobileNav?'flex':'hidden'} md:flex w-[260px] shrink-0 flex-col border-r bg-[#0F1115] text-zinc-300 absolute md:static inset-y-0 left-0 top-[44px] md:top-auto z-10 md:z-auto`}>
          <div className="p-3">
            <div className="text-[10px] tracking-widest text-zinc-500 mb-2">TEMPLATES</div>
            {(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map(k=>(
              <button key={k} onClick={()=>{setTpl(k); setMobileNav(false)}} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${tpl===k?'bg-white text-zinc-900 font-medium':'hover:bg-white/10 text-zinc-300'}`}>{TEMPLATES[k].label}</button>
            ))}
            <Link href="/dev/android" className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium">🤖 AI Android Builder →</Link>
            <div className="mt-3 text-[10px] tracking-widest text-zinc-500">EXPLORER</div>
            <div className="mt-2 font-mono text-xs leading-6 text-zinc-400">
              {files.map(n=>(
                <div key={n.path}>
                  <div className="text-white">▶ {n.name}</div>
                  {n.children?.map(c=> <button key={c.path} onClick={()=>{setActiveFile(c.path)}} className={`pl-3 block text-left w-full ${activeFile===c.path?'text-sky-300':''}`}>{c.name} {activeFile===c.path?'●':''}</button>)}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <div className="text-xs font-medium text-white">6000 credit</div>
              <div className="text-[11px] text-zinc-400 mt-1"><b className="text-white">{credits}</b>/6000 • IDE 10 • Build 100 • Chat 1</div>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#0E7C3A]" style={{width:pct+'%'}}/></div>
            </div>
            <div className="mt-3 rounded-xl bg-[#0E7C3A]/20 border border-[#0E7C3A]/30 p-3">
              <div className="text-xs font-medium text-white">AI Chat — 93 models</div>
              <div className="flex gap-1 mt-2">
                <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askAI()} placeholder="Build me Android notes app…" className="flex-1 min-w-0 rounded-full bg-white text-zinc-900 px-3 py-1.5 text-xs" />
                <button onClick={askAI} disabled={aiLoading} className="h-7 px-3 rounded-full bg-[#0E7C3A] text-white text-xs font-bold disabled:opacity-50">{aiLoading?'…':'Go'}</button>
              </div>
            </div>
          </div>
          <div className="mt-auto p-3 border-t border-white/10">
            <div className="text-[11px] text-zinc-500">Deploy target</div>
            <div className="text-xs text-emerald-300 mt-1 truncate">{deployUrl || '— hit Build'}</div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col bg-[#0F1115]">
          <div className="h-9 flex items-center gap-1 px-2 border-b border-white/10 bg-[#15181E] shrink-0 overflow-x-auto">
            <span className="px-2.5 py-1 rounded bg-[#1E232D] text-zinc-200 text-xs font-mono">{activeFile}</span>
            <span className="text-[11px] text-zinc-500 ml-2 hidden sm:inline">Monaco • {lang} • ⌘+S to save (credit 1)</span>
            <button onClick={save} className="ml-auto text-[11px] px-2 py-1 rounded bg-white/10 text-zinc-300 hover:bg-white/20">Save</button>
          </div>
          <div className="flex-1 min-h-[320px] md:min-h-[420px]">
            <Monaco
              height="100%"
              language={lang}
              value={code}
              onChange={v=> setCode(v||'')}
              theme="vs-dark"
              options={{ minimap:{enabled:false}, fontSize:13, lineHeight:20, scrollBeyondLastLine:false, wordWrap:'on', padding:{top:12,bottom:12} }}
            />
          </div>
          <div className="border-t border-white/10 bg-[#0B0D11] shrink-0">
            <button onClick={()=>setTermOpen(!termOpen)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] tracking-widest text-zinc-500 hover:bg-white/[0.04]">
              <span>TERMINAL {running && '● running'} • xterm • gateway.py 127.0.0.1:3000</span><span>{termOpen?'▾':'▸'}</span>
            </button>
            {termOpen && (
              <div className="px-3 pb-3">
                <pre className="h-[160px] md:h-[180px] overflow-auto rounded-lg bg-black/60 border border-white/10 p-3 font-mono text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words">{output}</pre>
                <div className="mt-2 flex gap-2">
                  <button onClick={run} className="h-7 px-3 rounded-full bg-[#0E7C3A] text-white text-xs font-medium">Run again</button>
                  <button onClick={()=>setOutput('$ cleared')} className="h-7 px-3 rounded-full border border-white/15 text-zinc-300 text-xs">Clear</button>
                  <span className="ml-auto text-[11px] text-zinc-500 hidden sm:inline">/api/ide/run • /api/ide/deploy</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-[1200px] mx-auto px-3 md:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-sm"><span className="font-semibold">Deploy এক ক্লিকে</span><span className="text-zinc-500"> — bKash • Dhaka CDN • free SSL • 6000 credit</span></div>
          <div className="flex gap-2">
            <button onClick={run} className="flex-1 sm:flex-none h-10 px-5 rounded-full bg-white border border-zinc-200 text-sm font-medium">Run ▶</button>
            <button onClick={build} className="flex-1 sm:flex-none h-10 px-6 rounded-full text-white font-semibold text-sm" style={{background:'linear-gradient(135deg,#0E7C3A 0%,#1e4020 100%)'}}>▲ Build — credit 100</button>
          </div>
        </div>
      </div>
    </div>
  )
}
