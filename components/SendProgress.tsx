'use client'

import { useRef, useState } from 'react'
import { DEFAULT_DELIVERY_SETTINGS, type DeliverySettings, type SendResult } from '@/lib/types'

type Props = {
  results: SendResult[]
  campaignMeta: { mode: 'manual' | 'ai'; template?: string; aiPrompt?: string; demioLink?: string }
  deliverySettings?: DeliverySettings
  onReset: () => void
}

// Rows to show in the live feed (tail of processed contacts)
const VISIBLE_ROWS = 40

function randomDelayMs(settings: DeliverySettings) {
  const min = Math.max(1, settings.minDelaySeconds) * 1000
  const max = Math.max(min, settings.maxDelaySeconds * 1000)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatDuration(ms: number) {
  const seconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest}s`
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`
}

export default function SendProgress({ results: initial, campaignMeta, deliverySettings = DEFAULT_DELIVERY_SETTINGS, onReset }: Props) {
  const total = initial.length

  // All results live in a ref — no re-render cost on every update
  const resultsRef = useRef<SendResult[]>(initial.map((r) => ({ ...r })))
  const stopRef = useRef(false)

  // Lightweight counters + visible slice for rendering
  const [sent, setSent] = useState(0)
  const [failed, setFailed] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [waitLabel, setWaitLabel] = useState('')
  // Rendered rows: only last VISIBLE_ROWS processed entries
  const [visibleRows, setVisibleRows] = useState<SendResult[]>([])

  const progress = Math.round(((sent + failed) / total) * 100)

  const saveCampaign = async () => {
    try {
      const allResults = resultsRef.current
      const contacts = allResults.map((r) => ({
        name: String(Object.values(r.row)[0] || ''),
        phone: r.phone,
        message: r.message,
        status: r.status === 'sent' ? 'sent' : 'error',
        error: r.error,
        messageId: r.messageId,
      }))
      const sentCount = contacts.filter((c) => c.status === 'sent').length
      const failedCount = contacts.filter((c) => c.status === 'error').length
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
          stats: { total, sent: sentCount, failed: failedCount },
        }),
      })
      setSaved(true)
    } catch { /* non-critical */ }
  }

  // Flush visible rows from the ref (last VISIBLE_ROWS processed)
  const flushVisible = (upTo: number) => {
    const processed = resultsRef.current.slice(0, upTo + 1)
    const tail = processed.slice(-VISIBLE_ROWS)
    setVisibleRows([...tail])
  }

  const startSending = async () => {
    if (started || running) return

    setStarted(true)
    setRunning(true)
    stopRef.current = false
    let localSent = 0
    let localFailed = 0

    for (let i = 0; i < total; i++) {
      if (stopRef.current) break

      setCurrentIndex(i)
      resultsRef.current[i] = { ...resultsRef.current[i], status: 'sending' }
      flushVisible(i)

      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: initial[i].phone, message: initial[i].message }),
        })
        const data = await res.json()
        if (data.error) {
          resultsRef.current[i] = { ...resultsRef.current[i], status: 'error', error: data.error }
          localFailed++
          setFailed(localFailed)
        } else {
          resultsRef.current[i] = { ...resultsRef.current[i], status: 'sent', messageId: data.messageId }
          localSent++
          setSent(localSent)
        }
      } catch (e) {
        resultsRef.current[i] = { ...resultsRef.current[i], status: 'error', error: e instanceof Error ? e.message : 'Network error' }
        localFailed++
        setFailed(localFailed)
      }

      flushVisible(i)

      if (i < total - 1 && !stopRef.current) {
        const sentInCurrentRun = localSent + localFailed
        const cooldownAfter = Math.max(1, deliverySettings.cooldownAfterMessages)
        const isCooldownTurn = sentInCurrentRun > 0 && sentInCurrentRun % cooldownAfter === 0
        const delay = isCooldownTurn ? Math.max(1, deliverySettings.cooldownMinutes) * 60_000 : randomDelayMs(deliverySettings)
        setWaitLabel(
          isCooldownTurn
            ? `Batch cooldown: waiting ${formatDuration(delay)} before the next send`
            : `Random safety delay: next send in ${formatDuration(delay)}`
        )
        await new Promise((r) => setTimeout(r, delay))
        setWaitLabel('')
      }
    }

    setRunning(false)
    flushVisible(total - 1)
    await saveCampaign()
  }

  const StatusIcon = ({ status }: { status: SendResult['status'] }) => {
    if (status === 'sending') return (
      <svg className="animate-spin w-4 h-4 text-whatsapp-teal flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )
    if (status === 'sent') return (
      <svg className="w-4 h-4 text-whatsapp-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    )
    if (status === 'error') return (
      <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
    return <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
  }

  const remaining = total - sent - failed

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {!started ? 'Ready to send' : running ? `Sending messages… (${currentIndex + 1} / ${total})` : 'Done!'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {sent} sent · {failed} failed · {!started ? `${total} queued` : running ? `${remaining} remaining` : 'complete'}
            </p>
            {running && waitLabel && (
              <p className="text-xs text-amber-600 mt-1">{waitLabel}</p>
            )}
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

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{progress}%</span>
            <span>{sent + failed} / {total}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-whatsapp-green rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live feed — last VISIBLE_ROWS contacts only */}
        {total > VISIBLE_ROWS && running && (
          <p className="text-xs text-slate-400 mb-2">
            Showing last {VISIBLE_ROWS} of {total} contacts — {total - VISIBLE_ROWS - Math.max(0, currentIndex - VISIBLE_ROWS)} not yet shown
          </p>
        )}
        <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
          {visibleRows.map((r, i) => (
            <div key={`${r.phone}-${i}`} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition
              ${r.status === 'sent' ? 'border-whatsapp-green/30 bg-whatsapp-light/20' : ''}
              ${r.status === 'error' ? 'border-red-200 bg-red-50' : ''}
              ${r.status === 'sending' ? 'border-whatsapp-teal/40 bg-blue-50/30' : ''}
              ${r.status === 'pending' ? 'border-slate-200 bg-slate-50' : ''}`}>
              <div className="mt-0.5"><StatusIcon status={r.status} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {Object.values(r.row)[0] || `Contact`}
                  </span>
                  <span className="text-xs text-slate-400 font-mono flex-shrink-0">{r.phone}</span>
                </div>
                {r.status === 'error' && r.error && (
                  <p className="text-xs text-red-600 mt-0.5">{r.error}</p>
                )}
                {r.status === 'sent' && r.messageId && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {r.messageId}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!started && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nothing is sent automatically. Review the queue, then click Start sending once.
          </div>
        )}

        <div className="mt-6 flex gap-3 items-center">
          {!started ? (
            <button
              onClick={startSending}
              className="flex-1 py-2.5 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition"
            >
              Start sending {total} message{total !== 1 ? 's' : ''}
            </button>
          ) : running ? (
            <button
              onClick={() => { stopRef.current = true; setRunning(false) }}
              className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
            >
              Stop sending
            </button>
          ) : (
            <>
              {failed > 0 && (
                <p className="flex-1 text-xs text-red-600">
                  {failed} message{failed !== 1 ? 's' : ''} failed — check errors above.
                </p>
              )}
              <a
                href="/history"
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              >
                View history
              </a>
              <button
                onClick={onReset}
                className="px-5 py-2.5 bg-whatsapp-dark hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition"
              >
                New campaign
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
