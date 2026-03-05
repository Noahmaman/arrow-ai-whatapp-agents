import { NextRequest, NextResponse } from 'next/server'
import { listCampaigns, saveCampaign } from '@/lib/storage'

export async function GET() {
  const campaigns = listCampaigns()
  return NextResponse.json(campaigns)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const campaign = saveCampaign(body)
  return NextResponse.json(campaign)
}
