import { NextResponse } from 'next/server'
import { initWAClient, disconnectWA } from '@/lib/whatsapp-client'
import { callWhatsAppService, hasRemoteWhatsAppService, isVercelRuntime, vercelWhatsAppUnavailable } from '@/lib/whatsapp-service'

export async function POST() {
  if (hasRemoteWhatsAppService()) {
    return callWhatsAppService('/init', { method: 'POST' })
  }
  if (isVercelRuntime()) return vercelWhatsAppUnavailable()

  await initWAClient()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  if (hasRemoteWhatsAppService()) {
    return callWhatsAppService('/disconnect', { method: 'POST' })
  }
  if (isVercelRuntime()) return vercelWhatsAppUnavailable()

  await disconnectWA()
  return NextResponse.json({ ok: true })
}
