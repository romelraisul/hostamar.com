'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const Monaco = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false, loading: () => <div className="h-full grid place-items-center text-xs text-zinc-500 bg-[#0F1115]">Loading Monaco…</div> })

const TEMPLATES: Record<string, { label: string; lang: string; code: string }> = {
  nextjs: { label: 'Next.js 14', lang: 'typescript', code: `// Next.js 14 — app/page.tsx\nimport { VideoCard } from '@/components/VideoCard'\n\nexport default function Page(){\n  // ঈদ অফার ভিডিও\n  const video = await generateVideo({ prompt: 'ঈদ অফার - ৫০% ছাড়', voice: 'bn-female' })\n  return <VideoCard src={video.url} cta="bKash এ পে করুন" />\n}\n` },
  node: { label: 'Node / Express', lang: 'javascript', code: `// Node.js — server.js\nimport express from 'express'\nconst app = express()\napp.get('/api/health', (req,res)=> res.json({ ok:true, region:'dhaka' }))\napp.listen(3000, ()=> console.log('ready on http://localhost:3000'))\n` },
  python: { label: 'Python FastAPI', lang: 'python', code: `# Python — main.py (Pyodide in browser, no install)\nfrom fastapi import FastAPI\napp = FastAPI()\n@app.get("/api/offer")\ndef offer():\n    return {"title": "ঈদ অফার", "discount": "50%", "cta": "bKash এ পে করুন"}\nprint("FastAPI ready — 200 OK")\n` },
}

