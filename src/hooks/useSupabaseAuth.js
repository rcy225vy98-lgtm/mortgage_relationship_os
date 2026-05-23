import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function useSupabaseAuth() {
  const [supabaseAuthEmail, setSupabaseAuthEmail] = useState('')
  const [supabaseAuthPassword, setSupabaseAuthPassword] = useState('')
  const [supabaseAuthMessage, setSupabaseAuthMessage] = useState('Not signed in')
  const [isSupabaseAuthLoading, setIsSupabaseAuthLoading] = useState(false)
  const [supabaseSession, setSupabaseSession] = useState(null)
  const [supabaseUser, setSupabaseUser] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function checkSupabaseSession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error

        if (isMounted) {
          setSupabaseSession(data?.session || null)
          setSupabaseUser(data?.session?.user || null)
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return

      setSupabaseSession(session || null)
      setSupabaseUser(session?.user || null)
      setSupabaseAuthMessage(session?.user?.email ? `Signed in as ${session.user.email}` : 'Not signed in')
    })

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
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
      setSupabaseSession(data?.session || null)
      setSupabaseUser(data?.session?.user || null)
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

      setSupabaseSession(null)
      setSupabaseUser(null)
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
    supabaseSession,
    supabaseUser,
    isSupabaseSignedIn: Boolean(supabaseUser),
    signInToSupabase,
    createSupabaseAccount,
    signOutOfSupabase,
  }
}

export default useSupabaseAuth
