'use client'

import { useState } from 'react'

export interface Scene {
  id: string
  title: string
  duration: number // seconds
  color: string
}

interface TimelineProps {
  scenes: Scene[]
  setScenes: (next: Scene[] | ((prev: Scene[]) => Scene[]) ) => void
}

/**
 * Native HTML5 drag-and-drop timeline (no @dnd-kit — keeps the bundle light
 * for the 61GB RAM studio box). Drag to reorder, drag the right edge to resize
 * (10px = 1s, clamped 2–30s). Split logic: halve the selected scene into
 * two new scenes.
 */
export default function Timeline({ scenes, setScenes }: TimelineProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const from = scenes.findIndex((s) => s.id === dragId)
    const to = scenes.findIndex((s) => s.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...scenes]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setScenes(next)
  }

  const onResize = (id: string, e: React.MouseEvent) => {
    setResizing(id)
    const startX = e.clientX
    const startDur = scenes.find((s) => s.id === id)!.duration
    const onMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startX) / 10 // 10px = 1s
      const newDur = Math.max(2, Math.min(30, Math.round(startDur + delta)))
      setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, duration: newDur } : s)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setResizing(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const split = (id: string) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const scene = prev[idx]
      const half = Math.max(2, Math.round(scene.duration / 2))
      const a: Scene = { ...scene, id: scene.id + '-a', duration: half }
      const b: Scene = { ...scene, id: scene.id + '-b', duration: scene.duration - half }
      const next = [...prev]
      next.splice(idx, 1, a, b)
      return next
    })
  }

  return (
    <div className="flex gap-2 overflow-x-auto p-4 bg-[#171A20] rounded-xl">
      {scenes.map((s) => (
        <div
          key={s.id}
          draggable
          onDragStart={() => setDragId(s.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(s.id)}
          onDoubleClick={() => split(s.id)}
          title="Double-click to split · drag right edge to resize"
          style={{ width: s.duration * 24, background: s.color }}
          className={`relative h-20 rounded-lg flex items-center justify-center text-white cursor-grab shrink-0 select-none ${
            resizing === s.id ? 'ring-2 ring-[#0E7C3A]' : ''
          }`}
        >
          <span className="text-sm px-2 text-center">
            {s.title} {s.duration}s
          </span>
          <div
            onMouseDown={(e) => onResize(s.id, e)}
            className="absolute right-0 top-0 w-2 h-full cursor-col-resize bg-white/20 hover:bg-white/40"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setScenes((prev) => [
            ...prev,
            {
              id: 'scene-' + (prev.length + 1) + '-' + Date.now(),
              title: 'New Scene',
              duration: 5,
              color: '#0E7C3A',
            },
          ])
        }
        className="h-20 w-24 shrink-0 rounded-lg border border-dashed border-white/20 text-white/60 text-sm hover:border-[#0E7C3A]"
      >
        + Scene
      </button>
    </div>
  )
}
