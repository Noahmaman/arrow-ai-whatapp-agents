import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getLinkedInConfig, LINKEDIN_STATE_COOKIE } from '@/lib/linkedin'

export async function GET(request: NextRequest) {
  const { clientId } = getLinkedInConfig()

  if (!clientId) {
    return NextResponse.json(
      { error: 'LINKEDIN_CLIENT_ID is not configured.' },
      { status: 500 }
    )
  }

  const origin = request.nextUrl.origin
  const state = crypto.randomBytes(24).toString('hex')
  const authorizationUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')

  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('client_id', clientId)
  authorizationUrl.searchParams.set('redirect_uri', `${origin}/api/linkedin/callback`)
  authorizationUrl.searchParams.set('scope', 'openid profile email')
  authorizationUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    maxAge: 10 * 60,
    path: '/',
  })

  return response
}
