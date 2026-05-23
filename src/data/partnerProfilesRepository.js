

async function getSupabaseClient() {
  const { supabase } = await import('../lib/supabaseClient')

  if (!supabase?.auth || !supabase?.from) {
    throw new Error('Supabase is not configured correctly. Check your .env file and restart npm run dev.')
  }

  return supabase
}

export function partnerProfileFromSupabase(row) {
  return {
    id: row.id,
    partnerName: row.partner_name || '',
    email: row.email || '',
    phone: row.phone || '',
    brokerage: row.brokerage || '',
    notes: row.notes || '',
    touchHistory: Array.isArray(row.touch_history) ? row.touch_history : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function partnerProfileToSupabase(profile, userId) {
  return {
    user_id: userId,
    partner_name: profile.partnerName || profile.partner || profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    brokerage: profile.brokerage || '',
    notes: profile.notes || '',
    touch_history: Array.isArray(profile.touchHistory) ? profile.touchHistory : [],
    updated_at: new Date().toISOString(),
  }
}

export async function getCurrentUser() {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data.user
}

export async function loadPartnerProfiles() {
  const user = await getCurrentUser()
  const supabase = await getSupabaseClient()

  if (!user?.id) {
    throw new Error('You must be signed in before loading partner profiles.')
  }

  const { data, error } = await supabase
    .from('partner_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('partner_name', { ascending: true })

  if (error) throw error

  return (data || []).map(partnerProfileFromSupabase)
}

export async function savePartnerProfile(profile) {
  const user = await getCurrentUser()

  if (!user?.id) {
    throw new Error('You must be signed in before saving partner profiles.')
  }

  const supabase = await getSupabaseClient()
  const record = partnerProfileToSupabase(profile, user.id)

  if (!record.partner_name) {
    throw new Error('Partner name is required before saving a partner profile.')
  }

  const { data, error } = await supabase
    .from('partner_profiles')
    .upsert(record, { onConflict: 'user_id,partner_name' })
    .select('*')
    .single()

  if (error) throw error

  return partnerProfileFromSupabase(data)
}

export async function savePartnerProfiles(partnerProfilesByName) {
  const user = await getCurrentUser()

  if (!user?.id) {
    throw new Error('You must be signed in before saving partner profiles.')
  }

  const supabase = await getSupabaseClient()
  const profiles = Object.entries(partnerProfilesByName || {})
    .map(([partnerName, profile]) => ({
      ...profile,
      partnerName: profile.partnerName || partnerName,
    }))
    .filter((profile) => profile.partnerName)

  if (!profiles.length) return []

  const records = profiles.map((profile) => partnerProfileToSupabase(profile, user.id))

  const { data, error } = await supabase
    .from('partner_profiles')
    .upsert(records, { onConflict: 'user_id,partner_name' })
    .select('*')

  if (error) throw error

  return (data || []).map(partnerProfileFromSupabase)
}

export function partnerProfilesArrayToMap(profiles) {
  return (profiles || []).reduce((profileMap, profile) => {
    if (!profile.partnerName) return profileMap

    profileMap[profile.partnerName] = profile
    return profileMap
  }, {})
}
