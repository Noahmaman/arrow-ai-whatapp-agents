// Persistent singleton — survives Next.js hot reloads via global
import type { Client } from 'whatsapp-web.js'

export type WAStatus = 'idle' | 'loading' | 'qr' | 'authenticated' | 'ready' | 'disconnected'

const g = global as typeof global & {
  __waClient?: Client
  __waStatus?: WAStatus
  __waQR?: string
  __waLastError?: string
}

export function getWAState(): { status: WAStatus; qr?: string; error?: string } {
  return {
    status: g.__waStatus ?? 'idle',
    qr: g.__waQR,
    error: g.__waLastError,
  }
}

export async function initWAClient(): Promise<void> {
  // Already initialising or ready
  if (g.__waStatus === 'loading' || g.__waStatus === 'qr' || g.__waStatus === 'ready') return

  // Clean up any existing client before reinitializing
  if (g.__waClient) {
    try { await g.__waClient.destroy() } catch { /* ignore */ }
    g.__waClient = undefined
  }

  g.__waStatus = 'loading'
  g.__waQR = undefined
  g.__waLastError = undefined

  // Dynamic import keeps puppeteer out of the client bundle
  const { Client, LocalAuth } = await import('whatsapp-web.js')

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wa-session' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    },
  })

  client.on('qr', (qr: string) => {
    g.__waQR = qr
    g.__waStatus = 'qr'
  })

  client.on('authenticated', () => {
    g.__waStatus = 'authenticated'
    g.__waQR = undefined
  })

  client.on('ready', () => {
    g.__waStatus = 'ready'
    g.__waQR = undefined
    g.__waLastError = undefined
  })

  client.on('disconnected', (reason: string) => {
    g.__waStatus = 'disconnected'
    g.__waClient = undefined
    g.__waQR = undefined
    g.__waLastError = reason
  })

  // Non-blocking — QR/ready events fire asynchronously
  client.initialize().catch((err: Error) => {
    console.error('[WA] init error', err.message)
    g.__waStatus = 'disconnected'
    g.__waClient = undefined
    g.__waQR = undefined
    g.__waLastError = err.message
  })

  g.__waClient = client
}

export function getWAClient(): Client | undefined {
  return g.__waClient
}

export async function disconnectWA(): Promise<void> {
  if (g.__waClient) {
    await g.__waClient.destroy()
    g.__waClient = undefined
  }
  g.__waStatus = 'idle'
  g.__waQR = undefined
  g.__waLastError = undefined
}
