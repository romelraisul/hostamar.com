const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'romelraisul@gmail.com' }
  })
  if (!admin) {
    console.error('Admin user not found')
    return
  }
  console.log('Admin found:', admin.id, admin.email)

  const plaintext = 'hk_live_' + crypto.randomBytes(32).toString('hex')
  const hashed = crypto.createHash('sha256').update(plaintext).digest('hex')
  const prefix = plaintext.slice(0, 8)
  
  const apiKey = await prisma.apiKey.create({
    data: {
      customerId: admin.id,
      name: 'gateway-test-key',
      permissions: {
        canGenerateImage: true,
        canGenerateVideo: true,
        canUseChat: true,
      },
      hashedKey: hashed,
      prefix: plaintext.slice(0, 8),
    }
  })
  console.log('Created API key:')
  console.log('PLAINTEXT (SAVE THIS):', plaintext)
  console.log('PREFIX:', apiKey.prefix)
  console.log('ID:', apiKey.id)
}

main().catch(console.error).finally(() => prisma.$disconnect())
