import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'

// DELETE /api/keys/[id] — revoke (deactivate) an API key
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Key id required' }, { status: 400 })
    }

    // Ensure the key belongs to the requesting user (or admin can revoke any).
    const existing = await prisma.apiKey.findFirst({
      where: { id, customerId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API key revoke error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
