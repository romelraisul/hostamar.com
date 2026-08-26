export const dynamic='force-dynamic'
import { NextResponse } from 'next/server'
export async function POST(req: Request){
  try{
    const { ref } = await req.json()
    const code = String(ref||'').toUpperCase().slice(0,10)
    const res = NextResponse.json({ok:true})
    if(code) res.cookies.set('affiliate_ref', code, { path:'/', maxAge: 60*60*24*30, sameSite:'lax' })
    return res
  }catch{ return NextResponse.json({ok:true})}
}
