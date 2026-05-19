'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { WAStatus } from '@/lib/whatsapp-client'

type PollData = {
  status: WAStatus
  qrImage?: string
  error?: string
  details?: string
  configured?: boolean
}

const STATUS_LABEL: Record<WAStatus, string> = {
  idle: 'Not connected',
  loading: 'Starting WhatsApp…',
  qr: 'Scan the QR code',
  authenticated: 'Authenticated, loading…',
  ready: 'Connected!',
  disconnected: 'Disconnected',
}

const STATUS_COLOR: Record<WAStatus, string> = {
  idle: 'text-slate-500',
  loading: 'text-amber-500',
  qr: 'text-blue-600',
  authenticated: 'text-amber-500',
  ready: 'text-whatsapp-green',
  disconnected: 'text-red-500',
}

export default function ConnectPage() {
  const [data, setData] = useState<PollData>({ status: 'idle' })
  const [starting, setStarting] = useState(false)
  const [actionError, setActionError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      const json: PollData = await res.json()
      setData(json)
      if (json.error) setActionError(json.details || json.error)
      // Stop polling once ready or disconnected (user can restart)
      if (json.status === 'ready' || json.status === 'idle' || json.configured === false) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } catch {
      setActionError('Unable to reach the WhatsApp status API.')
    }
  }

  // Poll while the component is mounted if already in-flight
  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const startConnect = async () => {
    setStarting(true)
    setActionError('')
    try {
      const res = await fetch('/api/whatsapp/init', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.details || json.error || 'Unable to start WhatsApp.')
      }
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(poll, 2000)
      await poll()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to start WhatsApp.')
    } finally {
      setStarting(false)
    }
  }

  const disconnect = async () => {
    setActionError('')
    try {
      const res = await fetch('/api/whatsapp/init', { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.details || json.error || 'Unable to disconnect WhatsApp.')
      }
      setData({ status: 'idle' })
      if (intervalRef.current) clearInterval(intervalRef.current)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to disconnect WhatsApp.')
    }
  }

  const { status, qrImage } = data
  const isActive = status === 'loading' || status === 'qr' || status === 'authenticated'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-whatsapp-green flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">WhatsApp Automation</h1>
            <p className="text-xs text-slate-500">Connect your WhatsApp account</p>
          </div>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-500 hover:text-whatsapp-dark transition font-medium">
              ← Back to campaigns
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">

          {/* Status pill */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6
            ${status === 'ready' ? 'bg-whatsapp-light text-whatsapp-dark border border-whatsapp-green/30' : 'bg-slate-100 text-slate-600 border border-slate-200'}
          `}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              status === 'ready' ? 'bg-whatsapp-green' :
              isActive ? 'bg-amber-400 animate-pulse' :
              status === 'disconnected' ? 'bg-red-400' : 'bg-slate-400'
            }`} />
            <span className={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</span>
          </div>

          {(actionError || data.error) && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left">
              <p className="text-sm font-medium text-red-700">{data.error || 'Connection error'}</p>
              <p className="mt-1 text-xs text-red-600">{actionError || data.details}</p>
              {data.configured === false && (
                <p className="mt-2 text-xs text-red-600">
                  Deploy <code className="rounded bg-red-100 px-1">whatsapp-service</code>, add its URL as{' '}
                  <code className="rounded bg-red-100 px-1">WHATSAPP_SERVICE_URL</code> in Vercel, then redeploy.
                </p>
              )}
            </div>
          )}

          {/* QR Code */}
          {status === 'qr' && qrImage && (
            <div className="mb-6">
              <div className="inline-block p-3 bg-white border-2 border-whatsapp-green/30 rounded-2xl shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImage} alt="WhatsApp QR code" className="w-56 h-56" />
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Open WhatsApp on your phone →{' '}
                <span className="font-medium">Settings → Linked Devices → Link a device</span>
              </p>
            </div>
          )}

          {/* Loading spinner */}
          {(status === 'loading' || status === 'authenticated') && (
            <div className="mb-6 flex flex-col items-center gap-3">
              <svg className="animate-spin w-10 h-10 text-whatsapp-teal" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-500">
                {status === 'loading' ? 'Starting browser session, this takes ~10 seconds…' : 'Finishing authentication…'}
              </p>
            </div>
          )}

          {/* Connected state */}
          {status === 'ready' && (
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-whatsapp-light flex items-center justify-center">
                <svg className="w-8 h-8 text-whatsapp-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-600 text-sm">
                WhatsApp is connected and ready to send messages.
              </p>
              <Link
                href="/"
                className="px-6 py-2.5 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition"
              >
                Go send messages →
              </Link>
            </div>
          )}

          {/* Idle / disconnected state */}
          {(status === 'idle' || status === 'disconnected') && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-400">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <p className="text-slate-600 text-sm mb-1">
                {status === 'disconnected' ? 'Your session was disconnected.' : 'Connect your personal WhatsApp account to send messages.'}
              </p>
              <p className="text-slate-400 text-xs">Uses WhatsApp Web — no Business API required.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {(status === 'idle' || status === 'disconnected') && (
              <button
                onClick={startConnect}
                disabled={starting}
                className="w-full py-3 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {starting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting…
                  </>
                ) : (
                  'Connect WhatsApp'
                )}
              </button>
            )}

            {status === 'ready' && (
              <button
                onClick={disconnect}
                className="w-full py-2.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* How it works */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How it works</p>
            <ol className="space-y-2 text-xs text-slate-500 list-decimal list-inside">
              <li>Click <strong>Connect WhatsApp</strong> — a browser session starts in the background</li>
              <li>Scan the QR code with your phone (WhatsApp → Settings → Linked Devices)</li>
              <li>Once connected, go back and send your campaign — messages are sent from your account</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  )
}
