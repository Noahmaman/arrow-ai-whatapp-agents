import { NextRequest, NextResponse } from 'next/server'
import { isExternal, proxyPost } from '@/lib/wa-proxy'

export async function POST(request: NextRequest) {
  const { phone, message } = await request.json()

  if (isExternal()) {
    const data = await proxyPost('/send', { phone, message })
    if (data.error) return NextResponse.json({ error: data.error }, { status: 503 })
    return NextResponse.json({ success: true, messageId: data.messageId })
  }

  // Local: use in-process client
  try {
    const { getWAClient, getWAState } = await import('@/lib/whatsapp-client')
    const { status } = getWAState()
    if (status !== 'ready') {
      return NextResponse.json(
        { error: 'WhatsApp is not connected. Go to /connect to scan the QR code.' },
        { status: 503 }
      )
    }
    const client = getWAClient()
    if (!client) return NextResponse.json({ error: 'Client unavailable' }, { status: 503 })
    const digits = String(phone).replace(/\D/g, '')
    const chatId = `${digits}@c.us`
    const result = await client.sendMessage(chatId, message)
    return NextResponse.json({ success: true, messageId: result.id.id })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
