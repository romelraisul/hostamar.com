const { createClient } = require('@libsql/client')

async function test() {
  // Test with full JWT from file
  const fs = require('fs')
  const tokenData = JSON.parse(fs.readFileSync('/tmp/turso_full.json', 'utf8'))
  const jwt = tokenData.jwt
  
  console.log('JWT length:', jwt.length)
  console.log('JWT prefix:', jwt.substring(0, 50))
  
  const url = `libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io?authToken=${jwt}`
  const cleanUrl = url.split('?')[0]
  const authToken = jwt
  
  console.log('Connecting to:', cleanUrl)
  
  const libsql = createClient({ url: cleanUrl, authToken })
  
  try {
    const result = await libsql.execute("SELECT 1")
    console.log('✓ SELECT 1 works:', result)
    
    // Check if Fleet tables exist
    const tables = await libsql.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Fleet%'")
    console.log('Fleet tables:', tables)
  } catch (e) {
    console.error('Error:', e.message)
    console.error('Stack:', e.stack)
  }
}

test()
