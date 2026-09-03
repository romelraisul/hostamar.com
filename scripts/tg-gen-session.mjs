// One-time session generator for the V34 Hostamar Drive MTProto client.
// NEVER run this on the server — run locally, paste the output into env:
//   TG_API_ID=... TG_API_HASH=... node scripts/tg-gen-session.mjs
// Keep TG_SESSION_STRING as secret as DATABASE_URL (it IS the account).
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const apiId = Number(process.env.TG_API_ID)
const apiHash = String(process.env.TG_API_HASH)
if (!apiId || !apiHash) {
  console.error('Set TG_API_ID and TG_API_HASH (from my.telegram.org → API Development Tools).')
  process.exit(1)
}

const rl = readline.createInterface({ input, output })
const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 })

await client.start({
  phoneNumber: async () => (await rl.question('Phone (+8801xxxxxxxxx): ')).trim(),
  password: async () => (await rl.question('2FA password (blank if none): ')).trim(),
  phoneCode: async () => (await rl.question('Telegram login code: ')).trim(),
  onError: (e) => console.log('login error:', String(e).slice(0, 120)),
})

console.log('\nSESSION_STRING (copy to env TG_SESSION_STRING, keep SECRET):')
console.log(client.session.save())
console.log('\nNext: create/join a PRIVATE channel, then get its id (e.g. via the channel\'s @username or a forwarded message).')
console.log('Set TG_CHANNEL_ID to that id (starts with -100 for private channels).')
await client.disconnect()
rl.close()
process.exit(0)
