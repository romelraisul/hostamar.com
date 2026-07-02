'use client'
import { useState } from 'react'

export default function CodeEditor({language = 'typescript'}:{language?:string}){
  const [code, setCode] = useState(`// Sample ${language} code\nfunction hello(name: string){\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(hello('Romel'));\n`)
  const [output, setOutput] = useState('')

  async function run(){
    setOutput('Running in demo mode...')
    try{
      const res = await fetch('/api/ide/run', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({language, code})})
      const data = await res.json()
      setOutput(data.output || data.error || 'No output')
    }catch(err){
      setOutput('Run failed: '+(err instanceof Error?err.message:'unknown'))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <select value={language} onChange={e=>{}} className="border rounded px-2 py-1 text-sm">
            <option>typescript</option>
            <option>javascript</option>
            <option>python</option>
            <option>bash</option>
          </select>
          <button onClick={run} className="px-3 py-1 bg-black text-white rounded text-sm">Run</button>
        </div>
        <textarea
          value={code}
          onChange={e=>setCode(e.target.value)}
          className="w-full h-80 font-mono text-sm p-3 border rounded-xl bg-gray-900 text-green-200"
          spellCheck={false}
        />
      </div>
      <div className="border rounded-xl p-3 bg-white">
        <div className="text-xs font-semibold text-gray-600 mb-2">Output</div>
        <pre className="whitespace-pre-wrap text-sm">{output || 'Run code to see output.'}</pre>
      </div>
    </div>
  )
}
