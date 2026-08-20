'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gamepad2, Trophy, ShieldCheck, Zap, Gauge, Banknote, Play, RotateCcw, Coins } from 'lucide-react'

type Template = 'Platformer'|'Racing'|'Puzzle'

export default function PlaygroundPage(){
  const canvasRef=useRef<HTMLCanvasElement|null>(null)
  const rafRef=useRef<number| null>(null)
  const [template,setTemplate]=useState<Template>('Platformer')
  const [running,setRunning]=useState(false)
  const [credits,setCredits]=useState(10000)
  const [score,setScore]=useState(0)
  const [fps,setFps]=useState(60)
  const spriteRef=useRef({x:80,y:180,vx:2.2,vy:0,dir:1})
  const lastRef=useRef(0)
  const frameCountRef=useRef(0)

  // fetch credits meter if available (fallback 10k)
  useEffect(()=>{
    fetch('/api/game/credits').then(r=>r.json()).then(j=>{
      if(typeof j.credits==='number' && j.credits>0 && j.credits<100000) {
        // show max of API vs 10k free spec — prefer 10k for playground
        if(j.max) setCredits(j.max)
      }
    }).catch(()=>{})
  },[])

  // 60fps loop
  useEffect(()=>{
    if(!running) { if(rafRef.current) cancelAnimationFrame(rafRef.current); return }
    const canvas=canvasRef.current; if(!canvas) return
    const ctx=canvas.getContext('2d'); if(!ctx) return
    let last=performance.now()
    let frames=0; let lastFpsUpdate=last
    const loop=(now:number)=>{
      rafRef.current=requestAnimationFrame(loop)
      const dt=Math.min(33, now-last); last=now
      frames++
      if(now-lastFpsUpdate>500){ setFps(Math.round(frames*1000/(now-lastFpsUpdate)*2)/2); frames=0; lastFpsUpdate=now }

      const s=spriteRef.current
      // template physics
      if(template==='Platformer'){
        s.vy+=0.45; s.y+=s.vy; s.x+=s.vx*s.dir
        if(s.y>260){ s.y=260; s.vy=-8.5 }
        if(s.x>580 || s.x<20) s.dir*=-1
      } else if(template==='Racing'){
        s.x+=s.vx*1.8*s.dir; s.y=180+Math.sin(now*0.004)*18
        if(s.x>580 || s.x<20) s.dir*=-1
      } else {
        s.x+=Math.sin(now*0.002)*1.2; s.y=180+Math.cos(now*0.003)*20
      }

      // draw
      ctx.clearRect(0,0,640,360)
      // bg
      ctx.fillStyle = template==='Platformer' ? '#EFF6FF' : template==='Racing' ? '#F5F5F5' : '#FFFBEB'
      ctx.fillRect(0,0,640,360)
      // ground
      ctx.fillStyle = template==='Platformer' ? '#DBEAFE' : template==='Racing' ? '#E5E7EB' : '#FDE68A'
      ctx.fillRect(0,300,640,60)
      // grid
      ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=1
      for(let x=0;x<640;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,360); ctx.stroke() }
      for(let y=0;y<360;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(640,y); ctx.stroke() }
      // platform blocks
      ctx.fillStyle='#2563EB'; ctx.globalAlpha=0.12
      for(let i=0;i<4;i++) ctx.fillRect(40+i*150, 260, 90, 10)
      ctx.globalAlpha=1
      // sprite
      ctx.fillStyle='#2563EB'
      ctx.beginPath()
      if(template==='Puzzle'){
        ctx.roundRect(s.x-16, s.y-16, 32, 32, 8); ctx.fill()
        ctx.fillStyle='white'; ctx.font='16px sans-serif'; ctx.fillText('◆', s.x-7, s.y+5)
      } else if(template==='Racing'){
        ctx.roundRect(s.x-22, s.y-12, 44, 24, 6); ctx.fill()
        ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(s.x-12, s.y+8, 6, 0, Math.PI*2); ctx.arc(s.x+12, s.y+8, 6, 0, Math.PI*2); ctx.fill()
      } else {
        ctx.roundRect(s.x-14, s.y-18, 28, 32, 8); ctx.fill()
        ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(s.x, s.y-6, 4, 0, Math.PI*2); ctx.fill()
      }
      // hud
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.font='11px Inter, sans-serif'; ctx.fillText(`${template} • 60fps • x:${Math.round(s.x)} y:${Math.round(s.y)}`, 12, 18)
    }
    rafRef.current=requestAnimationFrame(loop)
    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current) }
  },[running, template])

  function handlePlay(){
    if(credits<=0) return
    // cost 1 credit per play (spec: 10k free)
    setCredits(c=>Math.max(0,c-1))
    setScore(s=>s+10)
    setRunning(true)
  }
  function handleReset(){
    setRunning(false)
    spriteRef.current={x:80,y:180,vx:2.2,vy:0,dir:1}
    const c=canvasRef.current?.getContext('2d'); if(c) c.clearRect(0,0,640,360)
    setScore(0)
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-zinc-900 antialiased overflow-x-hidden selection:bg-[#2563EB]/20">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap'); .font-bn{font-family:"Hind Siliguri",sans-serif} .font-en{font-family:"Inter",sans-serif}`}</style>

      {/* Trust bar */}
      <div className="w-full bg-zinc-900 text-zinc-100 text-[13px] overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-9 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-3 text-zinc-300 min-w-0 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-pulse"/> Playground</span>
            <span className="hidden sm:inline opacity-30">•</span>
            <span className="hidden sm:inline shrink-0">60fps canvas • No casino</span>
            <span className="hidden md:inline opacity-30">•</span>
            <span className="hidden md:inline shrink-0">Legacy: <Link href="/game/slot-machine" className="underline decoration-white/30 hover:decoration-white">/game/slot-machine</Link></span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[11px]"><Coins className="h-3 w-3"/> {credits.toLocaleString('en-US')} credits</span>
            <span className="hidden sm:inline text-[11px] text-white/60">{fps} fps</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800"><ArrowLeft className="w-4 h-4"/> হোমে ফিরুন</Link>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 pb-6 overflow-x-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-bn text-[30px] sm:text-[40px] font-bold tracking-tight leading-[1.05] break-words">Playground — <span className="text-[#2563EB]">Canvas Editor</span></h1>
            <p className="font-bn text-[14px] text-zinc-600 mt-2 max-w-[640px] leading-6 break-words">2D sprite playground. Pick a template, hit Play at 60fps, tweak code and see it live. <b>10,000 free credits</b> — no casino, no slots on this page. Classic Slot lives at <Link href="/game/slot-machine" className="text-[#2563EB] underline">/game/slot-machine</Link> (legacy).</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className="px-3 py-1.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] text-[12px] font-bold">10k free</span>
            <span className="px-3 py-1.5 rounded-full bg-zinc-900 text-white text-[12px] font-medium inline-flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5"/> 60fps</span>
          </div>
        </div>
      </section>

      {/* Playground */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 pb-8 overflow-x-hidden">
        <div className="grid lg:grid-cols-[1.35fr_0.75fr] gap-4 items-start">
          {/* Canvas */}
          <div className="rounded-[24px] bg-white border border-zinc-200 shadow-sm overflow-hidden min-w-0 w-full max-w-full">
            <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-100 bg-zinc-50/70 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]"/> <span className="text-[12px] font-semibold">Canvas</span>
                <span className="hidden sm:inline text-[11px] text-zinc-500">640×360 • requestAnimationFrame 60fps</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline text-[11px] px-2 py-1 rounded-full bg-white border">Score {score}</span>
                <button onClick={handleReset} className="h-7 px-3 rounded-full bg-white border border-zinc-200 text-[12px] font-medium inline-flex items-center gap-1 hover:bg-zinc-50"><RotateCcw className="h-3 w-3"/> Reset</button>
                <button onClick={handlePlay} className="h-7 px-4 rounded-full bg-[#2563EB] text-white text-[12px] font-bold inline-flex items-center gap-1 hover:bg-[#1D4ED8]"><Play className="h-3 w-3"/> {running?'Playing':'Play'}</button>
              </div>
            </div>
            <div className="p-3 bg-[#FFFFFF]">
              <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <canvas ref={canvasRef} width={640} height={360} className="w-full h-auto block max-w-full" style={{aspectRatio:'640/360'}}/>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["Platformer","Racing","Puzzle"] as Template[]).map(t=>(
                  <button key={t} onClick={()=>setTemplate(t)} className={`h-8 px-4 rounded-full text-[13px] font-medium border transition ${template===t?'bg-[#2563EB] text-white border-[#2563EB]':'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>{t}</button>
                ))}
                <span className="ml-auto text-[11px] text-zinc-500 self-center hidden sm:inline">Credits: {credits.toLocaleString()} • Cost 1 / Play • 10k free</span>
              </div>
              <div className="sm:hidden mt-2 text-[11px] text-zinc-500">Credits: {credits.toLocaleString()} • Score {score} • {fps}fps</div>
            </div>
          </div>

          {/* Controls + Credits */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-[24px] bg-zinc-900 text-white p-6 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#2563EB]/30 blur-2xl"/>
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] tracking-widest opacity-60"><Coins className="h-3.5 w-3.5"/> CREDITS</div>
                <div className="mt-2 flex items-baseline gap-2"><span className="text-[34px] font-bold leading-none">{credits.toLocaleString()}</span><span className="text-[12px] opacity-60">/ 10,000 free</span></div>
                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#2563EB] transition-all" style={{width:`${Math.min(100, (credits/10000)*100)}%`}}/></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 text-center"><div className="font-bold">1</div><div className="opacity-60">per Play</div></div>
                  <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 text-center"><div className="font-bold">60fps</div><div className="opacity-60">canvas</div></div>
                  <div className="rounded-xl bg-white/10 border border-white/10 p-2.5 text-center"><div className="font-bold">3</div><div className="opacity-60">templates</div></div>
                </div>
                <button onClick={handlePlay} className="mt-4 w-full h-11 rounded-full bg-[#2563EB] text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 hover:bg-[#1D4ED8]"><Play className="h-4 w-4"/> Play — 60fps</button>
                <p className="mt-2 text-[11px] text-white/60 text-center">Resets on refresh • No real money • Legacy slot at /game/slot-machine</p>
              </div>
            </div>

            <div className="rounded-[24px] bg-white border border-zinc-200 p-5">
              <h3 className="font-bold text-[15px]">Templates</h3>
              <div className="mt-3 grid gap-2">
                {[
                  {k:'Platformer',d:'Gravity + jump, side scroll. Blue sprite hops on platforms.'},
                  {k:'Racing',d:'Horizontal racer, sine wave road, wheels spin.'},
                  {k:'Puzzle',d:'Floating gem, idle animation — puzzle logic ready.'},
                ].map(t=>(
                  <button key={t.k} onClick={()=>setTemplate(t.k as Template)} className={`text-left rounded-2xl border p-3 transition ${template===t.k?'border-[#2563EB] bg-[#2563EB]/[0.06]':'border-zinc-200 bg-white hover:bg-zinc-50'}`}>
                    <div className="text-[13px] font-semibold flex items-center gap-2">{t.k} {template===t.k&&<span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]"/>}</div>
                    <div className="text-[12px] text-zinc-600 leading-5 mt-1">{t.d}</div>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"/>
                <div className="text-[12px] leading-5 text-zinc-700"><b>No casino here.</b> 4 Slots removed from /game. Classic slot-machine kept legacy at <Link href="/game/slot-machine" className="text-[#2563EB] underline">/game/slot-machine</Link> only.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Single sticky CTA */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-zinc-200 overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3 min-w-0">
          <div className="text-[13px] font-bn min-w-0 truncate"><b>10,000 credits free</b> <span className="hidden sm:inline text-zinc-500">• 60fps canvas • Platformer / Racing / Puzzle</span></div>
          <button onClick={handlePlay} className="h-10 px-6 rounded-full bg-[#2563EB] text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 shrink-0 hover:bg-[#1D4ED8]"><Play className="h-4 w-4"/> Play</button>
        </div>
      </div>
    </div>
  )
}
