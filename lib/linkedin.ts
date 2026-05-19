import { cookies } from 'next/headers'

export type LinkedInProfile = {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  email_verified?: boolean
}

export const LINKEDIN_PROFILE_COOKIE = 'linkedin_profile'
export const LINKEDIN_ACCESS_TOKEN_COOKIE = 'linkedin_access_token'
export const LINKEDIN_STATE_COOKIE = 'linkedin_oauth_state'

export function getLinkedInConfig() {
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  }
}

export function encodeProfile(profile: LinkedInProfile) {
  return Buffer.from(JSON.stringify(profile), 'utf8').toString('base64url')
}

export function decodeProfile(value?: string): LinkedInProfile | null {
  if (!value) return null

  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as LinkedInProfile
  } catch {
    return null
  }
}

export async function getLinkedInProfile() {
  const cookieStore = await cookies()
  return decodeProfile(cookieStore.get(LINKEDIN_PROFILE_COOKIE)?.value)
}
