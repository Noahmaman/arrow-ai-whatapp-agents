import { NextRequest, NextResponse } from 'next/server'
import {
  encodeProfile,
  getLinkedInConfig,
  LINKEDIN_ACCESS_TOKEN_COOKIE,
  LINKEDIN_PROFILE_COOKIE,
  LINKEDIN_STATE_COOKIE,
  type LinkedInProfile,
} from '@/lib/linkedin'

type TokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get('error')
  if (error) {
    return NextResponse.redirect(new URL(`/linkedin?error=${encodeURIComponent(error)}`, request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(LINKEDIN_STATE_COOKIE)?.value

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/linkedin?error=invalid_state', request.url))
  }

  const { clientId, clientSecret } = getLinkedInConfig()
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/linkedin?error=missing_linkedin_credentials', request.url))
  }

  const origin = request.nextUrl.origin
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/linkedin/callback`,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  const tokenJson = await tokenResponse.json() as TokenResponse
  if (!tokenResponse.ok || !tokenJson.access_token) {
    const reason = tokenJson.error_description || tokenJson.error || 'token_exchange_failed'
    return NextResponse.redirect(new URL(`/linkedin?error=${encodeURIComponent(reason)}`, request.url))
  }

  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL('/linkedin?error=userinfo_failed', request.url))
  }

  const profile = await profileResponse.json() as LinkedInProfile
  const response = NextResponse.redirect(new URL('/linkedin?connected=1', request.url))
  const maxAge = tokenJson.expires_in ?? 60 * 60 * 24 * 30

  response.cookies.delete(LINKEDIN_STATE_COOKIE)
  response.cookies.set(LINKEDIN_PROFILE_COOKIE, encodeProfile(profile), {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    maxAge,
    path: '/',
  })
  response.cookies.set(LINKEDIN_ACCESS_TOKEN_COOKIE, tokenJson.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    maxAge,
    path: '/',
  })

  return response
}
