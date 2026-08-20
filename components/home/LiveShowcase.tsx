'use client'
import { useEffect, useState } from 'react'

type V = { id:string; title:string; topic:string; createdAt:string }

export default function LiveShowcase(){
  const [videos, setVideos] = useState<V[]>([])
  useEffect(()=>{
    fetch('/api/showcase?limit=6').then(r=>r.json()).then(j=>{
      if(Array.isArray(j) && j.length) setVideos(j.slice(0,6))
      else setVideos([{ id:'guest-demo1', title:'ঈদ অফার ৫০% ছাড়', topic:'y78 Bengali Shop', createdAt: new Date().toISOString() }])
    }).catch(()=> setVideos([{ id:'guest-demo1', title:'ঈদ অফার ৫০% ছাড়', topic:'y78', createdAt: new Date().toISOString() }]))
  }, [])
  return (
    <section className="py-12 bg-[#F0FDF4] border-y border-[#0E7C3A]/10">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-5">
        <h2 className="text-2xl font-bold text-[#0E7C3A]">লাইভে তৈরি হচ্ছে — 10k+ ভিডিও ✅</h2>
        <p className="text-sm text-zinc-600 mt-1">এইমাত্র কাস্টমাররা বানালো — আপনিও বানান 30 সেকেন্ডে</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {videos.map(v=>(
            <a key={v.id} href={`/showcase/${v.id}`} className="group rounded-xl overflow-hidden border border-[#0E7C3A]/20 bg-white hover:shadow-lg block">
              <div className="w-full h-40 bg-gradient-to-br from-[#0E7C3A]/20 to-[#0E7C3A]/5 grid place-items-center text-3xl">🎬</div>
              <div className="p-3">
                <p className="font-semibold text-[#0E7C3A] truncate">{v.title || v.topic}</p>
                <p className="text-xs text-zinc-500 truncate">{v.topic} • {new Date(v.createdAt).toLocaleDateString('bn-BD')}</p>
              </div>
            </a>
          ))}
        </div>
        <a href="/dev" className="mt-6 inline-block bg-[#0E7C3A] hover:bg-[#0A5A2B] text-white px-6 py-2 rounded-lg text-sm font-bold">আপনার ভিডিও বানান — 100 ক্রেডিট</a>
      </div>
    </section>
  )
}
