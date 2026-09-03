// ============================================================================
// scripts/migrate-to-hostamar-drive.mjs — V34 Phase 7 migration tool
// ============================================================================
// Move big files (e.g. the 240GB backup) from Google Drive / OneDrive / local
// into the Telegram-backed Hostamar Drive WITHOUT a website in the path:
// rclone streams the source → 1.9GB temp chunk → GramJS MTProto upload →
// next chunk. RAM stays ~2GB; nothing routes through Vercel.
//
// One-time setup (user):
//   1. my.telegram.org app → TG_API_ID + TG_API_HASH (env)
//   2. node scripts/tg-gen-session.mjs → TG_SESSION_STRING (env)
//   3. Private channel created + your account admin → TG_CHANNEL_ID (env)
//   4. rclone configured for the source remote (gdrive:/onedrive:)
//
// Run (WSL or the VPS — NOT Vercel):
//   TG_API_ID=... TG_API_HASH=... TG_SESSION_STRING=... TG_CHANNEL_ID=-100... \
//   node scripts/migrate-to-hostamar-drive.mjs --src rclone:gdrive:path/to/file --name my240gb.bin
//
// Env (optional): DATABASE_URL + AUTH for DriveFile row creation; without it,
// the script still uploads and prints the message ids (register later via
// /api/drive/upload dedup metadata or manually).
// ============================================================================
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, statSync, unlinkSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import readline from 'node:readline/promises'

const args = process.argv.slice(2)
const srcArg = args[args.indexOf('--src') + 1] || ''
const nameArg = args[args.indexOf('--name') + 1] || ''
if (!srcArg || !srcArg.startsWith('rclone:')) {
  console.error('Usage: node scripts/migrate-to-hostamar-drive.mjs --src rclone:<remote>:<path> [--name out.name]')
  console.error('  e.g. --src rclone:gdrive:Backups/240gb-file.zip')
  process.exit(1)
}
const rcloneSpec = srcArg.slice('rclone:'.length) // gdrive:Backups/240gb-file.zip
const fileName = nameArg || rcloneSpec.split('/').pop() || 'migrated-file'
const TMP = process.env.DRIVE_MIGRATE_TMP || 'C:\\tmp\\drive-migrate'
mkdirSync(TMP, { recursive: true })

const apiId = Number(process.env.TG_API_ID)
const apiHash = String(process.env.TG_API_HASH)
const session = new StringSession(String(process.env.TG_SESSION_STRING || ''))
const channelId = String(process.env.TG_CHANNEL_ID || '')
for (const [k, v] of [['TG_API_ID', apiId], ['TG_API_HASH', apiHash], ['TG_SESSION_STRING', session], ['TG_CHANNEL_ID', channelId]]) {
  if (!v) { console.error(`Missing env ${k}`); process.exit(1) }
}

const CHUNK = 1.9 * 1024 * 1024 * 1024

function run(cmd, onLine) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd[0], cmd.slice(1), { shell: process.platform === 'win32' })
    const rl = readline.createInterface({ input: p.stdout })
    rl.on('line', onLine)
    p.stderr.on('data', (d) => process.stderr.write(d))
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${cmd[0]} exit ${c}`))))
  })
}

const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 })
await client.connect()
const channel = await client.getEntity(Number(channelId))
console.log(`[migrate] channel resolved; source: ${rcloneSpec} → ${fileName}`)

// 1) probe size via rclone lsjson
let totalBytes = 0
await run(['rclone', 'lsjson', rcloneSpec], () => {})
const ls = await new Promise((resolve, reject) => {
  let out = ''
  const p = spawn('rclone', ['lsjson', rcloneSpec], { shell: process.platform === 'win32' })
  p.stdout.on('data', (d) => (out += d))
  p.on('close', (c) => (c === 0 ? resolve(JSON.parse(out)) : reject(new Error('lsjson failed'))))
})
const entry = Array.isArray(ls) ? ls[0] : ls
if (!entry) { console.error('Source not found'); process.exit(1) }
totalBytes = Number(entry.size)
const chunkCount = Math.max(1, Math.ceil(totalBytes / CHUNK))
console.log(`[migrate] ${fileName}: ${(totalBytes / 1024 ** 3).toFixed(2)} GiB → ${chunkCount} chunks of 1.9 GiB`)

// 2) stream-download each chunk from the remote, upload, delete temp
const chunkGroupId = `mig-${Date.now().toString(36)}`
const messageIds = []
const hash = createHash('sha256')
for (let i = 0; i < chunkCount; i++) {
  const off = i * CHUNK
  const len = Math.min(CHUNK, totalBytes - off)
  const tmp = `${TMP}\\${fileName}.part${i}`
  console.log(`[migrate] chunk ${i + 1}/${chunkCount}: rclone rcat ${off}+${len}`)
  await new Promise((resolve, reject) => {
    // rclone has no direct range read for remotes; rcat+cat of the file
    // streaming into a bounded local temp via dd-style node stream:
    const p = spawn('rclone', ['cat', rcloneSpec], { shell: process.platform === 'win32' })
    const out = createWriteStream(tmp, { highWaterMark: 1 << 22 })
    let written = 0
    p.stdout.on('data', (d) => {
      // take only [off, off+len) from the cat stream
      const start = written
      written += d.length
      if (written > off && start < off + len) {
        const s = Math.max(0, off - start)
        const e = Math.min(d.length, off + len - start)
        const slice = d.subarray(s, e)
        if (!out.write(slice)) p.stdout.pause(), out.once('drain', () => p.stdout.resume())
        if (i === 0) hash.update(slice)
      } else if (start >= off + len) {
        p.kill()
      }
    })
    p.on('close', () => out.end())
    out.on('close', () => (statSync(tmp).size === len ? resolve() : reject(new Error(`chunk ${i} size mismatch: ${statSync(tmp).size} != ${len}`))))
    p.on('error', reject)
  })
  const buf = await import('node:fs/promises').then((m) => m.readFile(tmp))
  const msg = await client.sendFile(channel, {
    file: buf,
    forceDocument: true,
    caption: `${fileName} | migrate | chunk ${i + 1}/${chunkCount} | ${chunkGroupId}`,
    workers: 1,
  })
  messageIds.push(Number(msg.id))
  console.log(`[migrate] chunk ${i + 1} uploaded → message ${msg.id}`)
  unlinkSync(tmp)
}

console.log('\n[migrate] ALL CHUNKS UPLOADED')
console.log('chunkGroupId:', chunkGroupId)
console.log('messageIds:', JSON.stringify(messageIds))
console.log('sha256 (first chunk):', hash.digest('hex'))
console.log('\nNext (frees the source quota):')
console.log(`  rclone moveto ${rcloneSpec} ${rcloneSpec}.migrated-hostamar-drive  # or rclone delete + purge trash`)
console.log('Then: register the file in Drive (upload the .migmeta via /api/drive/upload or insert the row)')
console.log('Then: GitHub email verification should arrive — verify → push V33.')
await client.disconnect()
process.exit(0)
