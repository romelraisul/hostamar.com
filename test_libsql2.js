const { createClient } = require('@libsql/client')

async function test() {
  // Try without auth token
  const url = "libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io"
  
  console.log('Connecting to:', url)
  
  const libsql = createClient({ url })
  
  try {
    const result = await libsql.execute("SELECT 1")
    console.log('✓ SELECT 1 works:', result)
  } catch (e) {
    console.error('Error without auth:', e.message)
  }
  
  // Try with empty auth token
  try {
    const libsql2 = createClient({ url, authToken: '' })
    const result = await libsql2.execute("SELECT 1")
    console.log('✓ SELECT 1 with empty auth:', result)
  } catch (e) {
    console.error('Error with empty auth:', e.message)
  }
}

test()
