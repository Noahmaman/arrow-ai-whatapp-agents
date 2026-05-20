'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Campaign } from '@/lib/storage'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function HistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/campaigns')
    const data = await res.json()
    setCampaigns(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteCampaign = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-whatsapp-green flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Arrow Agents SDR History</h1>
            <p className="text-xs text-slate-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} saved</p>
          </div>
          <nav className="ml-auto flex gap-3">
            <Link href="/" className="px-4 py-2 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition">
              + New Campaign
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-whatsapp-teal" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No campaigns yet</p>
            <p className="text-slate-400 text-sm mt-1">Sent campaigns will be automatically saved here.</p>
            <Link href="/" className="inline-block mt-4 px-5 py-2.5 bg-whatsapp-green text-white rounded-xl text-sm font-medium hover:bg-whatsapp-teal transition">
              Send your first campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const isOpen = expanded === c.id
              const sentPct = c.stats.total > 0 ? Math.round((c.stats.sent / c.stats.total) * 100) : 0

              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => setExpanded(isOpen ? null : c.id)}>
                    {/* Stats ring */}
                    <div className="flex-shrink-0 relative w-12 h-12">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#25D366" strokeWidth="3"
                          strokeDasharray={`${sentPct * 0.94} 94`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{sentPct}%</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                        {c.mode === 'ai' && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">✨ AI</span>
                        )}
                        {c.mode === 'arrow' && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Arrow personalized</span>
                        )}
                        {c.demioLink && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🎥 Demio</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{timeAgo(c.createdAt)}</span>
                        <span>·</span>
                        <span className="text-whatsapp-green font-medium">{c.stats.sent} sent</span>
                        {c.stats.failed > 0 && <><span>·</span><span className="text-red-500">{c.stats.failed} failed</span></>}
                        <span>·</span>
                        <span>{c.stats.total} total</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id) }}
                        disabled={deleting === c.id}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-slate-100 px-6 py-5 space-y-4">
                      {c.aiPrompt && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">AI Prompt</p>
                          <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2">{c.aiPrompt}</p>
                        </div>
                      )}
                      {c.template && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Template</p>
                          <p className="text-sm text-slate-700 font-mono bg-slate-50 rounded-xl px-3 py-2 whitespace-pre-wrap">{c.template}</p>
                        </div>
                      )}
                      {c.demioLink && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Demio Link</p>
                          <a href={c.demioLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{c.demioLink}</a>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contacts</p>
                        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                          {c.contacts.map((contact, i) => (
                            <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-xs
                              ${contact.status === 'sent' ? 'border-whatsapp-green/30 bg-whatsapp-light/20' : 'border-red-200 bg-red-50'}`}>
                              <div className="mt-0.5 flex-shrink-0">
                                {contact.status === 'sent'
                                  ? <svg className="w-3.5 h-3.5 text-whatsapp-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                  : <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{contact.name || `Contact ${i + 1}`}</span>
                                  <span className="text-slate-400 font-mono">{contact.phone}</span>
                                </div>
                                <p className="text-slate-500 truncate mt-0.5">{contact.message}</p>
                                {contact.error && <p className="text-red-500 mt-0.5">{contact.error}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
