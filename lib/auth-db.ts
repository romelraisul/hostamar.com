// Lazy Prisma replacement for NextAuth callbacks on Cloudflare Workers
// Uses raw @libsql/client/web — no fs.readdir, no query engine, no WASM load.

interface CustomerRow {
  id: string
  email: string
  name: string | null
  password: string | null
  role: string | null
  emailVerified: string | null
  createdAt: string | null
  updatedAt: string | null
}

async function getClient() {
  const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://')
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  if (!url) throw new Error('TURSO_DATABASE_URL not configured')
  const { createClient } = await import('@libsql/client/web')
  return createClient({ url, authToken })
}

function mapCustomer(row: any): CustomerRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    password: row.password,
    role: row.role,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function findCustomerByEmail(email: string): Promise<CustomerRow | null> {
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT id, email, name, password, role, "emailVerified", "createdAt", "updatedAt" FROM "Customer" WHERE email = ? LIMIT 1',
    args: [email],
  })
  return result.rows[0] ? mapCustomer(result.rows[0]) : null
}

export async function findCustomerById(id: string): Promise<CustomerRow | null> {
  const client = await getClient()
  const result = await client.execute({
    sql: 'SELECT id, email, name, password, role, "emailVerified", "createdAt", "updatedAt" FROM "Customer" WHERE id = ? LIMIT 1',
    args: [id],
  })
  return result.rows[0] ? mapCustomer(result.rows[0]) : null
}

export async function createCustomer(data: { email: string; name: string; password: string; role: string; source: string; stage: string }): Promise<CustomerRow> {
  const client = await getClient()
  const id = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await client.execute({
    sql: 'INSERT INTO "Customer" (id, email, name, password, role, source, stage, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
    args: [id, data.email, data.name, data.password, data.role, data.source, data.stage],
  })
  return { id, ...data, emailVerified: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

export async function verifyCustomerPassword(email: string, password: string): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const customer = await findCustomerByEmail(email)
  if (!customer || !customer.password) return null
  // bcryptjs comparison - import dynamically to avoid cold-start cost
  const bcrypt = await import('bcryptjs')
  const valid = await bcrypt.default.compare(password, customer.password)
  if (!valid) return null
  return { id: customer.id, email: customer.email, name: customer.name || 'User', role: customer.role || 'customer' }
}