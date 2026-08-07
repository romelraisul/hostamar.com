export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Test prisma: Starting')
    console.log('Test prisma: prisma exists:', !!prisma)
    console.log('Test prisma: prisma.customer:', typeof prisma.customer)
    
    const count = await prisma.customer.count()
    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Test prisma error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
