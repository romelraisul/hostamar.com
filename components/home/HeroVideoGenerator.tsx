'use client'
import { useEffect, useState } from 'react'
import TvHero from './TvHero'

type V = { id:string; title:string; topic:string }

export default function HeroVideoGenerator(){
  const [v, setV] = useState<V | null>(null)
  const [hero, setHero] = useState<'latest'|'eid'|'boishakh'|'sale'>('latest')
  useEffect(()=>{
    fetch('/api/showcase?limit=1').then(r=>r.json()).then(j=>{
      const first = Array.isArray(j) ? j[0] : j
      if(first?.id) setV(first)
      else setV({ id:'cmt20e9750001pi1l7ist6lo6', title:'6y7', topic:'y78' })
    }).catch(()=> setV({ id:'cmt20e9750001pi1l7ist6lo6', title:'6y7', topic:'y78' }))
  }, [])
  const showcaseId = v?.id || 'cmt20e9750001pi1l7ist6lo6'
  const title = v?.title || '6y7'
  const topic = v?.topic || 'y78'
  const src = `/showcase/${showcaseId}.mp4`
  return (
    <section className="bg-gradient-to-b from-[#F0FDF4] to-white py-8">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-5">
        <div className="flex items-center gap-2 text-[#0E7C3A] font-bold text-sm">🎬 AI ভিডিও জেনারেটর</div>
        <div className="text-sm text-zinc-600">ঈদ • বৈশাখ • 11.11 • ৫০+ টেমপ্লেট</div>
        <div className="mt-4 grid md:grid-cols-[30%_70%] gap-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight">AI দিয়ে মার্কেটিং ভিডিও বানান ৩০ সেকেন্ডে</h1>
            <p className="text-sm text-zinc-600">পণ্যের ছবি দিন, AI বাকিটা সামলাবে — বাংলা ভয়েসওভার, সাবটাইটেল, লোগো সহ</p>
            <a href="/generate" className="inline-block bg-[#0E7C3A] hover:bg-[#0A5A2B] text-white px-6 py-2.5 rounded-full font-bold text-sm">ভিডিও বানান — 100 ক্রেডিট</a>
            <div className="text-xs text-zinc-500">500+ creators • 10k+ videos • 4.8★</div>
            <video src={`/showcase/${showcaseId}.mp4`} poster="" className="w-full h-24 object-cover rounded-xl border border-[#0E7C3A]/20 hidden md:block" muted loop playsInline autoPlay controls={false} />
          </div>
          <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#0E7C3A] bg-black">
            {hero==='latest' ? (
              /* LIVE Hostamar TV — homepage main hero (70% cell) */
              <TvHero />
            ) : (
              <>
                <video src={`/showcase/${showcaseId}.mp4`} poster="" className="w-full h-full object-cover" muted loop playsInline autoPlay controls />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-white/90 text-[#0E7C3A] rounded-full w-16 h-16 flex items-center justify-center text-2xl shadow">▶</span>
                </div>
                <div className="absolute top-2 left-2 bg-[#0E7C3A] text-white text-xs px-2 py-1 rounded-full font-bold">70% HERO • {showcaseId.slice(0,9)} • {title} • {topic}</div>
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">🎬 {title} — {topic} • credit 6000 • 70% HERO ▶</div>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <button onClick={()=>setHero('eid')} className={`border rounded-xl p-3 bg-white hover:bg-[#F0FDF4] text-left ${hero==='eid'?'border-[#0E7C3A] ring-1 ring-[#0E7C3A]': 'border-[#0E7C3A]/20'}`}>
            <div className="font-bold text-sm">🌙 ঈদ অফার</div><span className="text-xs text-zinc-500">Click to play Eid video</span>
            <video src={`/showcase/${showcaseId}.mp4`} className="mt-2 w-full h-20 object-cover rounded-lg border" muted loop playsInline />
          </button>
          <button onClick={()=>setHero('boishakh')} className={`border rounded-xl p-3 bg-white hover:bg-[#F0FDF4] text-left ${hero==='boishakh'?'border-[#0E7C3A] ring-1 ring-[#0E7C3A]': 'border-[#0E7C3A]/20'}`}>
            <div className="font-bold text-sm">🌸 পহেলা বৈশাখ</div><span className="text-xs text-zinc-500">Pohela Boishakh template</span>
            <video src={`/showcase/${showcaseId}.mp4`} className="mt-2 w-full h-20 object-cover rounded-lg border" muted loop playsInline />
          </button>
          <button onClick={()=>setHero('sale')} className={`border rounded-xl p-3 bg-white hover:bg-[#F0FDF4] text-left ${hero==='sale'?'border-[#0E7C3A] ring-1 ring-[#0E7C3A]': 'border-[#0E7C3A]/20'}`}>
            <div className="font-bold text-sm">🛍 11.11 Sale</div><span className="text-xs text-zinc-500">11.11 Sale template</span>
            <video src={`/showcase/${showcaseId}.mp4`} className="mt-2 w-full h-20 object-cover rounded-lg border" muted loop playsInline />
          </button>
        </div>
      </div>
    </section>
  )
}
