import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

// SMS API integration (using local SMS gateway for Bangladesh)
async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    // Hostamar SMS Gateway API configuration
    const smsConfig = {
      apiUrl: process.env.SMS_API_URL || 'https://api.hostamar.com/sms/send',
      apiKey: process.env.SMS_API_KEY,
      senderId: process.env.SMS_SENDER_ID || 'HOSTAMAR'
    }

    if (!smsConfig.apiKey) {
      console.warn('SMS_API_KEY not configured, skipping SMS send')
      return false
    }

    const response = await fetch(smsConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${smsConfig.apiKey}`
      },
      body: JSON.stringify({
        to: phone,
        message: message,
        sender: smsConfig.senderId
      })
    })

    const data = await response.json()
    return data.success || false
  } catch (error) {
    console.error('SMS send error:', error)
    return false
  }
}

// WhatsApp API integration
async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    const waConfig = {
      apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN
    }

    if (!waConfig.accessToken || !waConfig.phoneNumberId) {
      console.warn('WhatsApp API not configured, skipping')
      return false
    }

    const response = await fetch(`${waConfig.apiUrl}/${waConfig.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${waConfig.accessToken}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    })

    const data = await response.json()
    return data?.messages?.[0]?.id ? true : false
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, message, channels, orderId } = await request.json()

    if (!to || !message || !channels) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const results: any = {}

    // Send via selected channels
    if (channels.includes('sms')) {
      results.sms = await sendSMS(to, message)
    }
    if (channels.includes('whatsapp')) {
      results.whatsapp = await sendWhatsApp(to, message)
    }

    // Log notification
    const user = await prisma.customer.findUnique({
      where: { email: session.user.email }
    })

    if (user) {
      await prisma.notification.create({
        data: {
          customerId: user.id,
          type: 'ORDER_UPDATE',
          title: 'আদেশ বিজ্ঞপ্তি পাঠানো হয়েছে',
          message: `প্রাপক: ${to} | চ্যানেল: ${channels.join(', ')}`,
          actionUrl: orderId ? `/dashboard/orders/${orderId}` : undefined
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'বিজ্ঞপ্তি পাঠানো হয়েছে',
      results
    })
  } catch (error) {
    console.error('Notification send error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}