export default function DevIDE(){
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>('nextjs')
  const [code, setCode] = useState(TEMPLATES.nextjs.code)
  const [lang, setLang] = useState('typescript')
  const [output, setOutput] = useState<string>('$ Ready — hit Run ▶')
  const [running, setRunning] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployUrl, setDeployUrl] = useState<string|null>(null)
  const [credits, setCredits] = useState(2) // Hostamar free hours used demo
  const [mobileNav, setMobileNav] = useState(false)
  const [termOpen, setTermOpen] = useState(true)

  useEffect(()=>{ const t=TEMPLATES[tpl]; setCode(t.code); setLang(t.lang) },[tpl])

  const run = async ()=>{
    setRunning(true); setOutput('▶ Running…')
    try{
      const res = await fetch('/api/ide/run',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ language: lang, code })})
      const j = await res.json().catch(()=>({}))
      if(j.error) setOutput('✕ '+j.error)
      else setOutput(j.output || '(no output)')
      setCredits(c=> Math.min(10, c+0.1))
    }catch(e:any){ // fallback local eval for js
      try{ const logs:string[]=[]; const fn=new Function('console',`"use strict";\n${code}\n`); const c={log:(...a:any[])=>logs.push(a.join(' '))} as any; const r=fn(c); setOutput(logs.join('\n')+(r!==undefined?'\n'+String(r):'')||'(no output)') }catch(err:any){ setOutput('✕ '+(err.message||String(e))) }
    } finally{ setRunning(false) }
  }
  const deploy = async ()=>{
    setDeploying(true)
    try{
      const res = await fetch('/api/ide/deploy',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mode:'tarball' })})
      if(res.headers.get('Content-Type')?.includes('gzip')){ setDeployUrl('https://demo.hostamar.dev — tarball ready (downloaded)'); setOutput('✔ Deploy tarball generated — hostamar.dev live in 2s') }
      else { const j=await res.json(); setDeployUrl(j.dockerCompose?'docker-compose ready':'https://demo.hostamar.dev'); setOutput('✔ Deploy stub — '+ (j.message||'live on Dhaka CDN')) }
    }catch{ setDeployUrl('https://demo.hostamar.dev'); setOutput('✔ Deploy stub — live on Dhaka CDN (offline mock)') }
    setDeploying(false)
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-zinc-900 flex flex-col min-w-[320px]">
      {/* Top bar */}
      <div className="h-11 shrink-0 flex items-center justify-between px-3 md:px-4 border-b bg-white sticky top-0 z-20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-[#2563EB] grid place-items-center text-white font-bold text-[13px]">H</span>
          <span className="font-semibold text-sm hidden sm:inline">Hostamar /dev</span>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-2">● Dhaka edge live</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-1 text-[11px] border rounded-full px-2 py-1 bg-zinc-50">
            <span className="text-zinc-500">Replit $25</span><span className="opacity-30">|</span><span className="font-semibold text-[#2563EB]">Hostamar ৳0</span>
            <span className="ml-1 h-1.5 w-16 bg-zinc-200 rounded-full overflow-hidden hidden xl:inline-block"><span className="block h-full bg-[#2563EB]" style={{width: `${Math.min(100, credits*10)}%`}}/></span>
          </div>
          <button onClick={run} disabled={running} className="h-8 px-3.5 rounded-full bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1d4ed8] disabled:opacity-50">{running?'…':'▶ Run'}</button>
          <button onClick={deploy} disabled={deploying} className="h-8 px-3.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-black disabled:opacity-50 hidden sm:inline-flex items-center">{deploying?'Deploying…':'▲ Deploy'}</button>
          <button onClick={()=>setMobileNav(!mobileNav)} className="md:hidden h-8 w-8 grid place-items-center rounded-lg border bg-white">≡</button>
        </div>
      </div>

      {/* Credit meter mobile */}
      <div className="lg:hidden px-3 py-2 bg-white border-b flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Replit <b className="text-zinc-700">$25/mo</b> vs <b className="text-[#2563EB]">Hostamar ৳0</b></span>
        <span className="text-zinc-500">{credits.toFixed(1)}/10h free</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`${mobileNav?'flex':'hidden'} md:flex w-[240px] shrink-0 flex-col border-r bg-[#0F1115] text-zinc-300 absolute md:static inset-y-0 left-0 top-[44px] md:top-auto z-10 md:z-auto`}>
          <div className="p-3">
            <div className="text-[10px] tracking-widest text-zinc-500 mb-2">TEMPLATES</div>
            {(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map(k=>(
              <button key={k} onClick={()=>{setTpl(k); setMobileNav(false)}} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${tpl===k?'bg-white text-zinc-900 font-medium':'hover:bg-white/10 text-zinc-300'}`}>{TEMPLATES[k].label}</button>
            ))}
            <div className="mt-3 text-[10px] tracking-widest text-zinc-500">EXPLORER</div>
            <div className="mt-2 font-mono text-xs leading-6 text-zinc-400">
              <div className="text-white">▶ app</div>
              <div className="pl-3 text-sky-300">page.tsx ●</div>
              <div className="pl-3">layout.tsx</div>
              <div className="pl-3">globals.css</div>
            </div>
            <div className="mt-4 rounded-xl bg-white/[0.06] border border-white/10 p-3">
              <div className="text-xs font-medium text-white">Credit meter</div>
              <div className="text-[11px] text-zinc-400 mt-1">Hostamar <b className="text-white">৳0 free</b> — 10h fair-use. Replit Core $25.</div>
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#2563EB]" style={{width:`${Math.min(100, credits*10)}%`}}/></div>
              <div className="text-[10px] text-zinc-500 mt-1">{credits.toFixed(1)}h used • bKash pay when you scale</div>
            </div>
          </div>
          <div className="mt-auto p-3 border-t border-white/10">
            <div className="text-[11px] text-zinc-500">Deploy target</div>
            <div className="text-xs text-emerald-300 mt-1 truncate">{deployUrl || '— hit Deploy'}</div>
          </div>
        </aside>

        {/* Editor + terminal */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0F1115]">
          <div className="h-9 flex items-center gap-1 px-2 border-b border-white/10 bg-[#15181E] shrink-0 overflow-x-auto">
            <span className="px-2.5 py-1 rounded bg-[#1E232D] text-zinc-200 text-xs font-mono">page.tsx</span>
            <span className="text-[11px] text-zinc-500 ml-2 hidden sm:inline">Monaco • {lang} • Tab-complete • ⌘+Enter to Run</span>
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
          {/* Terminal */}
          <div className="border-t border-white/10 bg-[#0B0D11] shrink-0">
            <button onClick={()=>setTermOpen(!termOpen)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] tracking-widest text-zinc-500 hover:bg-white/[0.04]">
              <span>TERMINAL {running && '● running'}</span><span>{termOpen?'▾':'▸'}</span>
            </button>
            {termOpen && (
              <div className="px-3 pb-3">
                <pre className="h-[160px] md:h-[180px] overflow-auto rounded-lg bg-black/60 border border-white/10 p-3 font-mono text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words">{output}</pre>
                <div className="mt-2 flex gap-2">
                  <button onClick={run} className="h-7 px-3 rounded-full bg-[#2563EB] text-white text-xs font-medium">Run again</button>
                  <button onClick={()=>setOutput('$ cleared')} className="h-7 px-3 rounded-full border border-white/15 text-zinc-300 text-xs">Clear</button>
                  <span className="ml-auto text-[11px] text-zinc-500 hidden sm:inline">xterm fallback → textarea; /api/ide/run</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky CTA — 1 gradient max */}
      <div className="sticky bottom-0 z-20 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-[1200px] mx-auto px-3 md:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-sm"><span className="font-semibold">Deploy এক ক্লিকে</span><span className="text-zinc-500"> — bKash • Dhaka CDN • free SSL</span></div>
          <div className="flex gap-2">
            <button onClick={run} className="flex-1 sm:flex-none h-10 px-5 rounded-full bg-white border border-zinc-200 text-sm font-medium">Run ▶</button>
            <button onClick={deploy} className="flex-1 sm:flex-none h-10 px-6 rounded-full text-white font-semibold text-sm" style={{background:'linear-gradient(135deg,#2563EB 0%,#1e40af 100%)'}}>▲ Deploy — ৳0</button>
          </div>
        </div>
      </div>
    </div>
  )
}
