const { createClient } = require('@libsql/client')

async function test() {
  const jwt = "eyJhbG...HTDA"
  const url = `libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io?authToken=${jwt}`
  const cleanUrl = url.split('?')[0]
  const authToken = url.split('authToken=')[1] || ''
  
  console.log('Connecting to:', cleanUrl)
  
  const libsql = createClient({ url: cleanUrl, authToken })
  
  try {
    const result = await libsql.execute("SELECT 1")
    console.log('✓ SELECT 1 works:', result)
    
    // Check if Fleet tables exist
    const tables = await libsql.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Fleet%'")
    console.log('Fleet tables:', tables)
    
    // Try creating FleetControl table
    try {
      await libsql.execute(`
        CREATE TABLE IF NOT EXISTS "FleetControl" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "employee" TEXT NOT NULL,
          "jobId" TEXT NOT NULL,
          "verdict" TEXT,
          "paused" BOOLEAN NOT NULL DEFAULT false,
          "autoAllowed" BOOLEAN NOT NULL DEFAULT true,
          "payload" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✓ FleetControl created')
    } catch (e) {
      console.log('FleetControl error:', e.message)
    }
    
    // Try creating FleetReport table
    try {
      await libsql.execute(`
        CREATE TABLE IF NOT EXISTS "FleetReport" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "employee" TEXT NOT NULL,
          "jobId" TEXT NOT NULL,
          "verdict" TEXT,
          "finished" TEXT,
          "couldnt" TEXT,
          "needsYou" TEXT,
          "raw" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✓ FleetReport created')
    } catch (e) {
      console.log('FleetReport error:', e.message)
    }
    
    // Try creating FleetEvent table
    try {
      await libsql.execute(`
        CREATE TABLE IF NOT EXISTS "FleetEvent" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "lane" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "severity" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "body" TEXT,
          "meta" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✓ FleetEvent created')
    } catch (e) {
      console.log('FleetEvent error:', e.message)
    }
    
    const tablesAfter = await libsql.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Fleet%'")
    console.log('Fleet tables after:', tablesAfter)
    
  } catch (e) {
    console.error('Error:', e.message)
  }
}

test()
