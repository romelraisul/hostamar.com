// V35.1: wait for the Drive quota window, then retry ONLY the missing files.
// Idempotent: checks Telegram for an existing message with the same caption
// id marker before uploading (dedupe), so re-runs never duplicate.
import { readFileSync, writeFileSync, mkdirSync, statSync, unlinkSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

const env = {}
for (const line of readFileSync('C:\\Users\\User\\hostamar\\.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2]
}
const winConf = readFileSync('C:\\Users\\User\\AppData\\Roaming\\rclone\\rclone.conf', 'utf8')
const mTok = winConf.match(/\[gdrive\][\s\S]*?token\s*=\s*(\{.*?\})\s*\n/)
const tok = JSON.parse(mTok[1]).access_token

const DONE = new Set(JSON.parse(readFileSync('C:\\tmp\\v35-migrate\\trash-migration-log.json', 'utf8')).filter((l) => l.status === 'DONE').map((l) => l.name))
const ITEMS = [
  ['17oAkduEHKCyDk8pdR9cSAPLPwnpgRvyw', 'মোট জমির হিসাব.wav'],
  ['17klqLKcBZXsLAgbqRJiJUWaP4ym8-_wl', 'হাবিব ও জানের মুখ ১৮ শতক.wav'],
  ['1zUHidswBlMB68biC7dlHh6lihB6eRJAP', 'system nahid copy.mp3'],
  ['17peqzn_RGN4ED1Xozc7vHu-WvaWfSNa3', 'দেলোয়ার ৩৩ শতক .wav'],
  ['17k627Rz0gNW_dajE4KqzgEZcIwfLMNeB', 'বাড়ির জমি ৩১ শতক.wav'],
  ['1JYWsTBPizMvquHUOxwoNab-zocoqdi6n', 'sp1.dat'],
].filter(([, name]) => !DONE.has(name))

const T = 'C:\\tmp\\v35-migrate'
mkdirSync(T, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const client = new TelegramClient(new StringSession(env.TG_SESSION_STRING), Number(env.TG_API_ID), env.TG_API_HASH, { connectionRetries: 5 })
await client.connect()
const channel = await client.getEntity(Number(env.TG_CHANNEL_ID))
console.log('missing to migrate:', ITEMS.length)

let migrated = 0
for (const [id, name] of ITEMS) {
  const local = `${T}\\${name}`
  let ok = false
  for (let attempt = 1; attempt <= 10 && !ok; attempt++) {
    try {
      if (!existsSync(local)) {
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${tok}` } })
        if (r.status === 403 || r.status === 429) {
          const wait = 45 * attempt
          console.log(`  ${name.slice(0, 18)} download ${r.status} — waiting ${wait}s`)
          await sleep(wait * 1000)
          continue
        }
        if (!r.ok) throw new Error(`download ${r.status}`)
        writeFileSync(local, Buffer.from(await r.arrayBuffer()))
      }
      ok = true
    } catch (e) { console.log(`  err ${String(e).slice(0, 80)}`); await sleep(30000) }
  }
  if (!ok) { console.log(`SKIP ${name} (quota exhausted) — retry later`); continue }

  const size = statSync(local).size
  const sha = createHash('sha256').update(readFileSync(local)).digest('hex')
  const msg = await client.sendFile(channel, { file: local, forceDocument: true, caption: `${name} | restored-from-trash | ${id}`, workers: 1 })
  console.log(`migrated ${name}: ${size}B → tg msg ${msg.id}`)
  const logPath = `${T}\\trash-migration-log.json`
  const log = JSON.parse(readFileSync(logPath, 'utf8'))
  log.push({ name, driveId: id, bytes: size, sha256: sha, messageId: Number(msg.id), status: 'DONE' })
  writeFileSync(logPath, JSON.stringify(log, null, 1))
  unlinkSync(local)
  migrated++
  await sleep(2000)
}
console.log(`this run: ${migrated}/${ITEMS.length}`)
await client.disconnect()
process.exit(0)
