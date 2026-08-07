export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Test: prisma object:', typeof prisma, !!prisma)
    console.log('Test: prisma.customer:', typeof prisma.customer)
    console.log('Test: prisma.betaInvite:', typeof prisma.betaInvite)
    
    const count = await prisma.customer.count()
    return NextResponse.json({ success: true, customerCount: count })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
