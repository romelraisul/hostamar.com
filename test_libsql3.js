const { createClient } = require('@libsql/client')

async function test() {
  // Test the actual database URL format
  const tests = [
    "libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io",
    "libsql://hostamar-db-romelraisul.aws-us-east-1.turso.io?authToken=test",
  ]
  
  for (const url of tests) {
    console.log('Testing:', url)
    const libsql = createClient({ url })
    try {
      const result = await libsql.execute("SELECT 1")
      console.log('  Result:', result)
    } catch (e) {
      console.log('  Error:', e.message)
    }
  }
}

test()
