'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { LinkedInProfile } from '@/lib/linkedin'

type LinkedInStatus = {
  configured: boolean
  connected: boolean
  profile: LinkedInProfile | null
}

export default function LinkedInPage() {
  const [status, setStatus] = useState<LinkedInStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = async () => {
    setLoading(true)
    const res = await fetch('/api/linkedin/status')
    const data = await res.json()
    setStatus(data)
    setLoading(false)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextError = params.get('error')
    if (nextError) setError(nextError)
    loadStatus()
  }, [])

  const disconnect = async () => {
    setDisconnecting(true)
    await fetch('/api/linkedin/disconnect', { method: 'POST' })
    setDisconnecting(false)
    await loadStatus()
  }

  const profile = status?.profile

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white font-bold">
            in
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">LinkedIn Connection</h1>
            <p className="text-xs text-slate-500">Connect your LinkedIn profile with official OAuth</p>
          </div>
          <nav className="ml-auto text-sm">
            <Link href="/" className="text-slate-500 hover:text-slate-800 font-medium transition">
              Back to campaigns
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin w-8 h-8 text-[#0A66C2]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-6">
              {!status?.configured && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Add <code className="rounded bg-amber-100 px-1">LINKEDIN_CLIENT_ID</code> and{' '}
                  <code className="rounded bg-amber-100 px-1">LINKEDIN_CLIENT_SECRET</code> in your environment first.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  LinkedIn connection failed: {error}
                </div>
              )}

              {status?.connected && profile ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    {profile.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.picture} alt="" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-semibold">
                        {(profile.name || profile.email || 'L').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{profile.name || 'LinkedIn profile'}</p>
                      {profile.email && <p className="text-sm text-slate-500 truncate">{profile.email}</p>}
                      <p className="text-xs text-[#0A66C2] mt-1">Connected</p>
                    </div>
                  </div>

                  <button
                    onClick={disconnect}
                    disabled={disconnecting}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-60"
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect LinkedIn'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Connect LinkedIn</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      This connects your LinkedIn identity through the official LinkedIn sign-in flow.
                    </p>
                  </div>

                  <a
                    href="/api/linkedin/start"
                    className={`block w-full py-3 rounded-xl text-center text-sm font-semibold text-white transition ${
                      status?.configured ? 'bg-[#0A66C2] hover:bg-[#004182]' : 'bg-slate-300 pointer-events-none'
                    }`}
                  >
                    Connect LinkedIn
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
