// When WA_SERVICE_URL is set (Vercel), all WhatsApp calls go to the external service.
// When running locally without it, calls go to the local whatsapp-client singleton.

export const WA_SERVICE_URL = process.env.WA_SERVICE_URL?.replace(/\/$/, '')

export function isExternal(): boolean {
  return Boolean(WA_SERVICE_URL)
}

export async function proxyGet(path: string) {
  const res = await fetch(`${WA_SERVICE_URL}${path}`)
  return res.json()
}

export async function proxyPost(path: string, body?: unknown) {
  const res = await fetch(`${WA_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

export async function proxyDelete(path: string) {
  const res = await fetch(`${WA_SERVICE_URL}${path}`, { method: 'DELETE' })
  return res.json()
}
