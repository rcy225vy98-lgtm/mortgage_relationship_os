const LEAD_APP_FIELDS = [
  'archived',
  'leadSource',
  'referralPartner',
  'source',
  'touchHistory',
  'coBorrower',
  'coBorrowerPhone',
  'coBorrowerEmail',
  'needsList',
  'manualTaskActive',
  'manualTaskChannel',
  'manualTaskNote',
  'manualTaskCreatedAt',
  'manualTaskCompletedAt',
  'dateReferred',
  'contractDate',
  'appraisalOrdered',
  'appraisalDueDate',
  'appraisalReceived',
  'appraisalNotes',
  'loanProgress',
  'pipelineStatus',
  'loanHubId',
  'loanHubEnabled',
  'hfgGoPortalUrl',
  'progressTrackerUrl',
  'strategyVideos',
  'nextBestStep',
  'importantDates',
  'propertyAddress',
  'purchasePrice',
  'loanOfficerPhone',
  'loanOfficerEmail',
  'loanOfficerCalendarUrl',
  'teamContacts',
  'partnerPhone',
  'partnerEmail',
  'tridReviewedAt',
  'tridReviewedForClosingDate',
]

function removeUndefinedValues(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
}

function normalizeDateField(value) {
  return value || null
}

function normalizeUuid(value) {
  const textValue = String(value || '')
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidPattern.test(textValue) ? textValue : undefined
}

export function leadFromSupabase(row) {
  const appData = row.app_data || {}

  return {
    ...appData,
    id: row.id,
    client: row.client || '',
    partner: row.partner || 'Self-Sourced',
    leadSource: row.lead_source || appData.leadSource || 'Referral Partner',
    phone: row.phone || '',
    email: row.email || '',
    brokerage: row.brokerage || '',
    leadType: row.lead_type || 'Buyer Lead',
    stage: row.stage || 'New Referral',
    status: row.status || row.stage || 'New Referral',
    referralDate: row.referral_date || '',
    loanAmount: Number(row.loan_amount) || 0,
    loanType: row.loan_type || '',
    interestRate: row.interest_rate || '',
    firstPaymentDate: row.first_payment_date || '',
    hasSecondLien: Boolean(row.has_second_lien),
    secondLienType: row.second_lien_type || '',
    secondLienAmount: Number(row.second_lien_amount) || 0,
    creditScore: row.credit_score || '',
    closingDate: row.closing_date || '',
    detail: row.detail || '',
    lastTouch: row.last_touch || '',
    nextAction: row.next_action || '',
    nextActionDate: row.next_action_date || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function leadToSupabase(lead, userId) {
  const appData = LEAD_APP_FIELDS.reduce((record, field) => {
    if (lead[field] !== undefined) {
      record[field] = lead[field]
    }

    return record
  }, {})

  return removeUndefinedValues({
    id: normalizeUuid(lead.id),
    user_id: userId,
    client: lead.client || '',
    partner: lead.partner || lead.referralPartner || lead.source || 'Self-Sourced',
    lead_source: lead.leadSource || lead.source || 'Referral Partner',
    phone: lead.phone || '',
    email: lead.email || '',
    brokerage: lead.brokerage || '',
    lead_type: lead.leadType || 'Buyer Lead',
    stage: lead.stage || 'New Referral',
    status: lead.status || lead.stage || 'New Referral',
    referral_date: normalizeDateField(lead.referralDate),
    loan_amount: Number(lead.loanAmount) || 0,
    loan_type: lead.loanType || '',
    interest_rate: lead.interestRate || '',
    first_payment_date: normalizeDateField(lead.firstPaymentDate),
    has_second_lien: Boolean(lead.hasSecondLien),
    second_lien_type: lead.secondLienType || '',
    second_lien_amount: Number(lead.secondLienAmount) || 0,
    credit_score: lead.creditScore || '',
    closing_date: normalizeDateField(lead.closingDate),
    detail: lead.detail || '',
    last_touch: normalizeDateField(lead.lastTouch),
    next_action: lead.nextAction || '',
    next_action_date: normalizeDateField(lead.nextActionDate),
    updated_at: new Date().toISOString(),
    app_data: appData,
  })
}

async function getSupabaseClient() {
  const { supabase } = await import('../lib/supabaseClient')

  if (!supabase?.auth || !supabase?.from) {
    throw new Error('Supabase is not configured correctly. Check your .env file and restart npm run dev.')
  }

  return supabase
}

export async function getCurrentUser() {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data.user
}

export async function loadLeads() {
  const user = await getCurrentUser()
  const supabase = await getSupabaseClient()

  if (!user?.id) {
    throw new Error('You must be signed in before loading leads.')
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data || []).map(leadFromSupabase)
}

export async function loadPublicLoanHubLead(loanHubId) {
  const trimmedLoanHubId = String(loanHubId || '').trim()
  if (!trimmedLoanHubId) return null

  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('app_data->>loanHubId', trimmedLoanHubId)
    .maybeSingle()

  if (error) throw error

  return data ? leadFromSupabase(data) : null
}

export async function saveLead(lead) {
  const user = await getCurrentUser()
  const supabase = await getSupabaseClient()

  if (!user?.id) {
    throw new Error('You must be signed in before saving leads.')
  }

  const record = leadToSupabase(lead, user.id)

  const { data, error } = await supabase
    .from('leads')
    .upsert(record, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw error

  return leadFromSupabase(data)
}

export async function saveLeads(leads) {
  const user = await getCurrentUser()
  const supabase = await getSupabaseClient()

  if (!user?.id) {
    throw new Error('You must be signed in before saving leads.')
  }

  if (!leads.length) return []

  const records = leads.map((lead) => leadToSupabase(lead, user.id))

  const { data, error } = await supabase
    .from('leads')
    .upsert(records, { onConflict: 'id' })
    .select('*')

  if (error) throw error

  return (data || []).map(leadFromSupabase)
}

export async function deleteLead(leadId) {
  const user = await getCurrentUser()
  const supabase = await getSupabaseClient()

  if (!user?.id) {
    throw new Error('You must be signed in before deleting leads.')
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('user_id', user.id)

  if (error) throw error

  return leadId
}

export async function archiveLead(lead) {
  return saveLead({
    ...lead,
    archived: true,
  })
}
