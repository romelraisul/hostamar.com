// ============================================================================
// lib/telegram/upload.ts — send bytes into the private storage channel
// ============================================================================
// Telegram caps ONE message at 2GB free / 4GB Premium; bigger inputs must be
// chunked by the caller (see chunk.ts). Returns the message id — that id IS
// the durable storage pointer (MTProto file refs never expire).
import { getTelegramClient, ensureChannel, withFloodRetry } from './client'

export interface UploadResult {
  messageId: number
  fileId: string
}

/**
 * Upload a buffer/document to TG_CHANNEL_ID as a document (no media
 * transcoding). Caption carries searchable metadata.
 */
export async function uploadFileToChannel(
  buffer: Buffer | Uint8Array,
  fileName: string,
  caption: string,
): Promise<UploadResult> {
  const client = await getTelegramClient()
  const channel = await ensureChannel()

  const msg = await withFloodRetry(() =>
    client.sendFile(channel, {
      file: buffer as any,
      forceDocument: true,
      caption: caption.slice(0, 900), // Telegram caption cap ~1024
      workers: 1,
    }),
  )

  const fileId = String((msg as any)?.document?.id ?? (msg as any)?.media?.document?.id ?? msg.id)
  return { messageId: Number(msg.id), fileId }
}

/** Map of messageId → fileId for a chunk batch (verification pass). */
export async function chunkUpload(
  parts: { buffer: Buffer; name: string }[],
  captionPrefix: string,
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  for (let i = 0; i < parts.length; i++) {
    const r = await uploadFileToChannel(
      parts[i].buffer,
      parts[i].name,
      `${captionPrefix} [chunk ${i + 1}/${parts.length}]`,
    )
    results.push(r)
  }
  return results
}

