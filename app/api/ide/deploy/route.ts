export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const WORKSPACE_ROOT = path.join(process.cwd(), 'tmp', 'ide-workspace')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const mode = (body as any).mode || 'tarball'

    if (!existsSync(WORKSPACE_ROOT)) {
      await fs.mkdir(WORKSPACE_ROOT, { recursive: true })
    }

    if (mode === 'tarball') {
      const { execSync } = await import('child_process')
      const tarballName = `ide-workspace-${Date.now()}.tar.gz`
      const tarballPath = path.join(WORKSPACE_ROOT, '..', tarballName)

      try {
        execSync(`tar -czf "${tarballPath}" -C "${WORKSPACE_ROOT}" .`, {
          stdio: 'pipe',
          cwd: process.cwd(),
        })
      } catch (e) {
        return NextResponse.json(
          { error: 'Failed to create tarball', detail: 'tar command not available' },
          { status: 500 }
        )
      }

      const data = await fs.readFile(tarballPath)
      await fs.unlink(tarballPath)

      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename=${tarballName}`,
          'X-Deploy-Mode': 'tarball',
        },
      })
    }

    if (mode === 'docker') {
      const dockerCompose = `version: '3.8'
services:
  ide:
    image: node:20-alpine
    working_dir: /app
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
    volumes:
      - ./workspace:/app
    command: sh -c "npm install && npm run build && npm start"
`

      await fs.mkdir(WORKSPACE_ROOT, { recursive: true })
      await fs.writeFile(path.join(WORKSPACE_ROOT, 'docker-compose.yml'), dockerCompose)

      const files = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true })
      const manifest = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          type: f.isDirectory() ? 'directory' : 'file',
        }))
      )

      return NextResponse.json({
        mode: 'docker',
        message: 'Docker compose manifest generated. Mount onto your Docker host to deploy.',
        manifest,
        dockerCompose,
        nextSteps: [
          '1. Copy the workspace folder to your server',
          '2. Run docker compose up -d',
          '3. The app will be available at http://<host>:3000',
        ],
      })
    }

    return NextResponse.json({ error: 'Invalid mode. Use tarball or docker.' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Deploy failed', detail: (e as Error).message }, { status: 500 })
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    modes: ['tarball', 'docker'],
    description: 'POST with { mode: "tarball" } for gzip download or { mode: "docker" } for compose manifest.',
  })
}