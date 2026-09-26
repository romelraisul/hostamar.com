import { NextResponse } from 'next/server'
import { FREESTACK_REPOS } from '@/lib/freestack'
export const dynamic='force-dynamic'
export async function GET(){
  return NextResponse.json({ source:'Hyperautomation Labs - 10 repos so good they shouldnt be free - FREESTACK', count:10, repos:FREESTACK_REPOS, brand:'hostamar.com' }, { headers:{'Access-Control-Allow-Origin':'*'}})
}

