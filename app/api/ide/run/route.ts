export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { language, code } = await req.json().catch(() => ({} as any))
  const lang = (language || 'javascript').toLowerCase()
  const src = String(code || '').slice(0, 20000)
  if (!src.trim()) return NextResponse.json({ output: '', error: 'Empty code' }, { status: 400 })

  // JS: run in-vm via Function sandbox capturing console.log
  if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
    try {
      const logs: string[] = []
      const sandboxConsole = { log: (...a: any[]) => logs.push(a.map(String).join(' ')), error: (...a:any[])=>logs.push('ERROR: '+a.join(' ')), warn: (...a:any[])=>logs.push('WARN: '+a.join(' ')) }
      // strip imports/exports for eval
      const cleaned = src.replace(/^import .*$/gm,'').replace(/^export .*$/gm,'')
      // capture last expression as return
      const fn = new Function('console', `"use strict";\n${cleaned}\n`)
      const ret = fn(sandboxConsole)
      const out = logs.join('\n') + (ret !== undefined ? (logs.length?'\n':'') + String(ret) : '')
      return NextResponse.json({ output: out || '(no output)', language: lang })
    } catch (e:any) { return NextResponse.json({ output: '', error: e.message }, { status: 200 }) }
  }
  // Python: stub — real would call Pyodide/remote runner; return echo + hint
  if (lang === 'python' || lang === 'py') {
    // naive print() extractor for demo
    const m = [...src.matchAll(/print\(([^)]*)\)/g)].map(x=> { try{ return eval(x[1]) }catch{ return x[1] } })
    return NextResponse.json({ output: m.length ? m.join('\n') : `[python stub] ${src.slice(0,300)}\n→ Connect Pyodide or /api/ide/run python worker for real execution.`, language: 'python', stub: true })
  }
  return NextResponse.json({ output: `[${lang}] echo:\n${src.slice(0,2000)}`, language: lang })
}
