'use client'

import { useEffect, useRef, useState } from 'react'
import type { SendResult } from '@/app/page'

type Props = {
  results: SendResult[]
  campaignMeta: { mode: 'manual' | 'ai'; template?: string; aiPrompt?: string; demioLink?: string }
  onReset: () => void
}

export default function SendProgress({ results: initial, campaignMeta, onReset }: Props) {
  const [results, setResults] = useState<SendResult[]>(initial)
  const [running, setRunning] = useState(true)
  const [saved, setSaved] = useState(false)
  const stopRef = useRef(false)

  const sent = results.filter((r) => r.status === 'sent').length
  const failed = results.filter((r) => r.status === 'error').length
  const total = results.length
  const progress = Math.round(((sent + failed) / total) * 100)

  const saveCampaign = async (finalResults: SendResult[]) => {
    try {
      const contacts = finalResults.map((r) => ({
        name: String(Object.values(r.row)[0] || ''),
        phone: r.phone,
        message: r.message,
        status: r.status === 'sent' ? 'sent' : 'error',
        error: r.error,
        messageId: r.messageId,
      }))
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Campaign – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          mode: campaignMeta.mode,
          template: campaignMeta.template,
          aiPrompt: campaignMeta.aiPrompt,
          demioLink: campaignMeta.demioLink,
          contacts,
          stats: { total, sent: contacts.filter((c) => c.status === 'sent').length, failed: contacts.filter((c) => c.status === 'error').length },
        }),
      })
      setSaved(true)
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      for (let i = 0; i < initial.length; i++) {
        if (cancelled || stopRef.current) break

        setResults((prev) => { const n = [...prev]; n[i] = { ...n[i], status: 'sending' }; return n })

        try {
          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: initial[i].phone, message: initial[i].message }),
          })
          const data = await res.json()
          setResults((prev) => {
            const n = [...prev]
            n[i] = data.error
              ? { ...n[i], status: 'error', error: data.error }
              : { ...n[i], status: 'sent', messageId: data.messageId }
            return n
          })
        } catch (e) {
          setResults((prev) => {
            const n = [...prev]
            n[i] = { ...n[i], status: 'error', error: e instanceof Error ? e.message : 'Network error' }
            return n
          })
        }

        if (i < initial.length - 1 && !cancelled && !stopRef.current) {
          await new Promise((r) => setTimeout(r, 1200))
        }
      }

      if (!cancelled) {
        setRunning(false)
        // Save campaign after completion
        setResults((finalResults) => {
          saveCampaign(finalResults)
          return finalResults
        })
      }
    }

    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const StatusIcon = ({ status }: { status: SendResult['status'] }) => {
    if (status === 'sending') return (
      <svg className="animate-spin w-4 h-4 text-whatsapp-teal" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
    if (status === 'sent') return (
      <svg className="w-4 h-4 text-whatsapp-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    )
    if (status === 'error') return (
      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
    return <div className="w-4 h-4 rounded-full bg-slate-200" />
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{running ? 'Sending messages…' : 'Done!'}</h2>
            <p className="text-slate-500 text-sm mt-1">{sent} sent · {failed} failed · {total - sent - failed} remaining</p>
          </div>
          {!running && saved && (
            <div className="flex items-center gap-1.5 text-xs text-whatsapp-dark bg-whatsapp-light px-3 py-1.5 rounded-full border border-whatsapp-green/30">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Campaign saved
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{progress}%</span><span>{sent + failed} / {total}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-whatsapp-green rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition
              ${r.status === 'sent' ? 'border-whatsapp-green/30 bg-whatsapp-light/20' : ''}
              ${r.status === 'error' ? 'border-red-200 bg-red-50' : ''}
              ${r.status === 'sending' ? 'border-whatsapp-teal/40 bg-blue-50/30' : ''}
              ${r.status === 'pending' ? 'border-slate-200 bg-slate-50' : ''}`}>
              <div className="mt-0.5 flex-shrink-0"><StatusIcon status={r.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">{Object.values(r.row)[0] || `Contact ${i + 1}`}</span>
                  <span className="text-xs text-slate-400 font-mono flex-shrink-0">{r.phone}</span>
                </div>
                {r.status === 'error' && r.error && <p className="text-xs text-red-600 mt-0.5">{r.error}</p>}
                {r.status === 'sent' && r.messageId && <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {r.messageId}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3 items-center">
          {running ? (
            <button onClick={() => { stopRef.current = true; setRunning(false) }}
              className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition">
              Stop sending
            </button>
          ) : (
            <>
              {failed > 0 && (
                <p className="flex-1 text-xs text-red-600">
                  {failed} message{failed !== 1 ? 's' : ''} failed — check errors above.
                </p>
              )}
              <a href="/history" className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                View history
              </a>
              <button onClick={onReset}
                className="px-5 py-2.5 bg-whatsapp-dark hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition">
                New campaign
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
