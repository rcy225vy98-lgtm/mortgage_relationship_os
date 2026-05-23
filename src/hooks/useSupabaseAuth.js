import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function useSupabaseAuth() {
  const [supabaseAuthEmail, setSupabaseAuthEmail] = useState('')
  const [supabaseAuthPassword, setSupabaseAuthPassword] = useState('')
  const [supabaseAuthMessage, setSupabaseAuthMessage] = useState('Not signed in')
  const [isSupabaseAuthLoading, setIsSupabaseAuthLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function checkSupabaseSession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error

        if (isMounted) {
          const email = data?.session?.user?.email
          setSupabaseAuthMessage(email ? `Signed in as ${email}` : 'Not signed in')
        }
      } catch (error) {
        console.error('Supabase session check failed:', error)
        if (isMounted) {
          setSupabaseAuthMessage(error.message || 'Unable to check Supabase session')
        }
      }
    }

    checkSupabaseSession()

    return () => {
      isMounted = false
    }
  }, [])

  async function signInToSupabase(event) {
    event.preventDefault()
    setIsSupabaseAuthLoading(true)
    setSupabaseAuthMessage('Signing in...')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: supabaseAuthEmail,
        password: supabaseAuthPassword,
      })

      if (error) throw error

      const email = data?.session?.user?.email || supabaseAuthEmail
      setSupabaseAuthMessage(`Signed in as ${email}`)
    } catch (error) {
      console.error('Supabase sign in failed:', error)
      setSupabaseAuthMessage(error.message || 'Supabase sign in failed')
    } finally {
      setIsSupabaseAuthLoading(false)
    }
  }

  async function createSupabaseAccount(event) {
    event.preventDefault()
    setIsSupabaseAuthLoading(true)
    setSupabaseAuthMessage('Creating account...')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: supabaseAuthEmail,
        password: supabaseAuthPassword,
      })

      if (error) throw error

      const email = data?.user?.email || supabaseAuthEmail
      setSupabaseAuthMessage(`Account created for ${email}. Check your email if Supabase requires confirmation, then sign in.`)
    } catch (error) {
      console.error('Supabase account creation failed:', error)
      setSupabaseAuthMessage(error.message || 'Supabase account creation failed')
    } finally {
      setIsSupabaseAuthLoading(false)
    }
  }

  async function signOutOfSupabase() {
    setIsSupabaseAuthLoading(true)
    setSupabaseAuthMessage('Signing out...')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      setSupabaseAuthMessage('Not signed in')
    } catch (error) {
      console.error('Supabase sign out failed:', error)
      setSupabaseAuthMessage(error.message || 'Supabase sign out failed')
    } finally {
      setIsSupabaseAuthLoading(false)
    }
  }

  return {
    supabaseAuthEmail,
    setSupabaseAuthEmail,
    supabaseAuthPassword,
    setSupabaseAuthPassword,
    supabaseAuthMessage,
    isSupabaseAuthLoading,
    signInToSupabase,
    createSupabaseAccount,
    signOutOfSupabase,
  }
}

export default useSupabaseAuth