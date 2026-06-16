import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { ensureTrial } from '@/lib/trial'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'সকল ফিল্ড পূরণ করুন' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' }, { status: 400 })
    }

    // Check existing user
    const existing = await prisma.customer.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে' }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        password: hashedPassword,
      }
    })

    // Phase 0.1: 7-day free trial for every new customer.
    await ensureTrial(customer.id)

    return NextResponse.json({
      success: true,
      message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!',
      userId: customer.id
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'রেজিস্ট্রেশনে সমস্যা হয়েছে' }, { status: 500 })
  }
}