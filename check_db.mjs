import { createClient } from '@libsql/client'
const client = createClient({
  url: 'libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3OTMwNTU3MjIsImlkIjoiNzI0ODU2NTMtZmE2YS00MTE1LTg0ZGQtZTJkZTI0YzYzOTFmIn0.Gk_Z5ZQ6WaQ0zDI2Y4YfQfHcNq9eDzgPgHGr6q-hHhEy0y_Fk7fLvs1xVxkQQQX_Pwjk_WgDNU3KRdLbvy41Aw'
})
const res1 = await client.execute('SELECT COUNT(*) as c FROM TvVideoSeo')
console.log('TvVideoSeo total:', res1.rows[0].c)
const res2 = await client.execute('SELECT COUNT(*) as c FROM FreeVideoSource')
console.log('FreeVideoSource total:', res2.rows[0].c)
const res3 = await client.execute('SELECT COUNT(*) as c FROM FreeVideoSource WHERE status="ready"')
console.log('FreeVideoSource ready:', res3.rows[0].c)
const res4 = await client.execute('SELECT slug, "videoSourceId" FROM TvVideoSeo LIMIT 10')
for (const r of res4.rows) console.log(r)
await client.close()
