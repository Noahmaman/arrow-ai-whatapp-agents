import { readFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

const LOCAL_CSV_NAME = 'ARROW SALES P - Sheet1.csv'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), LOCAL_CSV_NAME)
    const csv = await readFile(filePath, 'utf8')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `inline; filename="${LOCAL_CSV_NAME}"`,
      },
    })
  } catch {
    return NextResponse.json(
      { error: `Could not find ${LOCAL_CSV_NAME} in the project folder.` },
      { status: 404 }
    )
  }
}
