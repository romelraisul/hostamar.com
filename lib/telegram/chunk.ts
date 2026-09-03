// ============================================================================
// lib/telegram/chunk.ts — >2GB file handling
// ============================================================================
// Telegram message cap: 2GB free / 4GB Premium. Free-tier-safe chunk size
// 1.9GB keeps every part uploadable. Chunks are separate channel messages
// sharing a chunkGroupId in Neon; the download route joins them in order.
import { createHash } from 'crypto'

export const CHUNK_SIZE = 1.9 * 1024 * 1024 * 1024 // 1.9 GiB

export function needsChunking(size: number): boolean {
  return size > 2 * 1024 * 1024 * 1024 // treat 2GiB as the free-tier wall
}

export function chunkCountFor(size: number): number {
  return Math.max(1, Math.ceil(size / CHUNK_SIZE))
}

export function splitBufferIntoChunks(buffer: Buffer): Buffer[] {
  const parts: Buffer[] = []
  for (let off = 0; off < buffer.length; off += CHUNK_SIZE) {
    parts.push(buffer.subarray(off, Math.min(off + CHUNK_SIZE, buffer.length)))
  }
  return parts
}

/** Concat chunk buffers back (server RAM permitting — streams preferred). */
export function joinChunks(parts: Buffer[]): Buffer {
  return Buffer.concat(parts)
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}
