import { NextResponse } from 'next/server'
import { initWAClient, disconnectWA } from '@/lib/whatsapp-client'

export async function POST() {
  await initWAClient()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await disconnectWA()
  return NextResponse.json({ ok: true })
}
