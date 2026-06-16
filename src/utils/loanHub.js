export const loanHubStages = [
  'Application',
  'Processing',
  'Conditional Approval',
  'Final Review',
  'Clear to Close',
  'Closed',
]

export const defaultLoanHubFaqs = [
  {
    question: 'What does conditional approval mean?',
    answer: 'Conditional approval means underwriting has reviewed the file and listed the remaining items needed before final approval.',
  },
  {
    question: 'What happens after the appraisal?',
    answer: 'Your loan team reviews the appraisal, clears any appraisal-related items, and keeps the file moving through underwriting.',
  },
  {
    question: 'When do I need to wire funds?',
    answer: 'Your closing attorney or settlement agent will provide final wiring instructions near closing. Always verify instructions by phone before wiring money.',
  },
  {
    question: 'Can I make large deposits?',
    answer: 'Check with your loan team before making large deposits, moving money between accounts, or opening new credit.',
  },
  {
    question: 'How will I know when we are clear to close?',
    answer: 'Your loan team will notify you when underwriting issues the clear to close and the closing package is being prepared.',
  },
  {
    question: 'Where should I upload documents?',
    answer: 'Upload documents through HFG GO when your portal link is available. Please do not email or text sensitive documents.',
  },
]

export function generateLoanHubId() {
  const randomValue = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
  return `lh_${String(randomValue).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase()}`
}

export function getLoanHubIdFromPath(pathname = window.location.pathname) {
  const match = String(pathname || '').match(/^\/loan-hub\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function getLoanHubLink(lead, origin = window.location.origin) {
  if (!lead?.loanHubId) return ''
  return `${origin}/loan-hub/${lead.loanHubId}`
}

export function ensureLoanHubFields(lead) {
  return {
    ...lead,
    loanHubId: lead.loanHubId || generateLoanHubId(),
    loanHubEnabled: lead.loanHubEnabled !== false,
    hfgGoPortalUrl: lead.hfgGoPortalUrl || '',
    progressTrackerUrl: lead.progressTrackerUrl || '',
    strategyVideos: Array.isArray(lead.strategyVideos) ? lead.strategyVideos : [],
    importantDates: Array.isArray(lead.importantDates) ? lead.importantDates : [],
    nextBestStep: lead.nextBestStep || lead.nextAction || '',
  }
}

export function getLoanHubProgress(lead) {
  const currentProgress = lead.loanProgress || lead.pipelineStatus || lead.stage || lead.status || ''
  const currentIndex = loanHubStages.findIndex((stage) => {
    return stage.toLowerCase() === String(currentProgress).toLowerCase()
  })

  if (currentIndex >= 0) {
    return { label: loanHubStages[currentIndex], index: currentIndex }
  }

  if (['Pre-Approved', 'Home Shopping', 'Application Started'].includes(currentProgress)) {
    return { label: 'Application', index: 0 }
  }

  if (['Under Contract', 'Refi', 'Waiting on Docs', 'Docs Submitted'].includes(currentProgress)) {
    return { label: 'Processing', index: 1 }
  }

  return { label: currentProgress || 'Application', index: 0 }
}

export function getLoanHubImportantDates(lead) {
  const customDates = Array.isArray(lead.importantDates) ? lead.importantDates : []
  const baseDates = [
    lead.contractDate && { label: 'Contract Date', date: lead.contractDate, note: 'Purchase contract started.' },
    lead.appraisalDueDate && { label: 'Appraisal Due', date: lead.appraisalDueDate, note: lead.appraisalNotes || 'Appraisal milestone.' },
    lead.closingDate && { label: 'Estimated Closing', date: lead.closingDate, note: 'Target closing date.' },
    lead.firstPaymentDate && { label: 'First Payment', date: lead.firstPaymentDate, note: 'Estimated first payment date.' },
  ].filter(Boolean)

  return [...customDates, ...baseDates].slice(0, 8)
}

export function getLoanHubContacts(lead) {
  return [
    {
      name: 'Brian McIntosh',
      role: 'Loan Officer',
      phone: lead.loanOfficerPhone || '(864) 555-0123',
      email: lead.loanOfficerEmail || 'brian@example.com',
      calendarUrl: lead.loanOfficerCalendarUrl || '',
    },
    ...(Array.isArray(lead.teamContacts) ? lead.teamContacts : []),
    lead.partner && {
      name: lead.partner,
      role: 'Agent / Referral Partner',
      phone: lead.partnerPhone || '',
      email: lead.partnerEmail || '',
      calendarUrl: '',
    },
  ].filter(Boolean)
}
