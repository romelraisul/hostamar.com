import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request){
  try{
    const body = (await request.json().catch(() => ({}))) as { language?: string; code?: string }
    const language = (body.language || 'typescript').toLowerCase()
    const code = typeof body.code === 'string' ? body.code : ''
    if (!code.trim()) return NextResponse.json({ error: 'Empty code' }, { status: 400 })
    if (language === 'javascript' || language === 'typescript'){
      const evalScript = `
        const outputs=[];
        const orig={warn:console.warn, error:console.error, log:console.log};
        console.warn=(...a)=>{outputs.push(a.map(String).join(' '));};
        console.error=(...a)=>{outputs.push(a.map(String).join(' '));};
        console.log=(...a)=>{outputs.push(a.map(String).join(' '));};
        let result=undefined;
        try{
          const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
          const fn=new AsyncFunction(code);
          result=await fn();
        }catch(err){
          outputs.push((err instanceof Error?err.message:String(err)));
        }
        return {outputs, result};
      `
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
      const fn = new AsyncFunction(evalScript)
      const { outputs, result } = await (fn as any)()
      const out = [...outputs, result !== undefined ? String(result) : ''].filter(Boolean).join('\n')
      return NextResponse.json({ language, output: out || 'No output' })
    }
    if (language === 'python'){
      const lines = ['print("Hello from Python runner")', 'print("Input code length:", ' + code.length + ')', ...code.split('\n').filter(Boolean).slice(0,20)]
      return NextResponse.json({ language, output: lines.join('\n') })
    }
    if (language === 'bash'){
      const lines = ['#!/bin/bash', 'set -e', 'echo "[demo-shell] running", ' + code.split('\n').filter(Boolean).slice(0,20).join('; ')]
      return NextResponse.json({ language, output: lines.join('\n') })
    }
    return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 })
  }catch(err){
    return NextResponse.json({ error: 'Run failed', details: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}

export async function GET(){ return NextResponse.json({ error: 'POST only' }, { status: 405 }) }
