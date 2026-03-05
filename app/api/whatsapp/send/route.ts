import { NextRequest, NextResponse } from 'next/server'
import { getWAClient, getWAState } from '@/lib/whatsapp-client'

export async function POST(request: NextRequest) {
  try {
    const { status } = getWAState()
    if (status !== 'ready') {
      return NextResponse.json(
        { error: 'WhatsApp is not connected. Go to /connect to scan the QR code.' },
        { status: 503 }
      )
    }

    const client = getWAClient()
    if (!client) {
      return NextResponse.json({ error: 'Client unavailable' }, { status: 503 })
    }

    const { phone, message } = await request.json()

    // Normalise: strip non-digits then append @c.us
    const digits = String(phone).replace(/\D/g, '')
    const chatId = `${digits}@c.us`

    const result = await client.sendMessage(chatId, message)

    return NextResponse.json({ success: true, messageId: result.id.id })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
