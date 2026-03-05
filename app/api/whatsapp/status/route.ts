import { NextResponse } from 'next/server'
import { getWAState } from '@/lib/whatsapp-client'
import QRCode from 'qrcode'

export async function GET() {
  const { status, qr } = getWAState()

  let qrImage: string | undefined
  if (qr) {
    qrImage = await QRCode.toDataURL(qr, { width: 280, margin: 2 })
  }

  return NextResponse.json({ status, qrImage })
}
