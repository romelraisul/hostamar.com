import { getActiveDB, executeWithFailover, getDBHealth } from '@/lib/db-failover'

export interface SyncResult {
  table: string
  sourceDb: string
  targetDb: string
  rowsSynced: number
  errors: string[]
}

export async function syncTable(
  table: string,
  sourceDb: string,
  targetDb: string,
  primaryKey = 'id',
  updatedAtColumn = 'updatedAt'
): Promise<SyncResult> {
  const result: SyncResult = {
    table,
    sourceDb,
    targetDb,
    rowsSynced: 0,
    errors: [],
  }

  try {
    // Get latest updated_at from target
    const targetLatest = await executeWithFailover(async (client) => {
      if (sourceDb === 'turso' || targetDb === 'turso') {
        const res = await client.execute({
          sql: `SELECT MAX("${updatedAtColumn}") as max_updated FROM "${table}"`,
          args: [],
        })
        return res.rows[0]?.max_updated || null
      } else {
        const res = await client.query(`SELECT MAX("${updatedAtColumn}") as max_updated FROM "${table}"`)
        return res.rows[0]?.max_updated || null
      }
    })

    const since = targetLatest || '1970-01-01T00:00:00Z'

    // Fetch newer rows from source
    const sourceRowsResult = await executeWithFailover(async (client) => {
      if (sourceDb === 'turso') {
        const res = await client.execute({
          sql: `SELECT * FROM "${table}" WHERE "${updatedAtColumn}" > ? ORDER BY "${updatedAtColumn}" ASC`,
          args: [since],
        })
        return res.rows
      } else {
        const res = await client.query(`SELECT * FROM "${table}" WHERE "${updatedAtColumn}" > $1 ORDER BY "${updatedAtColumn}" ASC`, [since])
        return res.rows
      }
    })

    const sourceRows = sourceRowsResult?.result || []

    if (!sourceRows || sourceRows.length === 0) {
      return result
    }

    // Upsert into target
    for (const row of sourceRows) {
      try {
        await executeWithFailover(async (client) => {
          const columns = Object.keys(row)
          const values = Object.values(row)
          const placeholders = values.map((_, i) => sourceDb === 'turso' || targetDb === 'turso' ? '?' : `$${i + 1}`).join(', ')
          const updateCols = columns.filter(c => c !== primaryKey).map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')

          if (sourceDb === 'turso' || targetDb === 'turso') {
            await client.execute({
              sql: `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT("${primaryKey}") DO UPDATE SET ${updateCols}`,
              args: values,
            })
          } else {
            await client.query(
              `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT("${primaryKey}") DO UPDATE SET ${updateCols}`,
              values
            )
          }
        })
        result.rowsSynced++
      } catch (e) {
        result.errors.push(`Row ${row[primaryKey]}: ${e}`)
      }
    }
  } catch (e) {
    result.errors.push(String(e))
  }

  return result
}

export async function runFullSync(): Promise<{
  results: SyncResult[]
  summary: { totalSynced: number; totalErrors: number; duration: number }
}> {
  const start = Date.now()
  const tables = [
    'Customer',
    'Video',
    'HostingOrder',
    'ChatSession',
    'BrowserSession',
    'GameSession',
    'IDEProject',
    'CreditTransaction',
  ]

  const health = await getDBHealth()
  const primaryDb = health.active
  const secondaryDbs = ['turso', 'neon', 'supabase', 'local'].filter(
    (db) => db !== primaryDb && health[db as keyof typeof health] === 'connected'
  )

  const results: SyncResult[] = []

  for (const table of tables) {
    for (const targetDb of secondaryDbs) {
      const result = await syncTable(table, primaryDb, targetDb)
      results.push(result)
    }
  }

  const totalSynced = results.reduce((sum, r) => sum + r.rowsSynced, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  return {
    results,
    summary: {
      totalSynced,
      totalErrors,
      duration: Date.now() - start,
    },
  }
}

export async function writeToAllDBs<T>(
  table: string,
  data: Record<string, any>,
  primaryKey = 'id'
): Promise<{ success: boolean; errors: string[] }> {
  const health = await getDBHealth()
  const connectedDbs = ['turso', 'neon', 'supabase', 'local'].filter(
    (db) => health[db as keyof typeof health] === 'connected'
  )

  const errors: string[] = []

  await Promise.allSettled(
    connectedDbs.map(async (dbType) => {
      try {
        await executeWithFailover(async (client) => {
          const columns = Object.keys(data)
          const values = Object.values(data)
          const placeholders = values.map((_, i) => dbType === 'turso' ? '?' : `$${i + 1}`).join(', ')

          if (dbType === 'turso') {
            await client.execute({
              sql: `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
              args: values,
            })
          } else {
            await client.query(
              `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
              values
            )
          }
        })
      } catch (e) {
        errors.push(`${dbType}: ${e}`)
      }
    })
  )

  return { success: errors.length === 0, errors }
}