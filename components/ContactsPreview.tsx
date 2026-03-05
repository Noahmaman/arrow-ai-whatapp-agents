'use client'

import { useState } from 'react'
import type { SheetRow, SendResult } from '@/app/page'

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

export default function ContactsPreview({ rows, phoneColumn, template, perContactMessages, onSend, onBack }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set(rows.map((_, i) => i)))
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Preview & select recipients</h2>
            <p className="text-slate-500 text-sm mt-1">
              {selected.size} of {rows.length} contacts selected
              {perContactMessages && <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">AI-personalised</span>}
            </p>
          </div>
          <button onClick={toggleAll} className="text-xs text-whatsapp-teal font-medium hover:underline">
            {selected.size === rows.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin pr-1">
          {rows.map((row, i) => {
            const phone = row[phoneColumn] || '—'
            const message = getMessage(row, i)
            const isSelected = selected.has(i)
            const isActive = activeIdx === i

            return (
              <div key={i} className={`rounded-xl border transition cursor-pointer
                ${isSelected ? 'border-whatsapp-green/50 bg-whatsapp-light/30' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                <div className="flex items-center gap-3 px-4 py-3" onClick={() => toggle(i)}>
                  <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition
                    ${isSelected ? 'bg-whatsapp-green border-whatsapp-green' : 'border-slate-300 bg-white'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-whatsapp-dark to-whatsapp-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(Object.values(row)[0] || '?').toString().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{Object.values(row)[0] || `Row ${i + 1}`}</span>
                      <span className="text-xs text-slate-400 font-mono flex-shrink-0">{phone}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{message}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setActiveIdx(isActive ? null : i) }}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition">
                    <svg className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {isActive && (
                  <div className="px-4 pb-4">
                    <div className="bg-whatsapp-light rounded-xl rounded-tl-none px-3 py-2.5 text-sm text-slate-800 whitespace-pre-wrap border border-whatsapp-green/20 ml-16">
                      {message}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">Back</button>
          <button onClick={handleSend} disabled={selected.size === 0}
            className="flex-1 py-2.5 bg-whatsapp-green hover:bg-whatsapp-teal text-white rounded-xl font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Send to {selected.size} contact{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
