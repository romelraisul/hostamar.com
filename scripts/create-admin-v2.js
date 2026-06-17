require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Delete existing admin user
    await prisma.customer.deleteMany({
      where: { email: 'admin@hostamar.com' }
    })

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    console.log('Generated hash:', hashedPassword)
    
    const admin = await prisma.customer.create({
      data: {
        id: 'admin-001',
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
    
    // Verify password
    const isValid = await bcrypt.compare('admin123', admin.password)
    console.log('Password verification:', isValid)
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
