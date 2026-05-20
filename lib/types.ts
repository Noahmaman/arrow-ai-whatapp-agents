export type SheetRow = Record<string, string>

export type SendResult = {
  row: SheetRow
  phone: string
  message: string
  status: 'pending' | 'sending' | 'sent' | 'error'
  error?: string
  messageId?: string
}

export type DeliverySettings = {
  minDelaySeconds: number
  maxDelaySeconds: number
  cooldownAfterMessages: number
  cooldownMinutes: number
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  minDelaySeconds: 75,
  maxDelaySeconds: 180,
  cooldownAfterMessages: 10,
  cooldownMinutes: 8,
}
