interface Tool {
  name: string
  purpose: string
  github: string
  configPaths: string[]
  category: 'ide' | 'browser' | 'research'
  envVars: { key: string; example: string; description: string }[]
  install: string[]
  notes: string
}

const KILO = {
  baseUrl: 'https://api.kilo.ai/api/gateway',
  apiKeyExample: 'KILOCODE_API_KEY',
  model: 'grok/grok-4-fast',
}

const TOOLS: Tool[] = [
  {
    name: 'Cline',
    purpose:
      'Autonomous AI coding agent inside VS Code. Reads/writes files, runs shell, opens a browser to test your app.',
    github: 'https://github.com/cline/cline',
    configPaths: [
      '~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/Code\.json',
    ],
    category: 'ide',
    envVars: [
      {
        key: 'OPENAI_BASE_URL',
        example: KILO.baseUrl,
        description: 'OpenAI-compatible chat-completion base URL',
      },
      { key: 'OPENAI_API_KEY', example: KILO.apiKeyExample, description: 'Bearer for that endpoint' },
      { key: 'OPENAI_MODEL_ID', example: KILO.model, description: 'Model ID' },
    ],
    install: [
      '# VS Code marketplace (Cline)',
      'code --install-extension saoudrizwan.claude-code    # exact name varies',
      '',
      '# Or download latest .vsix from',
      'curl -L https://github.com/cline/cline/releases/latest/download/cline.vsix -o /tmp/cline.vsix',
      'code --install-extension /tmp/cline.vsix',
      '',
      '# Provide LLM provider',
      'export OPENAI_BASE_URL=' + KILO.baseUrl,
      'export OPENAI_API_KEY=$KILOCODE_API_KEY   # OpenAI-compat Bearer',
      'export OPENAI_MODEL_ID=' + KILO.model,
    ],
    notes:
      'Cline is the actual Claude Code-style VS Code assistant. Configure your provider once in VS Code UI: Settings → Extensions → Cline → API Provider = OpenAI Compatible. Cline needs a separate sandbox or the auto-write safety net enabled.',
  },
  {
    name: 'Vane',
    purpose:
      'Lightweight browser automation framework — C#-style WPF MVVM / Tk .Use: Replace headless Selenium work with declarative scripting.',
    github: 'https://github.com/ItzCrazyKns/Vane',
    configPaths: ['(config is in vane-core runtime, no install on WSL)'],
    category: 'browser',
    envVars: [],
    install: [
      '# Vane is a .NET-hosted browser UI library — typically run alongside a web app on windows',
      '# Underlying lib targets headless Chromium via the .NET Runtime',
      '# If you actually want a browser automation driver, install Playwright:',
      'pip install playwright',
      'playwright install chromium',
    ],
    notes:
      '⚠️ Vane appears to be a Windows-targeted UI library, not a typical Python/Node automation tool. If you want a remote/headless automation tool that’s the same flavor, the active picks are Playwright or Browser-Use. For our stack we’re using local Chrome via a NoVNC tunnel.',
  },
  {
    name: 'GPT Researcher',
    purpose:
      'Autonomous research agent that scrapes, summarizes, and cites sources for a topic.',
    github: 'https://github.com/assafelovic/gpt-researcher',
    configPaths: ['gpt-researcher/.env  (llms.yaml for multi-provider config)'],
    category: 'research',
    envVars: [
      { key: 'OPENAI_BASE_URL', example: KILO.baseUrl, description: 'Custom provider endpoint' },
      { key: 'OPENAI_API_KEY', example: KILO.apiKeyExample, description: 'Bearer' },
      { key: 'OPENAI_MODEL_NAME', example: KILO.model, description: 'Model' },
      { key: 'TAVILY_API_KEY', example: 'tvly-…', description: 'Web-search backend (free tier)' },
    ],
    install: [
      'git clone https://github.com/assafelovic/gpt-researcher.git',
      'cd gpt-researcher',
      'pip install -r requirements.txt',
      'cp .env.example .env && nano .env    # fill OPENAI_* with Kilo values',
      'export LLM_PROVIDER=openai',
      'export LLM_MODEL=' + KILO.model,
      'export LLM_OPENAI_API_KEY=$KILOCODE_API_KEY',
      'python -m gpt_researcher.main --query "the state of AR glasses 2026"',
    ],
    notes:
      'Use LLM_PROVIDER=openai + LLM_BASE_URL set to https://api.kilo.ai/api/gateway. The repo has a multi-provider config file. Disable the Bing SERP dependency when using Tavily alone.',
  },
]

