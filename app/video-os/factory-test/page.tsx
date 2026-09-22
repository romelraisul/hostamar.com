'use client'
import { useState } from 'react'
export default function FactoryTest(){
  const [log, setLog] = useState('Ready - WSL ~/ComfyUI/models - Bogura TV Factory 10 Min - Qwen + MiniMax + Laya + Old')
  async function test(){
    setLog('Bogura TV Factory Test:\n')
    const tests=[
      {type:'qwen-logo', name:'Qwen 2.1 RGBA Logo'},
      {type:'minimax-ref2video', name:'MiniMax H3 B-roll'},
      {type:'laya', name:'Laya Jev Free Alt'}
    ]
    for(const t of tests){
      setLog(p=>p+`\n→ ${t.name}... `)
      try{
        const r=await fetch('/api/video-os/comfyui',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:t.type, prompt:t.name})})
        const d=await r.json()
        setLog(p=>p+`✅ ${JSON.stringify(d).slice(0,300)}`)
      }catch(e:any){ setLog(p=>p+`❌ ${e.message}`) }
    }
    setLog(p=>p+'\n✅ Complete - WSL ONLY - No cloud')
  }
  return (<div className="p-6 max-w-4xl mx-auto">
    <h1 className="text-2xl font-bold">Bogura TV Factory Test - Qwen + MiniMax + Laya + Old</h1>
    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 my-3 text-sm">
      GF না, Laya! Mahan Jafari promotes Laya — Jev open-source free alt Apache 2.0 33ms 1GB RAM 7x faster
    </div>
    <button onClick={test} className="bg-black text-white px-4 py-2 rounded">Run Test</button>
    <pre className="mt-4 border rounded p-3 text-xs whitespace-pre-wrap">{log}</pre>
  </div>)
}
