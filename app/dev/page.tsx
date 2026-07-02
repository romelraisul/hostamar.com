'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { editor } from 'monaco-editor'

type FileItem = {
  name: string
  path: string
  type: 'file' | 'directory'
}

type OpenFile = {
  path: string
  name: string
  content: string
  language: string
}

const DEFAULT_FILES: FileItem[] = [
  { name: 'src', path: 'src', type: 'directory' },
  { name: 'index.js', path: 'index.js', type: 'file' },
  { name: 'package.json', path: 'package.json', type: 'file' },
]

const CONTENT_MAP: Record<string, string> = {
  'index.js': `import express from 'express';
import { config } from 'dotenv';

config();
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hello Hostamar Dev IDE' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
  'package.json': JSON.stringify(
    {
      name: 'hostamar-ide-app',
      version: '1.0.0',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js',
      },
      dependencies: {
        express: '^4.18.2',
        dotenv: '^16.3.1',
      },
    },
    null,
    2
  ),
}

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascriptreact',
    tsx: 'typescriptreact',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    py: 'python',
    sh: 'shell',
    bash: 'shell',
    txt: 'plaintext',
  }
  return map[ext || ''] || 'plaintext'
}

export default function DevPage() {
  const [files, setFiles] = useState<FileItem[]>(DEFAULT_FILES)
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [terminalText, setTerminalText] = useState(
    'Welcome to Hostamar Dev IDE v1.0\n$ _'
  )
  const [terminalInput, setTerminalInput] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const monacoRef = useRef<any>(null)

  const ensureMonaco = useCallback(async () => {
    if (monacoRef.current) return monacoRef.current
    const mod = await import('monaco-editor')
    monacoRef.current = mod
    return mod
  }, [])

  const loadFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/dev/files?path=${encodeURIComponent(filePath)}`)
      if (res.ok) {
        const data = (await res.json()) as any
        if (data.error) {
          setStatus(String(data.error))
          return
        }
        const file = (data?.files || []).find((f: any) => f.path === filePath)
        if (file && file.type === 'file') {
          openEditor(filePath, file.name, '', file.name)
          return
        }
        // If it is already a file, open it directly
        openEditor(filePath, filePath.split('/').pop() || filePath, '', filePath.split('/').pop() || filePath)
        return
      }
    } catch {
      // fallback
    }

    const existing = openFiles.find((f) => f.path === filePath)
    if (existing) {
      setActivePath(existing.path)
      return
    }

    const name = filePath.split('/').pop() || filePath
    const content = CONTENT_MAP[filePath] || `// ${name}\n`
    openEditor(filePath, name, content, name)
  }

  const openEditor = (filePath: string, name: string, content: string, displayName: string) => {
    setOpenFiles((prev) => {
      const exists = prev.find((f) => f.path === filePath)
      if (exists) {
        setActivePath(filePath)
        return prev
      }
      const next = [...prev, { path: filePath, name: displayName || name, content, language: getLanguage(name) }]
      setActivePath(filePath)
      return next
    })
  }

  const closeFile = (filePath: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== filePath))
    setActivePath((prev) => {
      if (prev !== filePath) return prev
      const remaining = openFiles.filter((f) => f.path !== filePath)
      return remaining.length > 0 ? remaining[remaining.length - 1].path : null
    })
  }

  const runInit = useCallback(async () => {
    await ensureMonaco()
    if (!containerRef.current) return

    const monaco = monacoRef.current
    const instance = monaco.editor.create(containerRef.current, {
      value: '// Select or create a file to start coding.',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      wordWrap: 'on',
      padding: { top: 12 },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      overviewRulerLanes: 0,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    })

    editorRef.current = instance

    instance.onDidChangeModelContent(async () => {
      const value = instance.getValue()
      const model = instance.getModel()
      const path = model?.uri?.toString() || activePath || ''
      if (!path) return
      try {
        await fetch('/api/dev/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', path, content: value }),
        })
      } catch {
        // ignore save errors
      }
    })
  }, [activePath, ensureMonaco])

  const switchEditorFile = useCallback(
    async (file: OpenFile) => {
      if (!editorRef.current) return
      const monaco = await ensureMonaco()
      const uri = monaco.Uri.parse(file.path)
      let model = monaco.editor.getModel(uri)
      if (!model) {
        model = monaco.editor.createModel(file.content, file.language, uri)
      } else {
        model.setValue(file.content)
      }
      editorRef.current.setModel(model)
      setActivePath(file.path)
    },
    [ensureMonaco]
  )

  useEffect(() => {
    if (activePath && openFiles.length > 0) {
      const file = openFiles.find((f) => f.path === activePath)
      if (file) {
        switchEditorFile(file).catch(() => null)
      }
    }
  }, [activePath, openFiles, switchEditorFile])

  useEffect(() => {
    runInit()
    return () => {
      try {
        editorRef.current?.dispose()
      } catch {
        // ignore
      }
      editorRef.current = null
    }
  }, [runInit])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalText])

  const createFile = async () => {
    const name = prompt('File name (e.g., app.js)')
    if (!name) return
    const filename = name.trim().split('/').pop() || 'untitled.txt'
    const currentDir = activePath ? activePath.split('/').slice(0, -1).join('/') : ''

    try {
      const body: any = { action: 'createFile', name: filename, parent: currentDir || '' }
      await fetch('/api/dev/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setStatus(`Created ${filename}`)
      // Add to explorer in memory
      setFiles((prev) => [...prev, { name: filename, path: currentDir ? `${currentDir}/${filename}` : filename, type: 'file' }])
    } catch {
      setStatus('Failed to create file')
    }
  }

  const createDirectory = async () => {
    const name = prompt('Directory name')
    if (!name) return
    const dir = name.trim().split('/').pop() || 'untitled'
    const currentDir = activePath ? activePath.split('/').slice(0, -1).join('/') : ''

    try {
      await fetch('/api/dev/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createDirectory', name: dir, parent: currentDir || '' }),
      })
      setFiles((prev) => [...prev, { name: dir, path: currentDir ? `${currentDir}/${dir}` : dir, type: 'directory' }])
    } catch {
      // ignore
    }
  }

  const deploy = async () => {
    setStatus('Deploying...')
    try {
      const res = await fetch('/api/ide/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'tarball' }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hostamar-deploy-${Date.now()}.tar.gz`
        a.click()
        URL.revokeObjectURL(url)
        setStatus('Deployment package downloaded.')
      } else {
        const data = await res.json().catch(() => ({}))
        setStatus((data as any).error || 'Deploy failed')
      }
    } catch {
      setStatus('Deploy error')
    }
  }

  const handleTerminalKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const cmd = terminalInput.trim()
    setTerminalInput('')
    if (!cmd) return

    let response = ''
    switch (cmd) {
      case 'help':
        response =
          'help    - show this help\n' +
          'ls      - list todos\n' +
          'clear   - clear terminal\n' +
          'deploy  - download deploy package\n' +
          'echo    - echo input\n'
        break
      case 'ls':
        response =
          openFiles.map((f) => f.path).join('\t') ||
          `${files.filter((f) => f.type === 'file').map((f) => f.name).join('  ') || '(empty)'}\n`
        break
      case 'clear':
        setTerminalText('Hostamar Dev IDE Terminal\n$ _')
        return
      case 'deploy':
        await deploy()
        return
      default:
        if (cmd.startsWith('echo ')) {
          response = cmd.slice(5) + '\n'
        } else {
          response = `Command not found: ${cmd}\nType help for available commands.\n`
        }
    }

    setTerminalText((prev) => prev + `\n$ ${cmd}\n${response}`)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Hostamar Dev IDE
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
            <span className="rounded bg-gray-800 px-2 py-1 border border-gray-700">node:20</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={deploy}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
          >
            Deploy
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={
            `flex flex-col border-r border-gray-800 bg-gray-900 transition-all ${sidebarOpen ? 'w-56' : 'w-0 md:w-56 overflow-hidden opacity-0 md:opacity-100'}`
          }
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Explorer</span>
            <div className="flex gap-1">
              <button onClick={createFile} className="text-[11px] text-gray-400 hover:text-white transition">+ File</button>
              <button onClick={createDirectory} className="text-[11px] text-gray-400 hover:text-white transition">+ Dir</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2 text-sm">
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-gray-300 hover:bg-white/5">
              <span className="text-gray-500">⌄</span>
              <span className="text-gray-400">project</span>
            </button>
            <div className="mt-1">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => loadFile(f.path)}
                  className={`flex w-full items-center gap-2 px-6 py-1 text-left hover:bg-white/5 ${
                    activePath === f.path ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  <span className="text-xs">{f.type === 'directory' ? '📁' : '📄'}</span>
                  <span className="text-xs truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col min-w-0">
          <div className="flex border-b border-gray-800 bg-gray-900">
            <div className="flex items-center gap-2 px-2">
              <button onClick={() => setSidebarOpen((v) => !v)} className="text-gray-400 hover:text-white text-xs px-2 py-1">
                {sidebarOpen ? '‹' : '›'}
              </button>
            </div>
            {openFiles.length === 0 ? (
              <div className="flex items-center px-3 text-xs text-gray-500">
                No files open - select a file from explorer
              </div>
            ) : (
              <div className="flex items-center gap-0">
                {openFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setActivePath(file.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs border-r border-gray-800 transition ${
                      activePath === file.path ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>📄</span>
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        closeFile(file.path)
                      }}
                      className="ml-2 text-gray-500 hover:text-white"
                    >
                      ✕
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={containerRef} className="flex-1 min-h-0" />
          <div className="flex border-t border-gray-800 bg-gray-900">
            <button
              onClick={() => setTerminalOpen((v) => !v)}
              className="px-3 py-1 text-xs text-gray-400 hover:text-white border-r border-gray-800"
            >
              {terminalOpen ? '▼ TERMINAL' : '▶ TERMINAL'}
            </button>
            {status && (
              <div className="px-3 py-1 text-xs text-emerald-400 truncate">
                {status}
              </div>
            )}
          </div>
          {terminalOpen && (
            <div className="h-48 border-t border-gray-800 bg-black flex flex-col">
              <div
                ref={terminalRef}
                className="flex-1 overflow-y-auto font-mono text-xs leading-normal p-3 text-gray-200 whitespace-pre-wrap"
              >
                {terminalText}
              </div>
              <div className="flex items-center border-t border-gray-800 px-3 py-2 bg-gray-900">
                <span className="text-xs text-emerald-400 mr-2 font-mono">$</span>
                <input
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalKey}
                  className="flex-1 bg-transparent text-xs text-gray-200 outline-none font-mono"
                  placeholder="Type a command..."
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
