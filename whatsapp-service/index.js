import cors from 'cors'
import express from 'express'
import fs from 'fs/promises'
import QRCode from 'qrcode'
import whatsappWeb from 'whatsapp-web.js'

const { Client, LocalAuth } = whatsappWeb

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

let client
let status = 'idle'
let qr
let lastError
const sessionPath = './.wa-session'

function getState() {
  return { status, qr, lastError }
}

async function destroyClient() {
  if (!client) return
  try {
    await client.destroy()
  } catch {
    // Ignore cleanup failures; the next init will create a fresh session.
  }
  client = undefined
}

async function resetSession() {
  await destroyClient()
  try {
    await fs.rm(sessionPath, { recursive: true, force: true })
  } catch {
    // Ignore cleanup failures; startup errors will still surface through /status.
  }
  status = 'idle'
  qr = undefined
  lastError = undefined
}

async function initClient() {
  if (status === 'loading' || status === 'qr' || status === 'authenticated' || status === 'ready') {
    return
  }

  await destroyClient()
  status = 'loading'
  qr = undefined
  lastError = undefined

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wa-session' }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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

  client.on('qr', (nextQr) => {
    qr = nextQr
    status = 'qr'
  })

  client.on('authenticated', () => {
    qr = undefined
    status = 'authenticated'
  })

  client.on('ready', () => {
    qr = undefined
    status = 'ready'
    lastError = undefined
  })

  client.on('disconnected', (reason) => {
    client = undefined
    qr = undefined
    status = 'disconnected'
    lastError = reason ? String(reason) : undefined
  })

  client.initialize().catch((error) => {
    console.error('[WA] init error', error)
    client = undefined
    qr = undefined
    status = 'disconnected'
    lastError = error instanceof Error ? error.message : String(error)
  })
}

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'arrow-whatsapp-service', status, lastError })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, status, lastError })
})

app.post('/init', async (_req, res) => {
  await initClient()
  res.json({ ok: true })
})

app.post('/disconnect', async (_req, res) => {
  await destroyClient()
  status = 'idle'
  qr = undefined
  lastError = undefined
  res.json({ ok: true })
})

app.post('/reset', async (_req, res) => {
  await resetSession()
  res.json({ ok: true })
})

app.get('/status', async (_req, res) => {
  const state = getState()
  const qrImage = state.qr ? await QRCode.toDataURL(state.qr, { width: 280, margin: 2 }) : undefined
  res.json({ status: state.status, qrImage, error: state.lastError })
})

app.post('/validate', async (req, res) => {
  if (status !== 'ready' || !client) {
    res.status(503).json({ error: 'WhatsApp is not connected.' })
    return
  }

  const phones = Array.isArray(req.body?.phones) ? req.body.phones : []
  const results = []

  for (const rawPhone of phones) {
    const phone = String(rawPhone ?? '')
    const digits = phone.replace(/\D/g, '')

    if (!digits) {
      results.push({ phone, exists: false })
      continue
    }

    try {
      const lookup = await client.getNumberId(`${digits}@c.us`)
      results.push({
        phone,
        exists: Boolean(lookup?._serialized),
        chatId: lookup?._serialized,
      })
    } catch {
      results.push({ phone, exists: false })
    }
  }

  res.json({ success: true, results })
})

app.post('/send', async (req, res) => {
  if (status !== 'ready' || !client) {
    res.status(503).json({ error: 'WhatsApp is not connected.' })
    return
  }

  const digits = String(req.body?.phone ?? '').replace(/\D/g, '')
  const message = String(req.body?.message ?? '')

  if (!digits || !message.trim()) {
    res.status(400).json({ error: 'Phone and message are required.' })
    return
  }

  try {
    const result = await client.sendMessage(`${digits}@c.us`, message)
    res.json({ success: true, messageId: result.id.id })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to send message' })
  }
})

app.listen(port, () => {
  console.log(`WhatsApp service listening on ${port}`)
})
