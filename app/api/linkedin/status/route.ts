import { NextResponse } from 'next/server'
import { getLinkedInConfig, getLinkedInProfile } from '@/lib/linkedin'

export async function GET() {
  const profile = await getLinkedInProfile()
  const { clientId, clientSecret } = getLinkedInConfig()

  return NextResponse.json({
    configured: Boolean(clientId && clientSecret),
    connected: Boolean(profile),
    profile,
  })
}
