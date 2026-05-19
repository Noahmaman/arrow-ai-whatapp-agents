import { NextResponse } from 'next/server'
import { getWAState } from '@/lib/whatsapp-client'
import { callWhatsAppService, hasRemoteWhatsAppService, isVercelRuntime, type RemoteStatusResponse } from '@/lib/whatsapp-service'
import QRCode from 'qrcode'

export async function GET() {
  if (hasRemoteWhatsAppService()) {
    return callWhatsAppService('/status')
  }

  if (isVercelRuntime()) {
    return NextResponse.json({
      status: 'disconnected',
      configured: false,
      error: 'WhatsApp service missing',
      details: 'Add WHATSAPP_SERVICE_URL in Vercel, then redeploy the app.',
    } satisfies RemoteStatusResponse)
  }

  const { status, qr } = getWAState()

  let qrImage: string | undefined
  if (qr) {
    qrImage = await QRCode.toDataURL(qr, { width: 280, margin: 2 })
  }

  return NextResponse.json({ status, qrImage } satisfies RemoteStatusResponse)
}
