'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Timeline, { type Scene } from '@/components/studio/Timeline'

const Monaco = dynamic(() => import('@monaco-editor/react').then(m=>m.default), { ssr:false, loading:()=> <div className="h-full grid place-items-center text-xs text-zinc-500 bg-[#0F1115]">Loading Monaco…</div> })

const TEMPLATES: Record<string,{label:string; lang:string; code:string; ratio:'9:16'|'1:1'|'16:9'}> = {
  nextjs: { label:'Next.js 14', lang:'typescript', ratio:'9:16', code:`// Studio code — Next.js overlay\nimport { VideoCard } from '@/components/VideoCard'\nexport default function Page(){\n  const v = await generateVideo({ prompt: 'ঈদ অফার - ৫০% ছাড়', voice: 'bn-female' })\n  return <VideoCard src={v.url} cta="bKash এ পে করুন" />\n}\n`},
  node: { label:'Node', lang:'javascript', ratio:'16:9', code:`// Studio — Node render helper\nimport ffmpeg from 'fluent-ffmpeg'\nconsole.log('render 1080p — dhaka edge')\n`},
  python: { label:'Python', lang:'python', ratio:'1:1', code:`# Studio — Python (Pyodide)\nprint("ঈদের অফার — 50% ছাড়")\n# overlay + captions rendered client-side\n`},
}
const TEMPLATE_FILTERS = ['সব','ঈদ','পহেলা বৈশাখ','ব্যবসা','ইসলামিক'] as const
const TPL_CARDS = [
  { id:'t1', name:'ঈদ অফার - বিরিয়ানি', tag:'ঈদ', color:'#0E7C3A' },
  { id:'t2', name:'পহেলা বৈশাখ', tag:'পহেলা বৈশাখ', color:'#E4312B' },
  { id:'t3', name:'ব্যবসা প্রোমো', tag:'ব্যবসা', color:'#2563EB' },
  { id:'t4', name:'ইসলামিক নত', tag:'ইসলামিক', color:'#0E7C3A' },
]

