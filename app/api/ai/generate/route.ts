import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { SheetRow } from '@/app/page'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { contacts, prompt, demioLink } = await request.json() as {
      contacts: SheetRow[]
      prompt: string
      demioLink?: string
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not set in .env.local' },
        { status: 500 }
      )
    }

    // Generate one message per contact (with concurrency limit of 5)
    const CONCURRENCY = 5
    const messages: string[] = []

    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
      const batch = contacts.slice(i, i + CONCURRENCY)
      const results = await Promise.all(batch.map((contact) => generateMessage(contact, prompt, demioLink)))
      messages.push(...results)
    }

    return NextResponse.json({ messages })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function generateMessage(contact: SheetRow, prompt: string, demioLink?: string): Promise<string> {
  const contextLines = Object.entries(contact)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const system = `You are an expert copywriter writing personalised WhatsApp messages for a marketing campaign.

Rules:
- Write ONLY the message body — no subject line, no label, no preamble
- Use the person's actual name and data, never placeholders like [Name]
- Keep it conversational, warm, and under 160 words
- WhatsApp-friendly: short paragraphs, natural tone, no corporate jargon
- Use emojis sparingly if they fit the tone
${demioLink ? `- Naturally include this Demio link in the message: ${demioLink}` : ''}`

  const user = `Here is the information about this person:\n${contextLines}\n\nCampaign objective: ${prompt}\n\nWrite their personalised WhatsApp message:`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}
