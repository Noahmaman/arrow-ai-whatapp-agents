'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SheetRow } from '@/app/page'

type Props = {
  onLoaded: (headers: string[], rows: SheetRow[], phoneColumn: string) => void
}

const DEFAULT_COLS = ['Name', 'Phone', 'Company', 'Email']
const EMPTY_ROWS = 6

function makeEmpty(cols: string[], numRows: number): string[][] {
  return Array.from({ length: numRows }, () => Array(cols.length).fill(''))
}

export default function DataTable({ onLoaded }: Props) {
  const [headers, setHeaders] = useState<string[]>(DEFAULT_COLS)
  const [rows, setRows] = useState<string[][]>(makeEmpty(DEFAULT_COLS, EMPTY_ROWS))
  const [phoneCol, setPhoneCol] = useState(1) // default = 'Phone' column index
  const [error, setError] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null)

  // ── Paste handler ──────────────────────────────────────────────────────────
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text')
    if (!text) return
    e.preventDefault()

    const parsed = text
      .split('\n')
      .map((r) => r.replace(/\r$/, '').split('\t'))
      .filter((r) => r.some((c) => c.trim()))

    if (parsed.length === 0) return

    // If first row looks like headers (non-numeric), use as headers
    const firstRow = parsed[0]
    const looksLikeHeader = firstRow.every((c) => isNaN(Number(c)) || c.trim() === '')

    let newHeaders = headers
    let dataRows = parsed

    if (looksLikeHeader && parsed.length > 1) {
      newHeaders = firstRow.map((h) => h.trim() || `Col${firstRow.indexOf(h) + 1}`)
      dataRows = parsed.slice(1)
    }

    // Pad or trim columns
    const colCount = Math.max(newHeaders.length, ...dataRows.map((r) => r.length))
    const paddedHeaders = [...newHeaders, ...Array(Math.max(0, colCount - newHeaders.length)).fill('')].slice(0, colCount)
    const paddedRows = dataRows.map((r) => [...r, ...Array(Math.max(0, colCount - r.length)).fill('')].slice(0, colCount))

    // Ensure at least EMPTY_ROWS
    while (paddedRows.length < EMPTY_ROWS) paddedRows.push(Array(colCount).fill(''))

    setHeaders(paddedHeaders)
    setRows(paddedRows)

    // Auto-detect phone column
    const phoneIdx = paddedHeaders.findIndex((h) => /phone|mobile|tel|whatsapp/i.test(h))
    setPhoneCol(phoneIdx >= 0 ? phoneIdx : 0)
  }, [headers])

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    el.addEventListener('paste', handlePaste as EventListener)
    return () => el.removeEventListener('paste', handlePaste as EventListener)
  }, [handlePaste])

  // ── Cell edit ──────────────────────────────────────────────────────────────
  const setCell = (r: number, c: number, val: string) => {
    setRows((prev) => {
      const next = prev.map((row) => [...row])
      next[r][c] = val
      return next
    })
  }

  const setHeader = (c: number, val: string) => {
    setHeaders((prev) => { const n = [...prev]; n[c] = val; return n })
  }

  // ── Add / remove ───────────────────────────────────────────────────────────
  const addRow = () => setRows((prev) => [...prev, Array(headers.length).fill('')])

  const removeRow = (i: number) => {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  const addCol = () => {
    const label = `Col${headers.length + 1}`
    setHeaders((prev) => [...prev, label])
    setRows((prev) => prev.map((r) => [...r, '']))
  }

  const removeCol = (c: number) => {
    if (headers.length <= 1) return
    setHeaders((prev) => prev.filter((_, i) => i !== c))
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== c)))
    if (phoneCol >= c) setPhoneCol(Math.max(0, phoneCol - 1))
  }

  // ── Proceed ────────────────────────────────────────────────────────────────
  const handleNext = () => {
    setError('')
    const dataRows = rows.filter((r) => r.some((c) => c.trim()))
    if (dataRows.length === 0) {
      setError('Add at least one row of data before continuing.')
      return
    }
    const hasPhone = dataRows.every((r) => r[phoneCol]?.trim())
    if (!hasPhone) {
      setError(`Some rows are missing a value in the "${headers[phoneCol]}" column.`)
      return
    }
    const sheetRows: SheetRow[] = dataRows.map((r) => {
      const obj: SheetRow = {}
      headers.forEach((h, i) => { obj[h] = r[i] ?? '' })
      return obj
    })
    onLoaded(headers, sheetRows, headers[phoneCol])
  }

  const nonEmptyCount = rows.filter((r) => r.some((c) => c.trim())).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-800">Enter your contacts</h2>
          <p className="text-slate-500 text-sm mt-1">
            Type directly, or{' '}
            <span className="font-medium text-whatsapp-dark">copy cells from Google Sheets / Excel and paste here</span>{' '}
            — it auto-fills the table.
          </p>
        </div>

        {/* Paste hint */}
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
          <svg className="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Click anywhere on the table below, then press <kbd className="mx-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono">⌘V</kbd> to paste from Google Sheets or Excel
        </div>

        {/* Table */}
        <div
          ref={tableRef}
          tabIndex={0}
          className="focus:outline-none rounded-xl border border-slate-200 overflow-auto scrollbar-thin"
        >
          <table className="w-full border-collapse text-sm">
            {/* Header row */}
            <thead>
              <tr className="bg-slate-50">
                <th className="w-8 border-b border-r border-slate-200 text-slate-400 text-xs font-normal px-2">#</th>
                {headers.map((h, c) => (
                  <th key={c} className="border-b border-r border-slate-200 p-0 relative group">
                    <div className="flex items-center">
                      <input
                        value={h}
                        onChange={(e) => setHeader(c, e.target.value)}
                        className="w-full px-3 py-2 bg-transparent font-semibold text-slate-700 focus:outline-none focus:bg-whatsapp-light/40"
                        placeholder={`Col ${c + 1}`}
                      />
                      {headers.length > 1 && (
                        <button
                          onClick={() => removeCol(c)}
                          className="opacity-0 group-hover:opacity-100 pr-1 text-slate-400 hover:text-red-500 transition flex-shrink-0"
                          title="Remove column"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {/* Add column */}
                <th className="border-b border-slate-200 w-10">
                  <button
                    onClick={addCol}
                    className="w-full h-full flex items-center justify-center text-slate-400 hover:text-whatsapp-teal hover:bg-slate-100 py-2 px-3 transition"
                    title="Add column"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </th>
              </tr>
            </thead>

            {/* Data rows */}
            <tbody>
              {rows.map((row, r) => (
                <tr
                  key={r}
                  className={`group ${r % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-whatsapp-light/10`}
                >
                  <td className="border-r border-b border-slate-100 text-center text-xs text-slate-400 select-none w-8">
                    {r + 1}
                  </td>
                  {row.map((cell, c) => (
                    <td key={c} className="border-r border-b border-slate-100 p-0">
                      <input
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onFocus={() => setFocusedCell([r, c])}
                        onBlur={() => setFocusedCell(null)}
                        className={`w-full px-3 py-2 bg-transparent focus:outline-none focus:bg-whatsapp-light/40 focus:ring-1 focus:ring-inset focus:ring-whatsapp-green/50 min-w-[100px]
                          ${focusedCell?.[0] === r && focusedCell?.[1] === c ? 'bg-whatsapp-light/40' : ''}
                        `}
                      />
                    </td>
                  ))}
                  {/* Delete row */}
                  <td className="border-b border-slate-100">
                    <button
                      onClick={() => removeRow(r)}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-10 h-full py-2 text-slate-300 hover:text-red-500 transition"
                      title="Remove row"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row */}
        <button
          onClick={addRow}
          className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-whatsapp-teal transition px-2 py-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add row
        </button>

        {/* Phone column selector */}
        <div className="mt-5 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 flex-shrink-0">Phone number column:</label>
          <select
            value={phoneCol}
            onChange={(e) => setPhoneCol(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-whatsapp-green/40 bg-white"
          >
            {headers.map((h, i) => (
              <option key={i} value={i}>{h}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">Include country code, e.g. <code>15551234567</code></span>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleNext}
          className="mt-6 w-full py-3 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
        >
          Next: Write Message Template ({nonEmptyCount} contact{nonEmptyCount !== 1 ? 's' : ''})
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
