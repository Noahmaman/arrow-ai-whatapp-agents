import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const CAMPAIGNS_DIR = path.join(process.env.VERCEL ? '/tmp' : process.cwd(), '.campaigns')

export type CampaignContact = {
  name: string
  phone: string
  message: string
  status: 'sent' | 'error'
  error?: string
  messageId?: string
}

export type Campaign = {
  id: string
  name: string
  createdAt: string
  mode: 'manual' | 'ai'
  template?: string
  aiPrompt?: string
  demioLink?: string
  contacts: CampaignContact[]
  stats: { total: number; sent: number; failed: number }
}

function ensureDir() {
  if (!fs.existsSync(CAMPAIGNS_DIR)) {
    fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true })
  }
}

export function saveCampaign(data: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
  ensureDir()
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  }
  fs.writeFileSync(
    path.join(CAMPAIGNS_DIR, `${campaign.id}.json`),
    JSON.stringify(campaign, null, 2)
  )
  return campaign
}

export function listCampaigns(): Campaign[] {
  ensureDir()
  return fs
    .readdirSync(CAMPAIGNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(CAMPAIGNS_DIR, f), 'utf8')) as Campaign)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getCampaign(id: string): Campaign | null {
  ensureDir()
  const file = path.join(CAMPAIGNS_DIR, `${id}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function deleteCampaign(id: string): boolean {
  const file = path.join(CAMPAIGNS_DIR, `${id}.json`)
  if (!fs.existsSync(file)) return false
  fs.unlinkSync(file)
  return true
}
