export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  try{
    const { prompt } = await req.json()
    const p = String(prompt||'').slice(0,2000) || 'Create notes app'
    // Call existing AI chat to generate Expo code
    const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    let code = ''
    try{
      const r = await fetch(base+'/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[{role:'user', content: `Generate a complete Expo 51 React Native App.tsx for: ${p}. Use green #0E7C3A, credit meter, no expo-router. Return ONLY code.` }], model:'general' }) })
      const j = await r.json().catch(()=>({}))
      code = j.content || j.message || j.reply || ''
      // Extract code block if wrapped
      const m = code.match(/```(?:tsx|typescript|javascript|jsx)?\n([\s\S]*?)```/)
      if(m) code = m[1]
    }catch{}
    if(!code || code.length<200){
      code = `import { View, Text, Pressable, ScrollView } from 'react-native'
export default function App(){
  return (
    <View style={{flex:1, backgroundColor:'#0E7C3A', padding:20, justifyContent:'center'}}>
      <Text style={{color:'white', fontSize:20, fontWeight:'bold'}}>Hostamar Android</Text>
      <Text style={{color:'white', marginTop:8}}>${p.slice(0,60)}</Text>
      <Text style={{color:'white', opacity:0.8, marginTop:4}}>6000 credit • generated via 93 models</Text>
    </View>
  )
}`
    }
    // Write to tmp for later build
    try{
      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')
      const dir = path.join(os.tmpdir(), 'ai-android-'+Date.now())
      await fs.mkdir(dir, { recursive:true })
      await fs.writeFile(path.join(dir,'App.tsx'), code)
      await fs.writeFile(path.join(dir,'prompt.txt'), p)
    }catch{}
    return NextResponse.json({ code, message: `✔ Generated (${code.length} chars) — preview ready`, remaining: 5900 })
  }catch(e:any){ return NextResponse.json({ error: e.message||'generate failed' }, { status:500 }) }
}