const CATEGORY_LABEL: Record<Tool['category'], string> = {
  ide: 'IDE',
  browser: 'Browser',
  research: 'Research',
}

export const dynamic = 'force-dynamic'

export default function DevToolsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-slate-100">
      

      <section className="mb-12 rounded-lg border border-fuchsia-700/40 bg-fuchsia-900/10 p-6">
        <h2 className="text-xl font-semibold text-fuchsia-300 mb-3">
          Shared provider
        </h2>
        <p className="text-slate-300 text-sm mb-4">
          Every tool in this list reads its LLM endpoint from the same two
          environment variables — <code className="font-mono">OPENAI_BASE_URL</code>{' '}
          and <code className="font-mono">OPENAI_API_KEY</code>.
        </p>
        <pre className="rounded bg-slate-950/80 p-4 text-xs overflow-x-auto">
{`# Local Ollama (free)
export OPENAI_BASE_URL="http://hostamar-ollama:11434/v1"
export OPENAI_API_KEY="ollama"
export OPENAI_MODEL_NAME="hermes3:latest"

# Kilo gateway (our primary)
export OPENAI_BASE_URL="https://api.kilo.ai/api/gateway"
export OPENAI_API_KEY="$KILOCODE_API_KEY"
export OPENAI_MODEL_NAME="grok/grok-4-fast"

# Google Gemini (fallback)
export OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
export OPENAI_API_KEY="$GOOGLE_CLOUD_API_KEY"
export OPENAI_MODEL_NAME="gemini-2.0-flash"`}
        </pre>
      </section>

      <section className="space-y-8">
        {TOOLS.map((t) => (
          <article
            key={t.name}
            className="rounded-lg border border-slate-700 bg-slate-900/50 p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-2xl font-semibold">{t.name}</h2>
              <span className="text-xs uppercase tracking-wider text-slate-400 border border-slate-600 rounded-full px-2.5 py-1">
                {CATEGORY_LABEL[t.category]}
              </span>
            </div>
            <p className="text-slate-300 text-sm mb-4">{t.purpose}</p>
            <a
              href={t.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-sky-300 hover:text-sky-200 break-all"
            >
              {t.github}
            </a>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">
                Install & configure
              </summary>
              <pre className="mt-3 rounded bg-slate-950/80 p-4 text-xs overflow-x-auto">
{t.install.join('\n')}
              </pre>
            </details>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">
                Environment variables
              </summary>
              <table className="mt-3 w-full text-xs">
                <tbody>
                  {t.envVars.map((row) => (
                    <tr key={row.key} className="border-t border-slate-800">
                      <td className="py-2 pr-4 font-mono text-sky-300 align-top">
                        {row.key}
                      </td>
                      <td className="py-2 pr-4 align-top text-slate-400">
                        {row.description}
                      </td>
                      <td className="py-2 align-top">
                        <code className="font-mono text-fuchsia-300 break-all">
                          {row.example}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <div className="mt-4 rounded border border-amber-700/40 bg-amber-900/10 p-3 text-xs text-amber-200">
              {t.notes}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-12 rounded-lg border border-slate-700 bg-slate-900/30 p-6">
        <h2 className="text-xl font-semibold mb-3">Reinstall anywhere</h2>
        <p className="text-slate-300 text-sm mb-3">
          A <code className="font-mono text-sky-300">SETUP.md</code> in
          <code className="font-mono ml-2">/home/romel/dev-tools/</code>
          walks through this stack from scratch — it’s the canonical restore
          plan for any new machine.
        </p>
      </section>
    </main>
  )
}
