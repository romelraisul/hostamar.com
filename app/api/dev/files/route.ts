import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const WORKSPACE_ROOT = path.join(process.cwd(), 'tmp', 'ide-workspace')

async function ensureRoot() {
  try {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true })
  } catch {
    // ignore
  }
}

function resolveUserPath(filePath: string) {
  const p = path.normalize(filePath).replace(/^(\.\.(\/)?)+/, '')
  return path.join(WORKSPACE_ROOT, p)
}

function sanitizeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*\0]/g, '').trim() || 'untitled'
}

export async function GET(request: NextRequest) {
  try {
    await ensureRoot()
    const { searchParams } = new URL(request.url)
    const p = searchParams.get('path') || ''

    const target = resolveUserPath(p)

    try {
      const stat = await fs.stat(target)
      if (!stat.isDirectory()) {
        return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
      }

      const entries = await fs.readdir(target, { withFileTypes: true })
      const files = await Promise.all(
        entries.map(async (entry) => {
          const full = path.join(target, entry.name)
          const stats = await fs.stat(full)
          return {
            name: entry.name,
            path: path.relative(WORKSPACE_ROOT, full),
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
          }
        })
      )

      return NextResponse.json({ files, path: p || '/' })
    } catch (e) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRoot()
    const body = await request.json()
    const { action, path: filePath, content, name, parent } = body

    if (action === 'createFile') {
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }
      const safeName = sanitizeFileName(name)
      const parentDir = resolveUserPath(parent || '')
      await fs.mkdir(parentDir, { recursive: true })
      const full = path.join(parentDir, safeName)
      await fs.writeFile(full, content || '', 'utf-8')
      return NextResponse.json({
        message: 'File created',
        file: { name: safeName, path: path.relative(WORKSPACE_ROOT, full), type: 'file' },
      })
    }

    if (action === 'createDirectory') {
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }
      const safeName = sanitizeFileName(name)
      const parentDir = resolveUserPath(parent || '')
      await fs.mkdir(path.join(parentDir, safeName), { recursive: true })
      return NextResponse.json({
        message: 'Directory created',
        file: { name: safeName, type: 'directory' },
      })
    }

    if (action === 'save') {
      if (!filePath) {
        return NextResponse.json({ error: 'Path is required' }, { status: 400 })
      }
      const full = resolveUserPath(filePath)
      await fs.writeFile(full, content || '', 'utf-8')
      return NextResponse.json({ message: 'Saved', path: filePath })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureRoot()
    const { searchParams } = new URL(request.url)
    const p = searchParams.get('path')

    if (!p) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }
    const full = resolveUserPath(p)
    try {
      await fs.rm(full, { recursive: true })
      return NextResponse.json({ message: 'Deleted', path: p })
    } catch (e) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
