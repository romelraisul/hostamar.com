import { createClient } from '@libsql/client'
const c = createClient({ url: process.env.DBURI })
const id = process.argv[2] || 'cmui1gra'
;(async () => {
  const r = await c.execute({
    sql: "SELECT id, videoId, status, attempts, error, substr(description,1,1200) AS d, substr(prompt,1,300) AS p, language FROM VideoQueue WHERE videoId=?",
    args: [id],
  })
  console.log(JSON.stringify(r.rows, null, 1))
})().catch((e) => { console.error(e.message); process.exit(1) })
