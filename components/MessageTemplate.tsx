'use client'

import { useRef, useState } from 'react'
import type { SheetRow } from '@/lib/types'

export type TemplateOutput = {
  mode: 'manual' | 'ai'
  template?: string
  messages?: string[]
  demioLink?: string
  aiPrompt?: string
}

type Props = {
  headers: string[]
  rows: SheetRow[]
  onNext: (output: TemplateOutput) => void
  onBack: () => void
}

const templatePresets = [
  {
    name: 'Warm intro',
    description: 'Short, personal, low pressure',
    body: ({ name, company, role }: Record<string, string>) => `Hi {{${name}}}, I saw you${role ? ` work around {{${role}}}` : ''}${company ? ` at {{${company}}}` : ''}.\n\nQuick thought: we help teams find and contact qualified leads faster without spending hours cleaning sheets or writing every message manually.\n\nWould it be crazy to send you a 30-second overview?`,
  },
  {
    name: 'Pain opener',
    description: 'Lead gen / ops angle',
    body: ({ name, company }: Record<string, string>) => `Hi {{${name}}}, quick one.\n\nA lot of teams${company ? ` like {{${company}}}` : ''} lose time between finding prospects, personalising outreach, and following up consistently.\n\nWe built Arrow Agents SDR to turn a contact sheet into personalised outreach with safer pacing and tracking.\n\nOpen to seeing how it would look on your workflow?`,
  },
  {
    name: 'Event invite',
    description: 'Webinar or demo link ready',
    body: ({ name, company }: Record<string, string>) => `Hi {{${name}}}, I wanted to invite you personally${company ? ` since {{${company}}} looks like a relevant fit` : ''}.\n\nWe are showing how SDR teams can automate personalised outreach from sheets while keeping messages natural and spaced out.\n\nIf useful, here is the link: `,
  },
  {
    name: 'Follow-up',
    description: 'Polite nudge',
    body: ({ name }: Record<string, string>) => `Hi {{${name}}}, just following up on my previous note.\n\nNo worries if the timing is off. I thought it could be relevant because it helps teams move from raw contact lists to personalised outreach without doing everything manually.\n\nWorth a quick look?`,
  },
  {
    name: 'Direct offer',
    description: 'Clear SDR value prop',
    body: ({ name, company }: Record<string, string>) => `Hi {{${name}}}, I can help${company ? ` {{${company}}}` : ' your team'} turn lead sheets into personalised WhatsApp outreach with random sending delays, previews, and campaign history.\n\nIf I prepared a small example using your current columns, would you want to see it?`,
  },
]

function findHeader(headers: string[], patterns: RegExp[], fallback: string) {
  return headers.find((header) => patterns.some((pattern) => pattern.test(header))) || headers[0] || fallback
}

