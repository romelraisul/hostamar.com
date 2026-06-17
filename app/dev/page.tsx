'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  ArrowLeft, Play, Terminal, Code2, Folder, File, 
  ChevronRight, Trash2, Download, Upload, Settings,
  Zap, Moon, Sun, Copy, Check, Globe, AlertCircle,
  X, ExternalLink
} from 'lucide-react';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { 
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-900 text-gray-500">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        Loading Editor...
      </div>
    </div>
  )
});

const defaultCode = `# Welcome to Hostamar Dev IDE! 🧑‍💻
# Write Python code and click "Run" to execute it.

def fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Calculate first 10 Fibonacci numbers
print("Fibonacci Sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")

# Example: Calculate factorial
def factorial(n):
    if n == 0 or n == 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

print("\\nFactorials:")
for i in range(8):
    print(f"{i}! = {factorial(i)}")
`;

const languages = [
  { id: 'python', name: 'Python', extension: '.py', monaco: 'python' },
  { id: 'javascript', name: 'JavaScript', extension: '.js', monaco: 'javascript' },
  { id: 'typescript', name: 'TypeScript', extension: '.ts', monaco: 'typescript' },
  { id: 'html', name: 'HTML', extension: '.html', monaco: 'html' },
  { id: 'css', name: 'CSS', extension: '.css', monaco: 'css' },
];

interface FileTab {
  id: string;
  name: string;
  language: string;
  code: string;
  modified: boolean;
}

