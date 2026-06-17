require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function test() {
  const user = await prisma.customer.findUnique({ where: { email: 'admin@hostamar.com' } })
  if (!user) { console.log('NOT FOUND'); return }
  console.log('User:', { id: user.id, email: user.email, name: user.name, password: user.password })
  const valid = await bcrypt.compare('admin123', user.password)
  console.log('Password valid:', valid)
  await prisma.$disconnect()
}
test().catch(e => { console.error(e.message); process.exit(1) })
