export type SheetRow = Record<string, string>

export type SendResult = {
  row: SheetRow
  phone: string
  message: string
  status: 'pending' | 'sending' | 'sent' | 'error'
  error?: string
  messageId?: string
}
