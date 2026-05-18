import { NextResponse } from 'next/server'
import type { WAStatus } from '@/lib/whatsapp-client'

const serviceUrl = process.env.WHATSAPP_SERVICE_URL?.replace(/\/$/, '')

export function hasRemoteWhatsAppService() {
  return Boolean(serviceUrl)
}

export function isVercelRuntime() {
  return Boolean(process.env.VERCEL)
}

export function vercelWhatsAppUnavailable() {
  return NextResponse.json(
    {
      error:
        'WhatsApp Web cannot run directly inside Vercel serverless functions. Deploy a small persistent WhatsApp service and set WHATSAPP_SERVICE_URL in Vercel.',
    },
    { status: 501 }
  )
}

export async function callWhatsAppService(path: string, init?: RequestInit) {
  if (!serviceUrl) {
    throw new Error('WHATSAPP_SERVICE_URL is not configured')
  }

  const response = await fetch(`${serviceUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const json = await response.json().catch(() => ({}))
  return NextResponse.json(json, { status: response.status })
}

export type RemoteStatusResponse = {
  status: WAStatus
  qr?: string
  qrImage?: string
}
