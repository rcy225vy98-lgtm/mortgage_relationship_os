const CLIENT_LEAD_TYPES = new Set([
  'Agent Referred',
  'Past Client',
  'Personal Referral',
  'Online Lead',
  'Builder Referral',
  'Client Referral',
])

const AGENT_LEAD_TYPES = new Set([
  'Agent Prospect',
  'Referral Partner',
  'Listing Agent Relationship',
])

function cleanValue(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeMoney(value) {
  const cleaned = cleanValue(value).replace(/[$,]/g, '')
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : 0
}

function normalizeDate(value) {
  const cleaned = cleanValue(value)
  if (!cleaned) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashMatch) {
    const month = Number(slashMatch[1])
    const day = Number(slashMatch[2])
    let year = slashMatch[3] ? Number(slashMatch[3]) : new Date().getFullYear()

    if (year < 100) year += 2000
    if (!month || !day || !year) return ''

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parsed = new Date(cleaned)
  if (Number.isNaN(parsed.getTime())) return ''

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function getFirstValue(row, columnNames = []) {
  for (const columnName of columnNames) {
    const value = cleanValue(row[columnName])
    if (value) return value
  }

  return ''
}

function normalizeCreditScore(row) {
  const rawScore = getFirstValue(row, [
    'Credit Score',
    'Credit score',
    'Credit',
    'FICO',
    'Fico',
    'Middle Score',
    'Mid Score',
    'Borrower Credit Score',
  ])

  if (!rawScore) return ''

  const scoreMatch = rawScore.match(/\d{3}/)
  return scoreMatch ? scoreMatch[0] : rawScore
}

function normalizeLeadSource(row) {
  const rawSource = getFirstValue(row, [
    'Lead Source',
    'Lead source',
    'Source',
    'Marketing Source',
    'Referral Source',
    'Referral Type',
  ])

  const referralPartner = cleanValue(row['Referral Partner'])
  const cleaned = cleanValue(rawSource)
  const lower = cleaned.toLowerCase()

  if (lower.includes('website')) return 'Website'
  if (lower.includes('facebook') || lower.includes('fb')) return 'Facebook'
  if (lower.includes('zillow')) return 'Zillow'
  if (lower.includes('google')) return 'Google'
  if (lower.includes('open house')) return 'Open House'
  if (lower.includes('past client')) return 'Past Client'
  if (lower.includes('self')) return 'Self-Sourced'
  if (referralPartner) return 'Referral Partner'

  return cleaned || 'Referral Partner'
}

function normalizeLeadType(value) {
  const cleaned = cleanValue(value)

  if (AGENT_LEAD_TYPES.has(cleaned)) return cleaned
  if (CLIENT_LEAD_TYPES.has(cleaned)) return cleaned
  if (!cleaned) return 'Agent Referred'

  return cleaned
}

function getClientName(row) {
  const first = cleanValue(row['Lead First Name'])
  const last = cleanValue(row['Lead Last Name'])
  return [first, last].filter(Boolean).join(' ').trim()
}

function mapStage(row) {
  const updateType = cleanValue(row['Update Type'])
  const applicationResults = cleanValue(row['Application Results'])
  const loanProgress = cleanValue(row['Loan Progress'])
  const differentLender = cleanValue(row['Different Lender'])
  const reasonForDnq = cleanValue(row['Reason for DNQ'])
  const underContractDate = cleanValue(row['Under Contract Date'])
  const closingDate = cleanValue(row['Closing Date'])

  const combined = [updateType, applicationResults, loanProgress].filter(Boolean).join(' ').toLowerCase()

  if (combined.includes('closed') || closingDate) return 'Closed'
  if (differentLender && differentLender.toLowerCase() !== 'no') return 'Other Lender'
  if (combined.includes('other lender') || combined.includes('builder lender')) return 'Other Lender'
  if (reasonForDnq || combined.includes('dnq')) return 'DNQ'
  if (combined.includes('clear to close')) return 'Clear to Close'
  if (combined.includes('conditional')) return 'Conditional Approval'
  if (underContractDate || combined.includes('under contract')) return 'Under Contract'
  if (combined.includes('pre-approved') || combined.includes('pre approved')) return 'Pre-Approved'
  if (combined.includes('pre-qualified') || combined.includes('pre qualified')) return 'Pre-Qualified'
  if (combined.includes('waiting on docs') || combined.includes('documentation')) return 'Waiting on Docs'
  if (combined.includes('application')) return 'Application Started'
  if (combined.includes('attempted')) return 'Contact Attempted'
  if (combined.includes('not interested')) return 'Not Interested'

  return 'New Referral'
}

function buildDetail(row) {
  const update = cleanValue(row.Update)
  const reasonForDnq = cleanValue(row['Reason for DNQ'])
  const creditScore = normalizeCreditScore(row)
  const differentLender = cleanValue(row['Different Lender'])

  const details = []

  if (update) details.push(update)
  if (reasonForDnq) details.push(`DNQ reason: ${reasonForDnq}`)
  if (creditScore) details.push(`Credit score: ${creditScore}`)
  if (differentLender && differentLender.toLowerCase() !== 'no') details.push(`Different lender: ${differentLender}`)

  return details.join(' | ') || 'Imported from lead tracker.'
}

export function importLeadTrackerRows(rows = []) {
  return rows
    .map((row, index) => {
      const client = getClientName(row)
      const referralPartner = cleanValue(row['Referral Partner'])
      const agentEmail = cleanValue(row['Agent Email'])
      const leadSource = normalizeLeadSource(row)
      const leadType = normalizeLeadType(row['Referral Type'])
      const rawDateReferred = getFirstValue(row, [
        'Date Referred',
        'Date referred',
        'date referred',
        'DATE REFERRED',
        'Referral Date',
        'Lead Date',
        'Created Date',
      ])
      const referralDate = normalizeDate(rawDateReferred)
      const dateContact = normalizeDate(row['Date Contact'])
      const lastTouch = normalizeDate(row['Last Follow Up']) || dateContact || referralDate
      const closingDate = normalizeDate(row['Closing Date'])
      const underContractDate = normalizeDate(row['Under Contract Date'])
      const loanAmount = normalizeMoney(row['Loan Amount'])
      const creditScore = normalizeCreditScore(row)
      const stage = mapStage(row)

      if (!client && !referralPartner) return null

      return {
        id: `imported-${Date.now()}-${index}`,
        client: client || referralPartner,
        referralPartner,
        partner: referralPartner || leadSource,
        leadSource,
        agentEmail,
        leadType,
        source: referralPartner || leadSource,
        priority: cleanValue(row.Priority) || 'Standard',
        stage,
        status: stage,
        detail: buildDetail(row),
        updateType: cleanValue(row['Update Type']),
        update: cleanValue(row.Update),
        emailStatus: cleanValue(row['Email Status']),
        referralDate,
        dateReferred: referralDate,
        originalDateReferred: referralDate,
        importedDateReferred: referralDate,
        rawDateReferred,
        dateContact,
        firstContactType: cleanValue(row['First Contact Type']),
        connection: cleanValue(row['Connection?']),
        followUp: cleanValue(row['Follow Up?']),
        lastTouch,
        nextActionDate: normalizeDate(row['Plan Touchbase due']),
        applicationResults: cleanValue(row['Application Results']),
        loanProgress: cleanValue(row['Loan Progress']),
        creditScore,
        reasonForDnq: cleanValue(row['Reason for DNQ']),
        differentLender: cleanValue(row['Different Lender']),
        underContractDate,
        contractDate: underContractDate,
        loanAmount,
        closingDate,
        bpsPayOut: normalizeMoney(row['BPS Pay Out']),
        archived: false,
        importedAt: new Date().toISOString(),
      }
    })
    .filter(Boolean)
}

export function summarizeLeadTrackerImport(leads = []) {
  return {
    totalImported: leads.length,
    buyerLeads: leads.filter((lead) => lead.leadType !== 'Agent Prospect').length,
    agentProspects: leads.filter((lead) => lead.leadType === 'Agent Prospect').length,
    underContract: leads.filter((lead) => lead.stage === 'Under Contract').length,
    closed: leads.filter((lead) => lead.stage === 'Closed').length,
    withClosingDate: leads.filter((lead) => lead.closingDate).length,
    totalLoanAmount: leads.reduce((sum, lead) => sum + (Number(lead.loanAmount) || 0), 0),
  }
}