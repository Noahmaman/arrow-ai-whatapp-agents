import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function extractSpreadsheetId(input: string): string | null {
  // Accept raw ID or full URL
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (match) return match[1]
  // If it looks like a raw ID (no slashes)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim()
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetUrl, sheetName } = await request.json()

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Invalid Google Sheets URL or ID' },
        { status: 400 }
      )
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!email || !privateKey) {
      return NextResponse.json(
        { error: 'Google service account credentials are not configured. Check your .env.local file.' },
        { status: 500 }
      )
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const range = sheetName ? `${sheetName}` : 'Sheet1'

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })

    const rawRows = response.data.values || []

    if (rawRows.length === 0) {
      return NextResponse.json({ headers: [], data: [] })
    }

    const headers = rawRows[0].map((h: string) => String(h).trim())
    const data = rawRows.slice(1).map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((header: string, i: number) => {
        obj[header] = row[i] != null ? String(row[i]) : ''
      })
      return obj
    })

    return NextResponse.json({ headers, data, rowCount: data.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    // Friendly message for common Google API errors
    if (msg.includes('PERMISSION_DENIED') || msg.includes('not found')) {
      return NextResponse.json(
        { error: 'Sheet not found or service account does not have access. Make sure you shared the sheet with your service account email.' },
        { status: 403 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
