// ============================================================================
// lib/telegram/download.ts — stream bytes back out of the storage channel
// ============================================================================
// Single message → client.downloadMedia with an in-memory sink for small
// files, or iterDownload (Range-aware, low RAM) for big ones. Chunk groups
// are re-joined by the API route, not here.
import { TelegramClient } from 'telegram'
import bigInt from 'big-integer' // callable default; gramJS expects its BigInteger type for iterDownload offset
import { getTelegramClient, ensureChannel, withFloodRetry } from './client'

/**
 * Download one message's document into a Buffer. Fine up to a few hundred MB
 * (serverless RAM); the >2GB path uses streamMessageToFile below.
 */
export async function downloadMessageBuffer(messageId: number): Promise<Buffer> {
  const client = await getTelegramClient()
  const channel = await ensureChannel()
  const [msg] = await withFloodRetry(() => client.getMessages(channel, { ids: [messageId] }))
  if (!msg || !msg.media) throw new Error(`Drive message ${messageId} not found or empty`)
  const buf = await client.downloadMedia(msg, { })
  if (!buf) throw new Error(`Drive message ${messageId} download failed`)
  return Buffer.from(buf)
}

/**
 * Get the raw message (for size/mime checks before streaming).
 */
export async function getDriveMessage(messageId: number) {
  const client = await getTelegramClient()
  const channel = await ensureChannel()
  const [msg] = await withFloodRetry(() => client.getMessages(channel, { ids: [messageId] }))
  return msg
}

/**
 * Range-stream a single message: yields byte offsets until done.
 * Used by /api/drive/file/[id] for Range (206) responses without full RAM.
 * offset/limit: when both are known (HTTP Range), pass them so MTProto
 * fetches ONLY those bytes — a bytes=0-99 probe on a 339MB file returns
 * in <1s instead of buffering the whole document first.
 */
export async function iterMessageBytes(
  messageId: number,
  onChunk: (chunk: Buffer, offsetBytes: number) => Promise<void> | void,
  opts: { offset?: number; limit?: number } = {},
): Promise<void> {
  const client: TelegramClient = await getTelegramClient()
  const channel = await ensureChannel()
  const [msg] = await withFloodRetry(() => client.getMessages(channel, { ids: [messageId] }))
  if (!msg || !msg.media) throw new Error(`Drive message ${messageId} not found or empty`)
  const reqSize = 512 * 1024
  // gramJS `limit` = CHUNK COUNT, not bytes (see downloads.js iterDownload).
  const chunkLimit =
    opts.limit != null ? Math.max(1, Math.ceil(opts.limit / reqSize)) : undefined
  const iter = client.iterDownload({
    file: msg.media as any,
    requestSize: reqSize,
    offset: bigInt(opts.offset ?? 0), // gramJS BigInteger — plain numbers crash .divide()
    limit: chunkLimit, // undefined = to EOF (gramJS treats as whole file)
    msgData: [channel as any, messageId],
  } as any) as AsyncIterable<Buffer>
  let offset = opts.offset ?? 0
  for await (const part of iter) {
    await onChunk(Buffer.from(part), offset)
    offset += part.length
  }
}

/**
 * Delete one message from the channel (used by DELETE /api/drive/file/[id]
 * and chunk-group cleanup).
 */
export async function deleteMessages(messageIds: number[]): Promise<void> {
  const client = await getTelegramClient()
  const channel = await ensureChannel()
  await withFloodRetry(() => client.deleteMessages(channel, messageIds, { revoke: true }))
}
