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
        'WhatsApp is not configured for Vercel yet. Deploy the whatsapp-service folder on Render/Railway/VPS, then add its public URL as WHATSAPP_SERVICE_URL in your Vercel environment variables.',
      details:
        'Vercel serverless functions stop after each request, but WhatsApp Web needs a persistent Chromium session to stay connected after the QR scan.',
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
  error?: string
  details?: string
  configured?: boolean
}
