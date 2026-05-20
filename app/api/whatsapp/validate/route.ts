import { NextRequest, NextResponse } from 'next/server'
import { getWAClient, getWAState } from '@/lib/whatsapp-client'
import { callWhatsAppService, hasRemoteWhatsAppService, isVercelRuntime, vercelWhatsAppUnavailable } from '@/lib/whatsapp-service'

type ValidationResult = {
  phone: string
  exists: boolean
  chatId?: string
  normalizedPhone?: string
}

function getPhoneCandidates(value: unknown) {
  const raw = String(value ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  const candidates: string[] = []

  const add = (candidate: string) => {
    const clean = candidate.replace(/\D/g, '')
    if (clean.length >= 8 && clean.length <= 15 && !candidates.includes(clean)) {
      candidates.push(clean)
    }
  }

  if (!digits) return candidates

  if (raw.startsWith('+')) add(digits)
  if (digits.startsWith('00')) add(digits.slice(2))

  add(digits)

  if (digits.startsWith('330')) add(`33${digits.slice(3)}`)
  if (digits.startsWith('9720')) add(`972${digits.slice(4)}`)

  if (digits.startsWith('0')) {
    add(`33${digits.slice(1)}`)
    add(`972${digits.slice(1)}`)
  }

  if (digits.length === 9 && /^[67]/.test(digits)) add(`33${digits}`)
  if (digits.length === 9 && digits.startsWith('5')) add(`972${digits}`)
  if (digits.length === 10 && /^[2-9]/.test(digits)) add(`1${digits}`)

  return candidates
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
      const candidates = getPhoneCandidates(phone)

      if (!candidates.length) {
        results.push({ phone, exists: false })
        continue
      }

      let found: Awaited<ReturnType<typeof client.getNumberId>> = null
      let normalizedPhone: string | undefined

      for (const candidate of candidates) {
        try {
          const lookup = await client.getNumberId(candidate)
          if (lookup?._serialized) {
            found = lookup
            normalizedPhone = candidate
            break
          }
        } catch {
          // Try the next likely country-code format.
        }
      }

      results.push({
        phone,
        exists: Boolean(found?._serialized),
        chatId: found?._serialized,
        normalizedPhone,
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