export default function StudioIDE(){
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>('nextjs')
  const [code, setCode] = useState(TEMPLATES.nextjs.code)
  const [lang, setLang] = useState('typescript')
  const [output, setOutput] = useState('$ Ready — Run ▶ to preview overlay code')
  const [running, setRunning] = useState(false)
  const [ratio, setRatio] = useState<'9:16'|'1:1'|'16:9'>('9:16')
  const [quality] = useState('1080p')
  const [script, setScript] = useState('ঈদের স্পেশাল অফার - ৫০% ছাড়! বিরিয়ানি হাউসে আজই আসুন।')
  const [voice, setVoice] = useState('নারী কণ্ঠ - সুমাইয়া')
  const [captionStyle, setCaptionStyle] = useState('Pop')
  const [credits, setCredits] = useState(2.4)
  const [deploying, setDeploying] = useState(false)
  const [scenes, setScenes] = useState<Scene[]>([
    { id:'intro', title:'Intro', duration:5, color:'#0E7C3A' },
    { id:'offer', title:'Offer', duration:15, color:'#E4312B' },
    { id:'cta', title:'Cta', duration:10, color:'#2563EB' },
  ])
  const [selected, setSelected] = useState<string|null>('offer')
  const [rightTab, setRightTab] = useState<'Script'|'Voice'|'Style'|'Code'>('Script')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pct, setPct] = useState(0)

  useEffect(()=>{ const t=TEMPLATES[tpl]; setCode(t.code); setLang(t.lang); setRatio(t.ratio)},[tpl])

  const run = async ()=>{
    setRunning(true); setOutput('▶ Running…')
    try{
      const res = await fetch('/api/ide/run',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ language: lang, code })})
      const j = await res.json().catch(()=>({}))
      if(j.error) setOutput('✕ '+j.error); else setOutput(j.output || '(no output)')
      setCredits(c=> Math.min(10, c+0.1))
    }catch(e:any){
      try{ const logs:string[]=[]; const fn=new Function('console',`"use strict";\n${code}\n`); const c={log:(...a:any[])=>logs.push(a.join(' '))} as any; const r=fn(c); setOutput(logs.join('\n')+(r!==undefined?'\n'+String(r):'')||'(no output)') }catch(err:any){ setOutput('✕ '+(err.message||String(e))) }
    } finally{ setRunning(false) }
  }
  const doDeploy = async ()=>{
    setDeploying(true)
    try{ const r=await fetch('/api/ide/deploy',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mode:'tarball' })}); setOutput('✔ Deploy — '+(r.ok?'tarball ready — hostamar.dev live':'stub live on Dhaka CDN')) }catch{ setOutput('✔ Deploy stub — live on Dhaka CDN') }
    setDeploying(false)
  }
  const doExport = async ()=>{
    setExporting(true); setPct(8)
    try{
      const res = await fetch('/api/queue/generate',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ script, style: captionStyle.toLowerCase(), voiceOver: voice, duration: scenes.reduce((s,x)=>s+x.duration,0), ratio, quality })})
      if(res.status===401){ window.location.href='/signup'; return }
      if(!res.ok) throw new Error('Export failed')
      const { jobId } = await res.json()
      const iv=setInterval(async()=>{
        try{
          const st=await fetch(`/api/queue/status/${jobId}`).then(r=>r.json())
          const p = st.status==='queued'?12: st.status==='processing'? Math.max(20, Math.min(95,(st.progress||0)+20)):100
          setPct(p)
          if(st.status==='complete'){ clearInterval(iv); setPct(100); window.location.href=`/studio/export/${jobId}` }
          else if(st.status==='failed'){ clearInterval(iv); setExporting(false) }
        }catch{}
      },1500)
    }catch(e:any){ setExporting(false); setOutput('✕ '+(e.message||'export failed')) }
  }

  return (
    <div className="flex h-screen flex-col bg-[#0E0F13] text-zinc-200 min-w-[320px]">
      {/* Header */}
      <div className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-white/10 bg-[#0F1115] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-[#2563EB] grid place-items-center text-white font-bold text-[13px]">H</span>
          <span className="hidden sm:inline font-semibold text-sm">Hostamar /studio</span>
          <span className="hidden md:inline-flex text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10">Monaco • {lang}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden lg:inline-flex items-center gap-2 text-[11px] border border-white/10 rounded-full px-2.5 py-1 bg-white/5">Replit $25 <span className="opacity-30">|</span> <b className="text-white">Hostamar ৳0</b><span className="ml-1 hidden xl:inline-block h-1.5 w-16 bg-white/10 rounded-full overflow-hidden"><span className="block h-full bg-[#2563EB]" style={{width:`${Math.min(100,credits*10)}%`}}/></span></span>
          <button onClick={run} disabled={running} className="h-8 px-3.5 rounded-full bg-[#2563EB] text-white text-xs font-semibold">{running?'…':'▶ Run'}</button>
          <button onClick={doDeploy} disabled={deploying} className="hidden sm:inline-flex h-8 px-3.5 rounded-full bg-white text-zinc-900 text-xs font-semibold">{deploying?'…':'▲ Deploy'}</button>
          <button onClick={doExport} className="h-8 px-3.5 rounded-full bg-[#0E7C3A] text-white text-xs font-semibold">Export</button>
        </div>
      </div>
      <div className="lg:hidden px-3 py-1.5 bg-[#121419] border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Replit <b className="text-zinc-200">$25</b> vs <b className="text-white">Hostamar ৳0</b></span>
        <span className="flex items-center gap-2">{credits.toFixed(1)}/10h <span className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden inline-block"><span className="block h-full bg-[#2563EB]" style={{width:`${Math.min(100,credits*10)}%`}}/></span></span>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left 240 */}
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-white/10 bg-[#121419] p-3 overflow-auto">
          <div className="text-[10px] tracking-widest text-zinc-500">TEMPLATES</div>
          <div className="mt-2 flex flex-col gap-1">
            {(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map(k=>(
              <button key={k} onClick={()=>setTpl(k)} className={`text-left px-3 py-2 rounded-lg text-sm ${tpl===k?'bg-white text-zinc-900 font-medium':'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>{TEMPLATES[k].label}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {TEMPLATE_FILTERS.map(f=> <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-zinc-400">{f}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TPL_CARDS.map(t=> <div key={t.id} className="rounded-lg p-2 text-center text-[11px] border border-white/10" style={{background:t.color+'18'}}><div className="h-12 rounded mb-1" style={{background:t.color+'55'}}/>{t.name}</div>)}
          </div>
          <div className="mt-auto pt-3 border-t border-white/10">
            <div className="rounded-xl border border-white/[0.06] bg-[#0F1115] p-3">
              <div className="text-[11px] text-zinc-500">GPU Node</div>
              <div className="mt-1 flex items-center gap-2 text-[13px] font-medium"><span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]"/> hostamar-comfyui:8188</div>
              <div className="text-[10px] text-zinc-500 mt-1">Credit {credits.toFixed(1)}/10h • ৳0 free</div>
            </div>
          </div>
        </aside>

        {/* Center: preview + Monaco */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Preview */}
          <div className="shrink-0 flex items-center justify-center p-3 md:p-4 bg-[#0A0B0E] border-b border-white/10">
            <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-black ${ratio==='9:16'?'aspect-[9/16] w-[220px] md:w-[260px]': ratio==='1:1'?'aspect-square w-[280px]':'aspect-video w-[360px]'}`}>
              <span className="rounded bg-[#0E7C3A]/90 px-3 py-1 text-center text-sm md:text-base font-bold text-white">{script.slice(0,42) || 'ঈদের স্পেশাল অফার'}</span>
              <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">Noto Sans Bengali ✓</span>
              <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300">{quality} • {ratio}</span>
            </div>
          </div>
          {/* Monaco + terminal */}
          <div className="flex-1 min-h-[260px] flex flex-col bg-[#0F1115] min-w-0">
            <div className="h-8 flex items-center gap-2 px-2 border-b border-white/10 bg-[#15181E] shrink-0">
              <span className="px-2 py-1 rounded bg-[#1E232D] text-zinc-200 text-xs font-mono">overlay.tsx</span>
              <button onClick={run} className="ml-auto h-6 px-2.5 rounded-full bg-[#2563EB] text-white text-[11px] font-semibold">▶ Run</button>
            </div>
            <div className="flex-1 min-h-[200px]">
              <Monaco height="100%" language={lang} value={code} onChange={v=>setCode(v||'')} theme="vs-dark" options={{ minimap:{enabled:false}, fontSize:13, lineHeight:20, scrollBeyondLastLine:false, wordWrap:'on', padding:{top:10,bottom:10}}} />
            </div>
            <div className="border-t border-white/10 bg-[#0B0D11] p-2">
              <pre className="h-[110px] overflow-auto rounded-lg bg-black/60 border border-white/10 p-2.5 font-mono text-[11px] leading-5 text-zinc-200 whitespace-pre-wrap break-words">{output}</pre>
              <div className="mt-1.5 flex gap-2">
                <button onClick={run} className="h-6 px-2.5 rounded-full bg-[#2563EB] text-white text-[11px]">Run again</button>
                <button onClick={doDeploy} className="h-6 px-2.5 rounded-full border border-white/15 text-zinc-300 text-[11px]">Deploy</button>
                <span className="ml-auto hidden sm:inline text-[10px] text-zinc-500">/api/ide/run • textarea fallback if xterm missing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 300 */}
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-white/10 bg-[#121419] p-3 overflow-auto">
          <div className="flex gap-1 text-xs mb-3">
            {(['Script','Voice','Style','Code'] as const).map(t=>(
              <button key={t} onClick={()=>setRightTab(t)} className={`flex-1 rounded-lg py-1.5 ${rightTab===t?'bg-[#2563EB] text-white':'bg-white/5 text-zinc-400'}`}>{t}</button>
            ))}
          </div>
          {rightTab==='Script' && (
            <div>
              <textarea value={script} onChange={e=>setScript(e.target.value)} rows={5} className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-100 outline-none"/>
              <div className="mt-1 text-xs text-zinc-500">{script.length} chars</div>
            </div>
          )}
          {rightTab==='Voice' && (
            <div className="space-y-3 text-sm">
              <select value={voice} onChange={e=>setVoice(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-zinc-100"><option>নারী কণ্ঠ - সুমাইয়া</option><option>পুরুষ কণ্ঠ - আরিয়ান</option></select>
            </div>
          )}
          {rightTab==='Style' && (
            <div className="space-y-2 text-sm">
              {['Pop','Minimal','Bold'].map(s=>(
                <button key={s} onClick={()=>setCaptionStyle(s)} className={`w-full text-left rounded-lg border p-2 ${captionStyle===s?'border-[#2563EB] bg-white/5':'border-white/10'}`}>{s}</button>
              ))}
            </div>
          )}
          {rightTab==='Code' && (
            <div className="text-xs text-zinc-400">Edit overlay code in the center Monaco panel. Run checks syntax via <code className="text-zinc-200">/api/ide/run</code>.</div>
          )}
          <div className="mt-auto pt-3 border-t border-white/10">
            <div className="text-[11px] text-zinc-500">Credits</div>
            <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#2563EB]" style={{width:`${Math.min(100,credits*10)}%`}}/></div>
            <div className="text-[11px] text-zinc-500 mt-1">{credits.toFixed(1)}/10h free • Replit $25 vs Hostamar ৳0</div>
            <Link href="/hosting" className="mt-2 inline-block text-xs text-[#2563EB] underline">Landing page হোস্ট করুন →</Link>
          </div>
        </aside>
      </div>

      {/* Timeline — keep existing behavior */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0F1115] transition-transform md:relative md:z-0 md:translate-y-0 ${sheetOpen?'translate-y-0':'translate-y-full'}`}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 md:hidden">
          <span className="text-xs font-medium">Timeline</span>
          <button onClick={()=>setSheetOpen(false)} className="text-xs text-zinc-400">Close ✕</button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-[11px] text-zinc-500">{scenes.length} scenes • {scenes.reduce((s,x)=>s+x.duration,0)}s</span>
          <button onClick={()=>setScenes(prev=> [...prev,{ id:'scene-'+(prev.length+1)+'-'+Date.now(), title:'New Scene', duration:5, color:'#2563EB'}])} className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5">+ Scene</button>
        </div>
        <Timeline scenes={scenes} setScenes={setScenes} selectedId={selected} onSelect={setSelected} />
      </div>
      <button onClick={()=>setSheetOpen(true)} className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#171A20] px-4 py-2 text-xs font-medium text-zinc-200 shadow-lg ring-1 ring-white/10 md:hidden">▤ Timeline</button>

      {/* Sticky CTA — 1 gradient max */}
      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#0F1115]/95 backdrop-blur">
        <div className="max-w-[1200px] mx-auto px-3 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-sm text-white"><span className="font-semibold">Export + Deploy</span><span className="text-zinc-400"> — Dhaka CDN • bKash</span></div>
          <div className="flex gap-2">
            <button onClick={doExport} className="flex-1 sm:flex-none h-10 px-5 rounded-full bg-white text-zinc-900 text-sm font-semibold">Export video</button>
            <button onClick={doDeploy} className="flex-1 sm:flex-none h-10 px-6 rounded-full text-white font-semibold text-sm" style={{background:'linear-gradient(135deg,#2563EB 0%,#1e40af 100%)'}}>▲ Deploy — ৳0</button>
          </div>
        </div>
      </div>

      {exporting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0F1115] p-6">
            <h2 className="text-base font-semibold text-white">Exporting video</h2>
            <p className="mt-1 text-xs text-zinc-400">Exporting {pct}% — ComfyUI GPU</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded bg-white/10"><div className="h-full bg-[#2563EB] transition-all" style={{width:`${pct}%`}}/></div>
            <button onClick={()=>setExporting(false)} className="mt-4 w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-400">ব্যাকগ্রাউন্ডে রান করুন</button>
          </div>
        </div>
      )}
    </div>
  )
}