function DevPage() {
  const [files, setFiles] = useState<FileTab[]>([
    { id: 'main', name: 'main.py', language: 'python', code: defaultCode, modified: false }
  ]);
  const [activeFileId, setActiveFileId] = useState('main');
  const [output, setOutput] = useState<string[]>(['Welcome to Hostamar Dev IDE!', 'Python interpreter ready.']);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const pyodideRef = useRef<unknown>(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const language = languages.find(l => l.id === activeFile.language) || languages[0];

  // Initialize Pyodide
  const loadPyodide = useCallback(async () => {
    if (pyodideRef.current || pyodideLoading) return;
    
    setPyodideLoading(true);
    setOutput(prev => [...prev, 'Loading Python interpreter...']);
    
    try {
      // Load Pyodide from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      script.async = true;
      
      script.onload = async () => {
        try {
          // @ts-expect-error - Pyodide loaded globally
          const pyodide = await window.loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
          });
          pyodideRef.current = pyodide;
          setPyodideReady(true);
          setOutput(prev => [...prev, '✓ Python interpreter ready!', '']);
        } catch (err) {
          setOutput(prev => [...prev, `Error initializing Python: ${err}`]);
        }
      };
      
      script.onerror = () => {
        setOutput(prev => [...prev, 'Failed to load Python interpreter']);
      };
      
      document.head.appendChild(script);
    } catch (err) {
      setOutput(prev => [...prev, `Error: ${err}`]);
    } finally {
      setPyodideLoading(false);
    }
  }, [pyodideLoading]);

  // Auto-load Pyodide on mount
  useEffect(() => {
    loadPyodide();
  }, [loadPyodide]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const runCode = async () => {
    if (!pyodideRef.current) {
      setOutput(prev => [...prev, 'Python not ready. Loading...']);
      loadPyodide();
      return;
    }

    setIsRunning(true);
    setOutput(prev => [...prev, `> Running ${activeFile.name}...`, '']);

    try {
      // @ts-expect-error - Pyodide loaded globally
      const pyodide = pyodideRef.current;
      
      // Capture stdout
      await pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);

      // Run the code
      try {
        await pyodide.runPython(activeFile.code);
      } catch (execErr) {
        // @ts-expect-error - Pyodide error
        const errorMsg = execErr.message || String(execErr);
        setOutput(prev => [...prev, `Error: ${errorMsg}`]);
        setIsRunning(false);
        return;
      }

      // Get stdout
      const stdout = await pyodide.runPython(`sys.stdout.getvalue()`);
      const stderr = await pyodide.runPython(`sys.stderr.getvalue()`);

      // Reset stdout/stderr
      await pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = __stderr__
      `);

      if (stdout) {
        setOutput(prev => [...prev, ...stdout.trim().split('\n'), '']);
      }
      if (stderr) {
        setOutput(prev => [...prev, `stderr: ${stderr}`]);
      }

      setOutput(prev => [...prev, '✓ Execution complete.']);
    } catch (err) {
      setOutput(prev => [...prev, `Error: ${err}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const updateFileCode = (fileId: string, newCode: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, code: newCode, modified: true } : f
    ));
  };

  const createNewFile = () => {
    const id = `file-${Date.now()}`;
    const newFile: FileTab = {
      id,
      name: `untitled-${files.length + 1}.py`,
      language: 'python',
      code: '# New file\n',
      modified: false
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(id);
  };

  const closeFile = (fileId: string) => {
    if (files.length === 1) return; // Keep at least one file
    const index = files.findIndex(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      const newIndex = Math.min(index, files.length - 2);
      setActiveFileId(files[newIndex === index ? newIndex - 1 : newIndex]?.id || files[0].id);
    }
  };

  const deleteAllOutput = () => setOutput([]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorMount = (editor: unknown, monaco: unknown) => {
    // Configure Monaco
    monaco.editor.defineTheme('hostamar-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e293b',
        'editorLineNumber.foreground': '#64748b',
        'editorCursor.foreground': '#22d3ee',
        'editor.selectionBackground': '#22d3ee40',
      }
    });
    
    monaco.editor.defineTheme('hostamar-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#f8fafc',
        'editor.foreground': '#1e293b',
      }
    });

    monaco.editor.setTheme(theme === 'dark' ? 'hostamar-dark' : 'hostamar-light');
  };

  useEffect(() => {
    // Update Monaco theme when theme changes
    const monaco = (window as Record<string, unknown>).monaco;
    if (monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'hostamar-dark' : 'hostamar-light');
    }
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            Dev IDE
          </div>
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
            Python + Pyodide
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeployModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-medium text-sm transition flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Deploy
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={createNewFile}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="New file"
          >
            <File className="w-4 h-4" />
          </button>
          <button
            onClick={loadPyodide}
            disabled={pyodideLoading || pyodideReady}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              pyodideReady 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            }`}
          >
            {pyodideLoading ? 'Loading...' : pyodideReady ? '✓ Python Ready' : '○ Load Python'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runCode}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded-lg font-medium text-sm transition flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-gray-900 border-r border-white/10 flex flex-col">
          <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Folder className="w-4 h-4" /> Files
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm mb-1 ${
                  file.id === activeFileId 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:bg-white/5'
                }`}
                onClick={() => setActiveFileId(file.id)}
              >
                <File className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{file.name}</span>
                {file.modified && <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />}
                {files.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor + Output */}
        <div className="flex-1 flex flex-col">
          {/* Editor */}
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language={language.monaco}
              value={activeFile.code}
              onChange={(value) => updateFileCode(activeFileId, value || '')}
              onMount={handleEditorMount}
              theme={theme === 'dark' ? 'hostamar-dark' : 'hostamar-light'}
              options={{
                fontSize: 14,
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                padding: { top: 16 },
              }}
            />
          </div>

          {/* Output Panel */}
          <div className="h-64 bg-gray-900 border-t border-white/10 flex flex-col">
            {/* Output Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Output</span>
                {isRunning && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={copyOutput}
                  className="p-1.5 hover:bg-white/10 rounded transition"
                  title="Copy output"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={deleteAllOutput}
                  className="p-1.5 hover:bg-white/10 rounded transition"
                  title="Clear output"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Output Content */}
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-sm"
            >
              {output.map((line, i) => (
                <div
                  key={i}
                  className={`${
                    line.startsWith('>') ? 'text-cyan-400' :
                    line.startsWith('✓') ? 'text-green-400' :
                    line.startsWith('Error') ? 'text-red-400' :
                    'text-gray-300'
                  }`}
                >
                  {line}
                </div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-3 h-3 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full animate-spin" />
                  Running...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-900 border-t border-white/10 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Python 3.11 (Pyodide)</span>
          <span>{pyodideReady ? '✓ Interpreter ready' : '○ Interpreter loading...'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{language.name}</span>
          <span>Ln 1, Col 1</span>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings className="w-5 h-5" /> Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <button
                  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                  className="px-3 py-1 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
                >
                  {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Font Size</span>
                <span className="text-gray-400 text-sm">14px</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 mb-2">Coming soon:</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Multi-language support</li>
                  <li>• GitHub integration</li>
                  <li>• One-click deploy</li>
                  <li>• AI code completion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-cyan-400" /> Deploy
              </h2>
              <button onClick={() => setShowDeployModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Coming Soon!</h3>
              <p className="text-gray-400 mb-6">
                One-click deployment will be available in Phase 5. Deploy your Python apps directly to the cloud.
              </p>
              <div className="bg-white/5 rounded-lg p-4 text-left mb-6">
                <p className="text-xs text-gray-500 mb-2">Planned features:</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Instant deployment to cloud</li>
                  <li>• Custom domains</li>
                  <li>• Automatic HTTPS</li>
                  <li>• Usage analytics</li>
                </ul>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DevPage;
