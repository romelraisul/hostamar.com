import { NextResponse } from 'next/server'
import { FREESTACK_REPOS } from '@/lib/freestack'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { repo } = await req.json()
  const found = FREESTACK_REPOS.find((r) => r.name === repo)
  if (!found) return NextResponse.json({ error: 'Repo not found' }, { status: 404 })
  // WSL ONLY deployment target — never /mnt/c (owner order).
  const deployPath = `/home/romel/hostamar-build/deployments/${found.name}`
  return NextResponse.json({
    repo: found.name,
    github: found.github,
    url: found.url,
    deployPath,
    status: 'queued',
    next: `git clone ${found.url} ${deployPath} && cd ${deployPath} && npm i || pip install -r requirements.txt`,
    preview: `/api/video-os/qwen-rgba?repo=${encodeURIComponent(found.name)} -> 1024x256 RGBA logo for Bogura TV lower third`,
  })
}