export default function MessageTemplate({ headers, rows, onNext, onBack }: Props) {
  const [tab, setTab] = useState<'manual' | 'ai'>('manual')
  const [template, setTemplate] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedMessages, setGeneratedMessages] = useState<string[]>([])
  const [genProgress, setGenProgress] = useState(0)
  const [aiError, setAiError] = useState('')
  const [demioLink, setDemioLink] = useState('')
  const [error, setError] = useState('')

  const insertVariable = (col: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const s = ta.selectionStart
    const tag = `{{${col}}}`
    setTemplate(template.slice(0, s) + tag + template.slice(ta.selectionEnd))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + tag.length, s + tag.length) }, 0)
  }

  const applyPreset = (body: (vars: Record<string, string>) => string) => {
    const vars = {
      name: findHeader(headers, [/^name$/i, /first/i, /prenom/i, /prénom/i, /nom/i], 'Name'),
      company: findHeader(headers, [/company/i, /societe/i, /société/i, /business/i, /account/i], ''),
      role: findHeader(headers, [/role/i, /title/i, /job/i, /poste/i, /function/i], ''),
    }
    setTab('manual')
    setTemplate(body(vars))
    setError('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const previewManual = (tpl: string) =>
    headers.reduce((m, h) => m.replaceAll(`{{${h}}}`, `[${h}]`), tpl)

  const generateMessages = async () => {
    if (!aiPrompt.trim()) { setAiError('Write a campaign objective first.'); return }
    setAiError(''); setGenerating(true); setGenProgress(0); setGeneratedMessages([])
    const timer = setInterval(() => setGenProgress((p) => Math.min(p + Math.floor(Math.random() * 12 + 4), 88)), 700)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: rows, prompt: aiPrompt, demioLink: demioLink.trim() || undefined }),
      })
      clearInterval(timer)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedMessages(data.messages)
      setGenProgress(100)
    } catch (e) {
      clearInterval(timer)
      setAiError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleNext = () => {
    setError('')
    if (tab === 'manual') {
      if (!template.trim()) { setError('Write a message template first.'); return }
      onNext({ mode: 'manual', template, demioLink: demioLink.trim() || undefined })
    } else {
      if (!generatedMessages.length) { setError('Generate messages with AI first.'); return }
      onNext({ mode: 'ai', messages: generatedMessages, aiPrompt, demioLink: demioLink.trim() || undefined })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Craft your message</h2>
          <p className="text-slate-500 text-sm mt-1">Write a template or let AI personalise each message uniquely.</p>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
          {(['manual', 'ai'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'manual' ? '✏️  Write template' : '✨  AI writes for me'}
            </button>
          ))}
        </div>

        {tab === 'manual' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ready-to-use SDR templates</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {templatePresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.body)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-whatsapp-green/40 hover:bg-whatsapp-light/30"
                  >
                    <span className="block text-sm font-semibold text-slate-800">{preset.name}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Insert variable</p>
              <div className="flex flex-wrap gap-2">
                {headers.map((h) => (
                  <button key={h} onClick={() => insertVariable(h)}
                    className="px-3 py-1.5 bg-whatsapp-light text-whatsapp-dark border border-whatsapp-green/30 rounded-full text-xs font-medium hover:bg-whatsapp-green hover:text-white transition">
                    {`{{${h}}}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <textarea ref={textareaRef} value={template} onChange={(e) => setTemplate(e.target.value)} rows={8}
                placeholder="Hi {{Name}}, I wanted to reach out to you at {{Company}}…"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 resize-none transition" />
              <span className="absolute bottom-3 right-3 text-xs text-slate-400">{template.length} chars</span>
            </div>
            {template && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Preview</p>
                <div className="bg-whatsapp-light rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap border border-whatsapp-green/20 max-w-sm">
                  {previewManual(template)}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign objective</label>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4}
                placeholder="e.g. Invite them to our live webinar on AI tools. Be warm and personal. Mention their role and company."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 resize-none transition" />
              <p className="text-xs text-slate-400 mt-1">Claude reads each contact and writes a unique, personalised message.</p>
            </div>
            <button onClick={generateMessages} disabled={generating || !aiPrompt.trim()}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Writing messages… {genProgress}%
                </>
              ) : generatedMessages.length > 0 ? `✨ Regenerate (${rows.length} contacts)` : `✨ Generate ${rows.length} personalised messages`}
            </button>
            {generating && (
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 rounded-full transition-all duration-500" style={{ width: `${genProgress}%` }} />
              </div>
            )}
            {aiError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{aiError}</div>}
            {generatedMessages.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">✅ {generatedMessages.length} unique messages generated</p>
                <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-3 pr-1">
                  {generatedMessages.slice(0, 5).map((msg, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-whatsapp-dark text-white text-xs flex items-center justify-center flex-shrink-0 mt-1">
                        {(Object.values(rows[i])[0] || '?').toString().charAt(0).toUpperCase()}
                      </div>
                      <div className="bg-whatsapp-light rounded-2xl rounded-tl-none px-3 py-2.5 text-xs text-slate-800 whitespace-pre-wrap border border-whatsapp-green/20 flex-1">{msg}</div>
                    </div>
                  ))}
                  {generatedMessages.length > 5 && <p className="text-xs text-slate-400 text-center">+ {generatedMessages.length - 5} more…</p>}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Demio video / webinar link <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <input type="url" value={demioLink} onChange={(e) => setDemioLink(e.target.value)}
                placeholder="https://event.demio.com/register/..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 transition" />
            </div>
            {tab === 'manual' && demioLink && (
              <button onClick={() => {
                const ta = textareaRef.current; if (!ta) return
                const s = ta.selectionStart
                setTemplate(template.slice(0, s) + demioLink + template.slice(s))
                setTimeout(() => { ta.focus(); ta.setSelectionRange(s + demioLink.length, s + demioLink.length) }, 0)
              }} className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition whitespace-nowrap">
                Insert link
              </button>
            )}
          </div>
          {tab === 'ai' && demioLink && (
            <p className="text-xs text-slate-400 mt-1.5">AI will include this link naturally in every generated message.</p>
          )}
        </div>

        {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        <div className="mt-6 flex gap-3">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">Back</button>
          <button onClick={handleNext} className="flex-1 py-2.5 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2">
            Next: Preview Messages
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
