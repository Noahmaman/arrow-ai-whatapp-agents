import { NextResponse } from 'next/server'
import {
  LINKEDIN_ACCESS_TOKEN_COOKIE,
  LINKEDIN_PROFILE_COOKIE,
  LINKEDIN_STATE_COOKIE,
} from '@/lib/linkedin'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(LINKEDIN_ACCESS_TOKEN_COOKIE)
  response.cookies.delete(LINKEDIN_PROFILE_COOKIE)
  response.cookies.delete(LINKEDIN_STATE_COOKIE)
  return response
}
