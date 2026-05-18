import { NextRequest, NextResponse } from 'next/server'
import { getWAClient, getWAState } from '@/lib/whatsapp-client'
import { callWhatsAppService, hasRemoteWhatsAppService, isVercelRuntime, vercelWhatsAppUnavailable } from '@/lib/whatsapp-service'

type ValidationResult = {
  phone: string
  exists: boolean
  chatId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (hasRemoteWhatsAppService()) {
      return callWhatsAppService('/validate', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    }
    if (isVercelRuntime()) return vercelWhatsAppUnavailable()

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

    const phones = Array.isArray(body?.phones) ? body.phones : []

    const results: ValidationResult[] = []

    for (const rawPhone of phones) {
      const phone = String(rawPhone ?? '')
      const digits = phone.replace(/\D/g, '')

      if (!digits) {
        results.push({ phone, exists: false })
        continue
      }

      try {
        const lookup = await client.getNumberId(`${digits}@c.us`)
        results.push({
          phone,
          exists: Boolean(lookup?._serialized),
          chatId: lookup?._serialized,
        })
      } catch {
        results.push({ phone, exists: false })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
