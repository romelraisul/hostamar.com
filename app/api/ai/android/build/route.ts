export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest){
  try{
    const { code } = await req.json()
    const src = String(code||'').slice(0,30000)
    if(!src) return NextResponse.json({ error:'No code' }, { status:400 })
    // Stub build — real would run expo prebuild + gradle in container
    // Return download link to existing placeholder + instruction for real build
    const apkUrl = 'https://github.com/romelraisul/hostamar.com/releases/download/v0.1.3/Hostamar-Node.apk'
    return NextResponse.json({
      apkUrl,
      message: 'Build stub — real: cd /tmp/ai-android-{id} && npx expo prebuild && ./android/gradlew :app:assembleRelease (needs Android SDK). Placeholder APK returned.',
      remaining: 5900
    })
  }catch(e:any){ return NextResponse.json({ error: e.message }, { status:500 }) }
}
