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

function getPhoneCandidates(value) {
  const raw = String(value ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  const candidates = []

  const add = (candidate) => {
    const clean = candidate.replace(/\D/g, '')
    if (clean.length >= 8 && clean.length <= 15 && !candidates.includes(clean)) {
      candidates.push(clean)
    }
  }

  if (!digits) return candidates

  if (raw.startsWith('+')) add(digits)
  if (digits.startsWith('00')) add(digits.slice(2))

  add(digits)

  if (digits.startsWith('330')) add(`33${digits.slice(3)}`)
  if (digits.startsWith('9720')) add(`972${digits.slice(4)}`)

  if (digits.startsWith('0')) {
    add(`33${digits.slice(1)}`)
    add(`972${digits.slice(1)}`)
  }

  if (digits.length === 9 && /^[67]/.test(digits)) add(`33${digits}`)
  if (digits.length === 9 && digits.startsWith('5')) add(`972${digits}`)
  if (digits.length === 10 && /^[2-9]/.test(digits)) add(`1${digits}`)

  return candidates
}

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
    const candidates = getPhoneCandidates(phone)

    if (!candidates.length) {
      results.push({ phone, exists: false })
      continue
    }

    let found
    let normalizedPhone

    for (const candidate of candidates) {
      try {
        const lookup = await client.getNumberId(candidate)
        if (lookup?._serialized) {
          found = lookup
          normalizedPhone = candidate
          break
        }
      } catch {
        // Try the next likely country-code format.
      }
    }

    results.push({
      phone,
      exists: Boolean(found?._serialized),
      chatId: found?._serialized,
      normalizedPhone,
    })
  }

  res.json({ success: true, results })
})

app.post('/send', async (req, res) => {
  if (status !== 'ready' || !client) {
    res.status(503).json({ error: 'WhatsApp is not connected.' })
    return
  }

  const candidates = getPhoneCandidates(req.body?.phone)
  const message = String(req.body?.message ?? '')

  if (!candidates.length || !message.trim()) {
    res.status(400).json({ error: 'Phone and message are required.' })
    return
  }

  try {
    let chatId

    for (const candidate of candidates) {
      const lookup = await client.getNumberId(candidate)
      if (lookup?._serialized) {
        chatId = lookup._serialized
        break
      }
    }

    if (!chatId) {
      res.status(404).json({ error: 'Phone number is not registered on WhatsApp' })
      return
    }

    const result = await client.sendMessage(chatId, message)
    res.json({ success: true, messageId: result.id.id })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to send message' })
  }
})

app.listen(port, () => {
  console.log(`WhatsApp service listening on ${port}`)
})
