'use client'

import { useState } from 'react'
import Link from 'next/link'
import StepIndicator from '@/components/StepIndicator'
import DataTable from '@/components/DataTable'
import MessageTemplate, { type TemplateOutput } from '@/components/MessageTemplate'
import ContactsPreview from '@/components/ContactsPreview'
import SendProgress from '@/components/SendProgress'

export type SheetRow = Record<string, string>

export type SendResult = {
  row: SheetRow
  phone: string
  message: string
  status: 'pending' | 'sending' | 'sent' | 'error'
  error?: string
  messageId?: string
}

const STEPS = ['Contacts', 'Message', 'Preview', 'Send']

export default function Home() {
  const [step, setStep] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<SheetRow[]>([])
  const [phoneColumn, setPhoneColumn] = useState('')
  const [templateOutput, setTemplateOutput] = useState<TemplateOutput | null>(null)
  const [results, setResults] = useState<SendResult[]>([])

  const handleDataLoaded = (h: string[], r: SheetRow[], phoneCol: string) => {
    setHeaders(h); setRows(r); setPhoneColumn(phoneCol); setStep(1)
  }

  const handleTemplateReady = (output: TemplateOutput) => {
    setTemplateOutput(output); setStep(2)
  }

  const handleStartSend = (prepared: SendResult[]) => {
    setResults(prepared); setStep(3)
  }

  const handleReset = () => {
    setStep(0); setHeaders([]); setRows([]); setPhoneColumn(''); setTemplateOutput(null); setResults([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-whatsapp-green flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">WhatsApp Automation</h1>
            <p className="text-xs text-slate-500">Personalised messages at scale</p>
          </div>
          <nav className="ml-auto flex items-center gap-3">
            {step > 0 && (
              <button onClick={handleReset} className="text-sm text-slate-400 hover:text-slate-600 transition">Start over</button>
            )}
            <Link href="/history" className="text-sm text-slate-500 hover:text-slate-700 transition font-medium px-3 py-2 rounded-lg hover:bg-slate-100">
              History
            </Link>
            <Link href="/connect"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-whatsapp-green/40 text-whatsapp-dark hover:bg-whatsapp-light/50 transition text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-whatsapp-green" />
              Connect WhatsApp
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <StepIndicator steps={STEPS} current={step} />
        <div className="mt-8">
          {step === 0 && <DataTable onLoaded={handleDataLoaded} />}
          {step === 1 && (
            <MessageTemplate
              headers={headers}
              rows={rows}
              onNext={handleTemplateReady}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && templateOutput && (
            <ContactsPreview
              rows={rows}
              phoneColumn={phoneColumn}
              template={templateOutput.template}
              perContactMessages={templateOutput.messages}
              onSend={handleStartSend}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && templateOutput && (
            <SendProgress
              results={results}
              campaignMeta={{ mode: templateOutput.mode, template: templateOutput.template, aiPrompt: templateOutput.aiPrompt, demioLink: templateOutput.demioLink }}
              onReset={handleReset}
            />
          )}
        </div>
      </main>
    </div>
  )
}
