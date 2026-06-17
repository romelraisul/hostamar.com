require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const hash = bcrypt.hashSync('EQDTvtbrSUw5ARudl9kC', 10)
  const user = await prisma.customer.update({
    where: { email: 'admin@hostamar.com' },
    data: { password: hash }
  })
  console.log('Password updated for:', user.email)
  console.log('New password: EQDTvtbrSUw5ARudl9kC')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
