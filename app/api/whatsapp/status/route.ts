import { NextResponse } from 'next/server'
import { isExternal, proxyGet } from '@/lib/wa-proxy'

export async function GET() {
  if (isExternal()) {
    const data = await proxyGet('/status')
    return NextResponse.json(data)
  }

  // Local: use in-process client
  const { getWAState } = await import('@/lib/whatsapp-client')
  const QRCode = (await import('qrcode')).default
  const { status, qr } = getWAState()
  let qrImage: string | undefined
  if (qr) qrImage = await QRCode.toDataURL(qr, { width: 280, margin: 2 })
  return NextResponse.json({ status, qrImage })
}
