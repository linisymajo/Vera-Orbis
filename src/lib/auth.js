import { supabase } from './supabase.js'

export const PRODUCTION_DOMAIN = 'https://veraorbis.studio'

export function getAuthRedirectUrl(path = '/onboarding.html') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  // 1. Check if explicitly configured via environment variable
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_REDIRECT_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_AUTH_REDIRECT_URL)

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '')
    return `${trimmed}${cleanPath}`
  }

  // 2. In browser: preserve localhost during local development
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `${origin}${cleanPath}`
    }
    if (origin.startsWith('https://')) {
      return `${origin}${cleanPath}`
    }
  }

  // 3. Default to verified production domain
  return `${PRODUCTION_DOMAIN}${cleanPath}`
}

export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      // If server verification encountered an issue, check cached local session
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user) {
          return sessionData.session.user
        }
      } catch {}

      console.error('Unable to read the current session:', error.message)
      return null
    }

    return user
  } catch (err) {
    console.error('Exception reading user session:', err)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session?.user) {
        return sessionData.session.user
      }
    } catch {}
    return null
  }
}

export async function getStudentProfile(providedUserId = null) {
  const userId = providedUserId || (await getCurrentUser())?.id

  if (!userId) {
    return null
  }

  try {
    const {
      data,
      error
    } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Unable to load the student profile:', error.message)
      return null
    }

    return data || null
  } catch (err) {
    console.error('Exception loading student profile:', err)
    return null
  }
}

export function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
