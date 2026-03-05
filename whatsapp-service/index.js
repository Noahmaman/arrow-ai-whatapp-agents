const express = require('express')
const cors = require('cors')
const QRCode = require('qrcode')
const { Client, LocalAuth } = require('whatsapp-web.js')

const app = express()
app.use(express.json())
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}))

// ── State ────────────────────────────────────────────────────────────────────
let waClient = null
let waStatus = 'idle' // idle | loading | qr | authenticated | ready | disconnected
let waQR = null

// ── WhatsApp client ──────────────────────────────────────────────────────────
function createClient() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/data/wa-session' }),
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

  client.on('qr', (qr) => {
    waQR = qr
    waStatus = 'qr'
    console.log('[WA] QR received')
  })

  client.on('authenticated', () => {
    waStatus = 'authenticated'
    waQR = null
    console.log('[WA] Authenticated')
  })

  client.on('ready', () => {
    waStatus = 'ready'
    waQR = null
    console.log('[WA] Ready')
  })

  client.on('disconnected', (reason) => {
    waStatus = 'disconnected'
    waQR = null
    waClient = null
    console.log('[WA] Disconnected:', reason)
  })

  client.initialize().catch((err) => {
    console.error('[WA] Init error:', err.message)
    waStatus = 'disconnected'
  })

  return client
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/status', async (req, res) => {
  let qrImage
  if (waQR) {
    qrImage = await QRCode.toDataURL(waQR, { width: 280, margin: 2 })
  }
  res.json({ status: waStatus, qrImage })
})

app.post('/init', (req, res) => {
  if (waStatus === 'loading' || waStatus === 'qr' || waStatus === 'ready') {
    return res.json({ ok: true, status: waStatus })
  }
  if (waClient) {
    try { waClient.destroy() } catch {}
    waClient = null
  }
  waStatus = 'loading'
  waQR = null
  waClient = createClient()
  res.json({ ok: true })
})

app.delete('/init', async (req, res) => {
  if (waClient) {
    try { await waClient.destroy() } catch {}
    waClient = null
  }
  waStatus = 'idle'
  waQR = null
  res.json({ ok: true })
})

app.post('/send', async (req, res) => {
  const { phone, message } = req.body
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' })
  if (waStatus !== 'ready' || !waClient) {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }
  try {
    const digits = phone.replace(/\D/g, '')
    const chatId = digits.includes('@') ? digits : `${digits}@c.us`
    const result = await waClient.sendMessage(chatId, message)
    res.json({ ok: true, messageId: result.id._serialized })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (req, res) => res.json({ ok: true }))

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`WhatsApp service listening on port ${PORT}`))
