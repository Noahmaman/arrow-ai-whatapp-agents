'use client'

import { useState } from 'react'
import type { SheetRow } from '@/app/page'

type Props = {
  onLoaded: (headers: string[], rows: SheetRow[], phoneColumn: string) => void
}

export default function SheetConfig({ onLoaded }: Props) {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('')
  const [sheetName, setSheetName] = useState('Sheet1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<SheetRow[]>([])
  const [phoneColumn, setPhoneColumn] = useState('')
  const [rowCount, setRowCount] = useState(0)

  const fetchSheet = async () => {
    if (!spreadsheetUrl.trim()) {
      setError('Please enter a Google Sheets URL or ID')
      return
    }
    setLoading(true)
    setError('')
    setHeaders([])
    setRows([])

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetUrl: spreadsheetUrl.trim(), sheetName: sheetName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.headers.length === 0) throw new Error('Sheet appears to be empty. Make sure row 1 contains column headers.')

      setHeaders(data.headers)
      setRows(data.data)
      setRowCount(data.rowCount)
      // Auto-select phone column if one looks like a phone field
      const auto = data.headers.find((h: string) =>
        /phone|mobile|tel|whatsapp|número|numero/i.test(h)
      )
      setPhoneColumn(auto || data.headers[0])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch sheet')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (!phoneColumn) {
      setError('Please select which column contains phone numbers')
      return
    }
    onLoaded(headers, rows, phoneColumn)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800">Connect your Google Sheet</h2>
          <p className="text-slate-500 text-sm mt-1">
            Paste the URL of your sheet. Make sure row 1 has column headers (e.g. Name, Phone, Company).
          </p>
        </div>

        {/* Setup tip */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-800 mb-1">Before you start</p>
          <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
            <li>Create a Google Cloud service account and enable the Sheets API</li>
            <li>Download the JSON key and copy credentials to <code className="bg-amber-100 px-1 rounded">.env.local</code></li>
            <li>Share your Google Sheet with the service account email (Viewer role)</li>
          </ol>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Google Sheets URL or ID
            </label>
            <input
              type="text"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 focus:border-whatsapp-teal transition"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Sheet / Tab name
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Sheet1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 focus:border-whatsapp-teal transition"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchSheet}
                disabled={loading}
                className="px-5 py-2.5 bg-whatsapp-dark hover:bg-whatsapp-teal text-white rounded-xl text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  'Load Sheet'
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {headers.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-whatsapp-dark font-medium">
              <svg className="w-4 h-4 text-whatsapp-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Loaded {rowCount} contact{rowCount !== 1 ? 's' : ''} with {headers.length} column{headers.length !== 1 ? 's' : ''}
            </div>

            {/* Column chips */}
            <div className="flex flex-wrap gap-2">
              {headers.map((h) => (
                <span key={h} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono">
                  {h}
                </span>
              ))}
            </div>

            {/* Phone column selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Which column contains phone numbers?
              </label>
              <select
                value={phoneColumn}
                onChange={(e) => setPhoneColumn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 focus:border-whatsapp-teal transition bg-white"
              >
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Phone numbers should include country code, e.g. <code>15551234567</code> or <code>+15551234567</code>
              </p>
            </div>

            {/* Mini preview */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview (first 3 rows)</span>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2 text-slate-600 border-b border-slate-100 whitespace-nowrap max-w-xs truncate">
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-3 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
            >
              Next: Write Message Template
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
