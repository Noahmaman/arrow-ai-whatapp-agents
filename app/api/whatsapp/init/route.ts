import { NextResponse } from 'next/server'
import { isExternal, proxyPost, proxyDelete } from '@/lib/wa-proxy'

export async function POST() {
  if (isExternal()) {
    const data = await proxyPost('/init')
    return NextResponse.json(data)
  }
  const { initWAClient } = await import('@/lib/whatsapp-client')
  await initWAClient()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  if (isExternal()) {
    const data = await proxyDelete('/init')
    return NextResponse.json(data)
  }
  const { disconnectWA } = await import('@/lib/whatsapp-client')
  await disconnectWA()
  return NextResponse.json({ ok: true })
}
