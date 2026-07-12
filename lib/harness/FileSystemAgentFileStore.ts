// ============================================================================
// FileSystemAgentFileStore — confined file access for the harness.
//
// All paths are re-anchored under a safe root (default process.cwd()/working).
// The agent can NEVER escape the root: any path containing ".." or an absolute
// path outside the root is rejected. Tools exposed:
//   file_access_list_files
//   file_access_read_file
//   file_access_save_file   (approval-gated by the harness)
//   file_access_search_files
//   file_access_delete_file (approval-gated by the harness)
// ============================================================================
import { promises as fs } from 'fs'
import path from 'path'

export class FileSystemAgentFileStore {
  private root: string

  constructor(root?: string) {
    this.root = path.resolve(root || path.join(process.cwd(), 'working'))
  }

  get safeRoot(): string {
    return this.root
  }

  /** Resolve + confine a user-supplied path. Throws if it escapes the root. */
  private resolve(p: string): string {
    const cleaned = p.replace(/\\/g, '/').replace(/^\/+/, '')
    const abs = path.resolve(this.root, cleaned)
    const rel = path.relative(this.root, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Path escapes safe root: ${p}`)
    }
    return abs
  }

  private relativeDisplay(abs: string): string {
    return '/' + path.relative(this.root, abs).replace(/\\/g, '/')
  }

  async listFiles(dir = '.'): Promise<{ path: string; isDir: boolean; size: number }[]> {
    const abs = this.resolve(dir)
    let ents: import('fs').Dirent[]
    try {
      ents = await fs.readdir(abs, { withFileTypes: true })
    } catch {
      return []
    }
    const out: { path: string; isDir: boolean; size: number }[] = []
    for (const e of ents) {
      const full = path.join(abs, e.name)
      let size = 0
      try {
        const st = await fs.stat(full)
        size = st.size
      } catch {
        /* ignore */
      }
      out.push({ path: this.relativeDisplay(full), isDir: e.isDirectory(), size })
    }
    return out
  }

  async readFile(p: string): Promise<string> {
    const abs = this.resolve(p)
    return fs.readFile(abs, 'utf8')
  }

  async saveFile(p: string, content: string): Promise<{ path: string }> {
    const abs = this.resolve(p)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content, 'utf8')
    return { path: this.relativeDisplay(abs) }
  }

  async deleteFile(p: string): Promise<{ path: string }> {
    const abs = this.resolve(p)
    await fs.rm(abs, { force: true })
    return { path: this.relativeDisplay(abs) }
  }

  async searchFiles(pattern: string, dir = '.'): Promise<string[]> {
    const abs = this.resolve(dir)
    const rx = new RegExp(pattern, 'i')
    const matches: string[] = []
    async function walk(d: string) {
      let ents: import('fs').Dirent[]
      try {
        ents = await fs.readdir(d, { withFileTypes: true })
      } catch {
        return
      }
      for (const e of ents) {
        const full = path.join(d, e.name)
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name.startsWith('.')) continue
          await walk(full)
        } else if (rx.test(e.name) || rx.test(e.name)) {
          matches.push('/' + path.relative(abs, full).replace(/\\/g, '/'))
        }
      }
    }
    await walk(abs)
    return matches.slice(0, 200)
  }
}
