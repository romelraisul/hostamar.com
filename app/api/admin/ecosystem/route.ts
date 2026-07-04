import { NextRequest, NextResponse } from 'next/server'

function envOn(name: string) {
  const value = (process.env[name] || '').trim()
  return value !== '' && value.toLowerCase() !== 'false' && value !== '0'
}

async function failoverState() {
  const log = '/home/romel/hostamar-build/logs/failover.log'
  const state = '/home/romel/hostamar-build/.failover-state'

  const crontab = await fetchCrontab()
  const currentTarget = await readState(state)
  const localOnline = await pingOllama()

  const modules = [
    {
      id: 'hostamar-platform',
      name: 'Hostamar Platform',
      description: 'Cloud hosting + AI marketing videos with local-first cron-controlled DNS.',
      href: '/',
      status: 'active',
      icon: 'hosting',
    },
    {
      id: 'ossu-academy',
      name: 'OSSU Academy',
      description: 'Bengali CS curriculum, learning dashboard, and project submissions.',
      href: '/ossu',
      status: 'beta',
      icon: 'academy',
    },
    {
      id: 'lucky-star',
      name: 'LuckyStar Game',
      description: 'Social gaming interface with jackpot slots and multiplayer-ready UX.',
      href: '/game',
      status: 'active',
      icon: 'game',
    },
    {
      id: 'ai-browser',
      name: 'AI Browser',
      description: 'Local AI browser stack with search, screenshots, and summarization.',
      href: '/ai-browser',
      status: 'beta',
      icon: 'browser',
    },
  ]

  return NextResponse.json({
    status: {
      local: localOnline,
      vercel: currentTarget.includes('vercel') ? 'down' : 'active',
      railway: 'active',
      ollama: localOnline ? 'active' : 'down',
    },
    modules,
    automation: {
      failover: crontab,
      cron: crontab,
      bidirectionalSync: envOn('NEON_BIDIRECTIONAL_SYNC'),
      neonConnected: envOn('DATABASE_URL') && ((process.env.DATABASE_URL || '').includes('neon')),
    },
  })
}

async function fetchCrontab() {
  try {
    const crontab = await new Promise<string>((resolve, reject) => {
      require('child_process').exec('crontab -l 2>/dev/null || true', { encoding: 'utf8' }, (error: any, stdout: string) => {
        if (error) reject(error)
        else resolve(stdout)
      })
    })
    return crontab.includes('hostamar-failover.sh')
  } catch {
    return false
  }
}

function readState(statePath: string) {
  try {
    return require('fs').readFileSync(statePath, 'utf8').trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function pingOllama() {
  try {
    const ollamaRes = await fetch(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    })
    return ollamaRes.ok
  } catch {
    return false
  }
}

export async function GET() {
  try {
    return failoverState()
  } catch (error) {
    console.error('Admin ecosystem error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
