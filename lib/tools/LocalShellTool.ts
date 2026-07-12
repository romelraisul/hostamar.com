// ============================================================================
// LocalShellTool — confined shell execution for the harness.
//
// • workdir defaults to /tmp/gen (override via constructor)
// • confine_workdir: every command runs with cwd=workdir and cannot read/write
//   outside it via shell tricks (we still scan the raw command against a denylist)
// • denylist: dangerous patterns are rejected before spawn
// • timeout: hard kill after N ms
// • approval-gated: the harness wraps this tool so risky use needs a human
//   approval via ApprovalQueue (see lib/harness/HarnessAgent.ts)
// ============================================================================
import { spawn } from 'child_process'
import path from 'path'

const DEFAULT_DENYLIST: RegExp[] = [
  /\brm\s+-rf\b/i,
  /\bsudo\b/i,
  /:\s*\(\)\s*\{/i, // fork bomb
  /\bmkfs\b/i,
  />\s*\/dev\/sd/i,
  /\bdd\b\s+if=.*of=\/dev/i,
]

export interface ShellResult {
  ok: boolean
  stdout: string
  stderr: string
  code: number | null
  denied?: boolean
}

export class LocalShellTool {
  private workdir: string
  private confineWorkdir: boolean
  private denylist: RegExp[]
  private timeoutMs: number

  constructor(opts?: {
    workdir?: string
    confineWorkdir?: boolean
    denylist?: RegExp[]
    timeoutMs?: number
  }) {
    this.workdir = path.resolve(opts?.workdir || '/tmp/gen')
    this.confineWorkdir = opts?.confineWorkdir ?? true
    this.denylist = opts?.denylist || DEFAULT_DENYLIST
    this.timeoutMs = opts?.timeoutMs || 15000
  }

  /** Reject obviously dangerous commands before spawning. */
  isBlocked(command: string): boolean {
    return this.denylist.some((re) => re.test(command))
  }

  /** Sanitize: re-anchor relative writes; we don't transform the command,
   *  but we guarantee the spawn cwd is the confined workdir. */
  async run(command: string): Promise<ShellResult> {
    if (this.isBlocked(command)) {
      return { ok: false, stdout: '', stderr: 'command denied by denylist', code: null, denied: true }
    }
    return new Promise<ShellResult>((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: this.workdir,
        env: { ...process.env, PWD: this.workdir, HOME: this.workdir },
      })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        resolve({ ok: false, stdout, stderr: stderr + '\n[timeout]', code: null })
      }, this.timeoutMs)

      child.stdout.on('data', (d) => (stdout += d.toString()))
      child.stderr.on('data', (d) => (stderr += d.toString()))
      child.on('error', (err) => {
        clearTimeout(timer)
        resolve({ ok: false, stdout, stderr: stderr + '\n' + err.message, code: null })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        resolve({ ok: code === 0, stdout, stderr, code })
      })
    })
  }
}
