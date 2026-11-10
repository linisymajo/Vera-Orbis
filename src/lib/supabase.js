import { createClient } from '@supabase/supabase-js'


const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
  'https://placeholder.supabase.co'

const supabasePublishableKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY : undefined) ||
  'placeholder-publishable-key'


export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    db: { schema: 'public' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)
