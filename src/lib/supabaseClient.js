import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingConfigMessage =
  'Missing Supabase environment variables. Check that .env is in the project root and contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'

function createMissingConfigClient() {
  console.error(missingConfigMessage)

  return {
    auth: {
      async getSession() {
        return {
          data: { session: null },
          error: null,
        }
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        }
      },
      async signInWithPassword() {
        return {
          data: null,
          error: { message: missingConfigMessage },
        }
      },
      async signUp() {
        return {
          data: null,
          error: { message: missingConfigMessage },
        }
      },
      async signOut() {
        return { error: null }
      },
    },
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMissingConfigClient()