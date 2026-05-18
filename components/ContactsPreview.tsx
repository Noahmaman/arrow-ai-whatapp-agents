'use client'

import { useState, useEffect } from 'react'
import type { SheetRow, SendResult } from '@/lib/types'

type ValidationState = 'unknown' | 'checking' | 'valid' | 'invalid'

type Props = {
  rows: SheetRow[]
  phoneColumn: string
  template?: string
  perContactMessages?: string[]
  onSend: (results: SendResult[]) => void
  onBack: () => void
}

function renderMessage(template: string, row: SheetRow): string {
  return Object.entries(row).reduce((msg, [k, v]) => msg.replaceAll(`{{${k}}}`, v), template)
}

function getValidationPill(state: ValidationState) {
  if (state === 'valid') {
    return <span className="inline-flex px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-[11px] font-medium">On WhatsApp</span>
  }
  if (state === 'invalid') {
    return <span className="inline-flex px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium">Not found</span>
  }
  if (state === 'checking') {
    return <span className="inline-flex px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">Checking...</span>
  }
  return <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-medium">Not checked</span>
}

export default function ContactsPreview({ rows, phoneColumn, template, perContactMessages, onSend, onBack }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(rows.map((_, i) => i)))
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [checkingNumbers, setCheckingNumbers] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [validationMap, setValidationMap] = useState<Record<number, ValidationState>>(
    Object.fromEntries(rows.map((_, i) => [i, 'unknown' satisfies ValidationState]))
  )

  // Auto-check numbers as soon as the step loads
  useEffect(() => {
    if (rows.length > 0) handleCheckNumbers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getMessage = (row: SheetRow, i: number) =>
    perContactMessages ? (perContactMessages[i] ?? '') : renderMessage(template ?? '', row)

  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)))

  const toggle = (i: number) => {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    setSelected(next)
  }

  const handleSend = () => {
    const prepared: SendResult[] = [...selected].sort((a, b) => a - b).map((i) => ({
      row: rows[i],
      phone: rows[i][phoneColumn] || '',
      message: getMessage(rows[i], i),
      status: 'pending',
    }))
    onSend(prepared)
  }

  const handleCheckNumbers = async () => {
    setCheckingNumbers(true)
    setValidationError('')
    setValidationMap(Object.fromEntries(rows.map((_, i) => [i, 'checking' satisfies ValidationState])))

    try {
      const res = await fetch('/api/whatsapp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: rows.map((row) => row[phoneColumn] || '') }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Unable to validate numbers')
      }

      const nextMap: Record<number, ValidationState> = {}
      const nextSelected = new Set<number>()

      rows.forEach((_, i) => {
        const exists = Boolean(json.results?.[i]?.exists)
        nextMap[i] = exists ? 'valid' : 'invalid'
        if (exists) nextSelected.add(i)
      })

      setValidationMap(nextMap)
      setSelected(nextSelected)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to validate numbers'
      setValidationError(message)
      setValidationMap(Object.fromEntries(rows.map((_, i) => [i, 'unknown' satisfies ValidationState])))
    } finally {
      setCheckingNumbers(false)
    }
  }

  const validCount = Object.values(validationMap).filter((state) => state === 'valid').length
  const invalidCount = Object.values(validationMap).filter((state) => state === 'invalid').length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Check numbers before sending</h2>
            <p className="text-slate-500 text-sm mt-1">
              Review the sheet like a mini Excel table, verify WhatsApp availability, then select the rows you want.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {selected.size} selected
              </span>
              <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                {validCount} valid
              </span>
              <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                {invalidCount} invalid
              </span>
              {perContactMessages && (
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  AI-personalised
                </span>
              )}
            </div>
            {validationError && <p className="text-xs text-red-600 mt-3">{validationError}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCheckNumbers}
              disabled={checkingNumbers || rows.length === 0}
              className="px-4 py-2 rounded-xl border border-whatsapp-green/30 text-whatsapp-teal text-sm font-medium hover:bg-whatsapp-light/40 transition disabled:opacity-50"
            >
              {checkingNumbers ? 'Checking WhatsApp...' : 'Check numbers on WhatsApp'}
            </button>
            <button
              onClick={toggleAll}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
            >
              {selected.size === rows.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-500">
                  <th className="w-14 px-4 py-3 font-medium">Send</th>
                  <th className="w-16 px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="min-w-[380px] px-4 py-3 font-medium">Message preview</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const phone = row[phoneColumn] || '—'
                  const message = getMessage(row, i)
                  const isSelected = selected.has(i)
                  const validation = validationMap[i] ?? 'unknown'
                  const isExpanded = activeIdx === i
                  const displayName = String(Object.values(row)[0] || `Row ${i + 1}`)

                  return (
                    <tr
                      key={i}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-b border-slate-100 align-top`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggle(i)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            isSelected ? 'bg-whatsapp-green border-whatsapp-green' : 'bg-white border-slate-300'
                          }`}
                          title={isSelected ? 'Unselect row' : 'Select row'}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{displayName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-500">{phone}</div>
                      </td>
                      <td className="px-4 py-3">{getValidationPill(validation)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setActiveIdx(isExpanded ? null : i)}
                          className="w-full text-left"
                        >
                          <div className="text-slate-600 truncate">{message}</div>
                          <div className="mt-1 text-xs text-whatsapp-teal font-medium">
                            {isExpanded ? 'Hide full message' : 'Show full message'}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-3 bg-whatsapp-light rounded-xl px-3 py-2.5 text-sm text-slate-800 whitespace-pre-wrap border border-whatsapp-green/20">
                            {message}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
          >
            Back
          </button>
          <button
            onClick={handleSend}
            disabled={selected.size === 0}
            className="flex-1 py-2.5 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl font-medium text-sm transition disabled:opacity-50"
          >
            Send to {selected.size} contact{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
