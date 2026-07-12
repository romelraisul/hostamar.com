// ============================================================================
// CodeActProvider — safe code execution sandbox for the harness.
//
// Code is NEVER executed in the main process. It runs in a forked child
// process with a timeout. JavaScript is executed inside Node's `vm` module
// (no access to require/process by default); Python runs via `python3`.
//
// Why a child process instead of `isolated-vm`? `isolated-vm` needs a native
// node-gyp build that is unreliable inside slim containers and would risk the
// green build. A forked process gives strong isolation (separate V8 isolate +
// memory) without native deps. To upgrade to `isolated-vm`, swap the executor
// in `runJS` for an Isolate context — the public API stays identical.
// ============================================================================
import { fork } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Next's standalone build hard-codes the SOURCE path of this file into
// `import.meta.url`, so `path.dirname(import.meta.url)` resolves to the dev
// location (e.g. /app/lib/tools) which does not exist at runtime. Resolve the
// worker by checking several candidate locations instead.
const candidates = [
  // 1. dev / non-standalone: relative to this file's bundled location
  (() => {
    try {
      return path.join(path.dirname(fileURLToPath(import.meta.url)), 'codeact-worker.js')
    } catch {
      return ''
    }
  })(),
  // 2. standalone runtime: process.cwd() is /app/.next/standalone
  path.join(process.cwd(), 'lib/tools/codeact-worker.js'),
  path.join(process.cwd(), '.next/standalone/lib/tools/codeact-worker.js'),
  // 3. absolute fallbacks
  '/app/.next/standalone/lib/tools/codeact-worker.js',
  '/app/lib/tools/codeact-worker.js',
  path.join(process.cwd(), 'codeact-worker.js'),
].filter(Boolean) as string[]

const WORKER_PATH =
  candidates.find((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  }) || candidates[0]

// eslint-disable-next-line no-console
console.log('[CodeAct] worker candidates checked:', candidates, 'selected:', WORKER_PATH, 'exists:', fs.existsSync(WORKER_PATH))

export interface CodeActResult {
  ok: boolean
  output: unknown
  error?: string
  language: 'js' | 'python'
}

export class CodeActProvider {
  private timeoutMs: number

  constructor(timeoutMs = 15000) {
    this.timeoutMs = timeoutMs
  }

  async run(code: string, language: 'js' | 'python' = 'js'): Promise<CodeActResult> {
    if (language === 'python') return this.runPython(code)
    return this.runJS(code)
  }

  private runJS(code: string): Promise<CodeActResult> {
    return new Promise((resolve) => {
      const worker = WORKER_PATH
      const child = fork(worker, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, NODE_OPTIONS: '' },
      })
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        resolve({ ok: false, output: null, error: 'timeout', language: 'js' })
      }, this.timeoutMs)

      let stderr = ''
      if (child.stderr) {
        child.stderr.on('data', (d) => (stderr += d.toString()))
      }
      child.on('message', (msg: { ok: boolean; output?: unknown; error?: string }) => {
        clearTimeout(timer)
        resolve({ ok: msg.ok, output: msg.output ?? null, error: msg.error, language: 'js' })
      })
      child.on('error', (err) => {
        clearTimeout(timer)
        resolve({ ok: false, output: null, error: err.message, language: 'js' })
      })
      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timer)
          resolve({ ok: false, output: null, error: stderr || `exit ${code}`, language: 'js' })
        }
      })
      child.send({ code })
    })
  }

  private runPython(code: string): Promise<CodeActResult> {
    return new Promise((resolve) => {
      const { spawn } = require('child_process')
      const child = spawn('python3', ['-c', code], { cwd: '/tmp/gen' })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        resolve({ ok: false, output: null, error: 'timeout', language: 'python' })
      }, this.timeoutMs)
      child.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
      child.on('error', (err) => {
        clearTimeout(timer)
        resolve({ ok: false, output: null, error: err.message, language: 'python' })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        let parsed: unknown = stdout.trim()
        try {
          parsed = JSON.parse(stdout.trim())
        } catch {
          /* keep raw string */
        }
        resolve({ ok: code === 0, output: parsed, error: code === 0 ? undefined : stderr, language: 'python' })
      })
    })
  }
}
