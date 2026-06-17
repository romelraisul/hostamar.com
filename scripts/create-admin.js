require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin user exists
    const existingAdmin = await prisma.customer.findUnique({
      where: { email: 'admin@hostamar.com' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:')
      console.log('Email: admin@hostamar.com')
      console.log('Password: admin123')
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const admin = await prisma.customer.create({
      data: {
        email: 'admin@hostamar.com',
        name: 'Admin',
        password: hashedPassword,
        phone: '+8801700000000',
        stage: 'active',
        source: 'admin',
        score: 100,
        notes: 'System admin user',
        balance: 0,
        referralBonus: 0
      }
    })

    console.log('Admin user created successfully!')
    console.log('Email: admin@hostamar.com')
    console.log('Password: admin123')
    console.log('User ID:', admin.id)
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
