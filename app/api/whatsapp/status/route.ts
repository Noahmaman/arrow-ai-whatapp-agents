import { NextResponse } from 'next/server'
import { getWAState } from '@/lib/whatsapp-client'
import { callWhatsAppService, hasRemoteWhatsAppService, type RemoteStatusResponse } from '@/lib/whatsapp-service'
import QRCode from 'qrcode'

export async function GET() {
  if (hasRemoteWhatsAppService()) {
    return callWhatsAppService('/status')
  }

  const { status, qr } = getWAState()

  let qrImage: string | undefined
  if (qr) {
    qrImage = await QRCode.toDataURL(qr, { width: 280, margin: 2 })
  }

  return NextResponse.json({ status, qrImage } satisfies RemoteStatusResponse)
}
