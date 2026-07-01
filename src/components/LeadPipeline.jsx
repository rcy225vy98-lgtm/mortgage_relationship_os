import { memo, useEffect, useMemo, useState } from 'react'
import { getLeadFollowUpPlan, getRecommendedNextTouchDate } from '../utils/cadence'
import { saveLead as saveLeadToSupabase } from '../data/leadsRepository'
import LeadCard from './LeadCard'

const LEADS_STORAGE_KEY = 'mortgage_relationship_os_leads'

const MemoLeadCard = memo(LeadCard, (previousProps, nextProps) => {
  return previousProps.lead === nextProps.lead
})

const leadTypeOptions = [
  'Buyer Lead',
  'Past Client',
  'Agent Prospect',
  'Referral Partner',
  'Listing Agent Relationship',
]

const buyerStageOptions = [
  'New Referral',
  'Contact Attempted',
  'Connected, Needs Application',
  'Application Started',
  'Waiting on Docs',
  'Pre-Approved',
  'Home Shopping',
  'Refi',
  'Under Contract',
  'Conditional Approval',
  'Clear to Close',
  'Closed',
  'Credit Plan',
  'DNQ',
  'Other Lender',
  'Builder Lender',
  'Not Interested',
  'Dormant',
  'Long-Term Nurture',
]

const agentProspectStageOptions = [
  'Target Identified',
  'First Outreach Sent',
  'Conversation Started',
  'Meeting Scheduled',
  'Met',
  'Value Follow-Up Sent',
  'Active Relationship',
  'Referral Partner',
  'Dormant',
]

const relationshipStageOptions = [
  'Active Relationship',
  'Referral Partner',
  'Dormant',
]

const sortOptions = [
  { value: 'dateReferredDesc', label: 'Date Referred: Newest' },
  { value: 'dateReferredAsc', label: 'Date Referred: Oldest' },
  { value: 'lastTouchDesc', label: 'Last Touch: Newest' },
  { value: 'lastTouchAsc', label: 'Last Touch: Oldest' },
  { value: 'closingDateDesc', label: 'Closing Date: Newest' },
  { value: 'closingDateAsc', label: 'Closing Date: Oldest' },
  { value: 'loanAmountDesc', label: 'Loan Amount: High to Low' },
  { value: 'loanAmountAsc', label: 'Loan Amount: Low to High' },
  { value: 'creditScoreDesc', label: 'Credit Score: High to Low' },
  { value: 'creditScoreAsc', label: 'Credit Score: Low to High' },
  { value: 'clientAsc', label: 'Client Name: A to Z' },
]


const leadSourceOptions = [
  'Referral Partner',
  'Past Client',
  'Website',
  'Facebook',
  'Zillow',
  'Google',
  'Open House',
  'Self-Sourced',
  'Other',
]

function formatLoanAmountInput(value) {
  const digitsOnly = String(value || '').replace(/\D/g, '')
  if (!digitsOnly) return ''
  return Number(digitsOnly).toLocaleString()
}

function parseMoneyValue(value) {
  const digitsOnly = String(value || '').replace(/\D/g, '')
  return Number(digitsOnly) || 0
}

function isClientLeadType(leadType) {
  return leadType !== 'Agent Prospect' && leadType !== 'Referral Partner' && leadType !== 'Listing Agent Relationship'
}

function hasReachedClosingDate(closingDate) {
  if (!closingDate) return false

  const closing = new Date(`${closingDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return !Number.isNaN(closing.getTime()) && closing <= today
}

function getStageOptionsForLeadType(leadType) {
  if (leadType === 'Agent Prospect') return agentProspectStageOptions
  if (leadType === 'Referral Partner' || leadType === 'Listing Agent Relationship') return relationshipStageOptions
  return buyerStageOptions
}

function getDateSortValue(value) {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getLeadDateReferredValue(lead) {
  return getDateSortValue(
    lead.dateReferred
      || lead.originalDateReferred
      || lead.importedDateReferred
      || lead.rawDateReferred
      || lead.referralDate
      || lead.createdAt
      || lead.created_at,
  )
}

function getNumberSortValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function sortLeads(leads, sortMode) {
  const sortedLeads = [...leads]

  return sortedLeads.sort((a, b) => {
    if (sortMode === 'dateReferredAsc') return getLeadDateReferredValue(a) - getLeadDateReferredValue(b)
    if (sortMode === 'dateReferredDesc') return getLeadDateReferredValue(b) - getLeadDateReferredValue(a)
    if (sortMode === 'lastTouchAsc') return getDateSortValue(a.lastTouch) - getDateSortValue(b.lastTouch)
    if (sortMode === 'lastTouchDesc') return getDateSortValue(b.lastTouch) - getDateSortValue(a.lastTouch)
    if (sortMode === 'closingDateAsc') return getDateSortValue(a.closingDate) - getDateSortValue(b.closingDate)
    if (sortMode === 'closingDateDesc') return getDateSortValue(b.closingDate) - getDateSortValue(a.closingDate)
    if (sortMode === 'loanAmountAsc') return getNumberSortValue(a.loanAmount) - getNumberSortValue(b.loanAmount)
    if (sortMode === 'loanAmountDesc') return getNumberSortValue(b.loanAmount) - getNumberSortValue(a.loanAmount)
    if (sortMode === 'creditScoreAsc') return getNumberSortValue(a.creditScore) - getNumberSortValue(b.creditScore)
    if (sortMode === 'creditScoreDesc') return getNumberSortValue(b.creditScore) - getNumberSortValue(a.creditScore)
    if (sortMode === 'clientAsc') return String(a.client || '').localeCompare(String(b.client || ''))

    return 0
  })
}


function getDefaultNextAction(leadType, stage) {
  if (leadType === 'Agent Prospect') {
    if (stage === 'Target Identified') return 'Research agent and prepare first outreach'
    if (stage === 'First Outreach Sent') return 'Follow up on first outreach'
    if (stage === 'Conversation Started') return 'Ask for coffee or lunch meeting'
    if (stage === 'Meeting Scheduled') return 'Confirm meeting details'
    if (stage === 'Met') return 'Send thank-you note and first value touch'
    if (stage === 'Value Follow-Up Sent') return 'Follow up on value touch'
    if (stage === 'Active Relationship') return 'Send monthly value touch'
    if (stage === 'Referral Partner') return 'Send monthly partner value touch'
    if (stage === 'Dormant') return 'Send reconnect message'
    return 'Follow up with agent prospect'
  }

  if (leadType === 'Referral Partner' || leadType === 'Listing Agent Relationship') {
    return 'Send relationship value touch'
  }

  if (leadType === 'Past Client') {
    return 'Send nurture check-in'
  }

  if (stage === 'Refi') return 'Review refinance goals, current payment, payoff timeline, and break-even strategy.'

  return 'Follow up with client'
}

function isDefaultNextAction(leadType, nextAction) {
  if (!nextAction) return true

  const allStageOptions = [
    ...buyerStageOptions,
    ...agentProspectStageOptions,
    ...relationshipStageOptions,
  ]

  return allStageOptions.some((stage) => getDefaultNextAction(leadType, stage) === nextAction)
}

const blankLeadForm = {
  client: '',
  hasCoBorrower: false,
  coBorrower: '',
  coBorrowerPhone: '',
  coBorrowerEmail: '',
  partner: '',
  leadSource: 'Referral Partner',
  phone: '',
  email: '',
  brokerage: '',
  leadType: 'Buyer Lead',
  stage: 'New Referral',
  referralDate: new Date().toISOString().slice(0, 10),
  status: 'New Referral',
  loanAmount: '',
  purchasePrice: '',
  propertyAddress: '',
  loanType: '',
  interestRate: '',
  firstPaymentDate: '',
  hasSecondLien: false,
  secondLienType: '',
  secondLienAmount: '',
  creditScore: '',
  closingDate: '',
  contractDate: '',
  appraisalOrdered: false,
  appraisalDueDate: '',
  appraisalReceived: false,
  appraisalNotes: '',
  detail: '',
  lastTouch: new Date().toISOString().slice(0, 10),
  nextAction: '',
  nextActionDate: '',
}

export default function LeadPipeline({
  query,
  setQuery,
  partnerFilter,
  setPartnerFilter,
  partners,
  filteredLeads,
  setLeads,
  setSelectedPartner,
  title = 'Lead Pipeline',
  subtitle = 'Search, filter, and see what each lead needs next.',
  addButtonLabel = '+ Add Lead',
  formTitle = 'Add a new referral',
  editFormTitle = 'Edit referral',
  formSubtitle = 'Capture the lead, assign the partner, and set the next action before it gets lost.',
  editFormSubtitle = 'Update the status, detail, and next action for this lead.',
  nameLabel = 'Client Name',
  namePlaceholder = 'Jane Buyer',
  detailLabel = 'Update Detail',
  detailPlaceholder = 'Quick summary of where things stand...',
  searchPlaceholder = 'Search leads...',
  defaultLeadType = 'Buyer Lead',
  defaultPartner = '',
  partnerLabel = 'Referral Partner / Source Name',
  partnerPlaceholder = 'Agent name',
  showLoanAmount = true,
  showPartnerContactFields = false,
  focusedLeadId = null,
  setFocusedLeadId,
}) {
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState(null)
  const [leadForm, setLeadForm] = useState(blankLeadForm)
  const [pipelineView, setPipelineView] = useState('all')
  const [sortMode, setSortMode] = useState('dateReferredDesc')
  const [showFilters, setShowFilters] = useState(false)
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false)
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  const returnToPipelineTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const underContractLeads = useMemo(() => {
    return filteredLeads.filter((lead) => (lead.stage || lead.status) === 'Under Contract')
  }, [filteredLeads])

  const refiLeads = useMemo(() => {
    return filteredLeads.filter((lead) => (lead.stage || lead.status) === 'Refi')
  }, [filteredLeads])

  const needsFollowUpLeads = useMemo(() => {
    return filteredLeads.filter((lead) => {
      const followUpPlan = getLeadFollowUpPlan(lead)
      return followUpPlan.priority === 'Urgent' || followUpPlan.priority === 'Due Today'
    })
  }, [filteredLeads])

  const preApprovedLeads = useMemo(() => {
    return filteredLeads.filter((lead) => ['Pre-Approved', 'Pre-Qualified'].includes(lead.stage || lead.status))
  }, [filteredLeads])

  const incompleteApplicationLeads = useMemo(() => {
    return filteredLeads.filter((lead) => ['Application Started', 'Connected, Needs Application'].includes(lead.stage || lead.status))
  }, [filteredLeads])

  const inProcessLeads = useMemo(() => {
    return filteredLeads.filter((lead) => ['Waiting on Docs', 'Documentation', 'Refi', 'Under Contract', 'Conditional Approval', 'Clear to Close'].includes(lead.stage || lead.status))
  }, [filteredLeads])

  const closingSoonLeads = useMemo(() => {
    return filteredLeads.filter((lead) => {
      if (!lead.closingDate) return false

      const closingDate = new Date(`${lead.closingDate}T00:00:00`)
      if (Number.isNaN(closingDate.getTime())) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysUntilClosing = Math.ceil((closingDate - today) / (24 * 60 * 60 * 1000))

      return daysUntilClosing >= 0 && daysUntilClosing <= 14
    })
  }, [filteredLeads])

  const closedLeads = useMemo(() => {
    return filteredLeads.filter((lead) => lead.stage === 'Closed' || lead.status === 'Closed')
  }, [filteredLeads])

  const dnqLeads = useMemo(() => {
    return filteredLeads.filter((lead) => String(lead.stage || lead.status || '').toLowerCase().includes('dnq'))
  }, [filteredLeads])

  const notInterestedLeads = useMemo(() => {
    return filteredLeads.filter((lead) => (lead.stage || lead.status) === 'Not Interested')
  }, [filteredLeads])

  const pipelineSummaryMetrics = useMemo(() => {
    return [
      { label: 'Pre-Approved Leads', value: preApprovedLeads.length, tone: 'navy', view: 'preApproved' },
      { label: 'Incomplete Application', value: incompleteApplicationLeads.length, tone: 'muted', view: 'incompleteApplication' },
      { label: 'In Process', value: inProcessLeads.length, tone: 'blue', view: 'inProcess' },
      { label: 'Closing Soon', value: closingSoonLeads.length, tone: 'gold', view: 'closingSoon' },
    ]
  }, [closingSoonLeads.length, incompleteApplicationLeads.length, inProcessLeads.length, preApprovedLeads.length])

  const unsortedVisibleLeads = pipelineView === 'needsFollowUp'
    ? needsFollowUpLeads
    : pipelineView === 'underContract'
      ? underContractLeads
      : pipelineView === 'incompleteApplication'
        ? incompleteApplicationLeads
        : pipelineView === 'inProcess'
          ? inProcessLeads
          : pipelineView === 'closingSoon'
            ? closingSoonLeads
            : pipelineView === 'refi'
              ? refiLeads
              : pipelineView === 'preApproved'
                ? preApprovedLeads
                : pipelineView === 'dnq'
                  ? dnqLeads
                  : pipelineView === 'notInterested'
                    ? notInterestedLeads
                    : pipelineView === 'closed'
                      ? closedLeads
                      : filteredLeads
  const visibleLeads = useMemo(() => sortLeads(unsortedVisibleLeads, sortMode), [unsortedVisibleLeads, sortMode])
  const visibleLeadIds = useMemo(() => visibleLeads.map((lead) => lead.id), [visibleLeads])
  const selectedVisibleCount = selectedLeadIds.filter((leadId) => visibleLeadIds.includes(leadId)).length
  const allVisibleSelected = visibleLeadIds.length > 0 && selectedVisibleCount === visibleLeadIds.length
  const activeFilterCount = (partnerFilter !== 'All Partners' ? 1 : 0) + (sortMode !== 'dateReferredDesc' ? 1 : 0)
  const showLeadCheckboxes = bulkActionsOpen || selectedLeadIds.length > 0
  const pipelineViewContext = useMemo(() => {
    const sortLabel = sortOptions.find((option) => option.value === sortMode)?.label || 'selected sort'

    if (pipelineView === 'needsFollowUp') {
      return `${visibleLeads.length} lead${visibleLeads.length === 1 ? '' : 's'} need attention. Sorted by ${sortLabel.toLowerCase()}.`
    }

    if (pipelineView === 'underContract') {
      return `${visibleLeads.length} active contract file${visibleLeads.length === 1 ? '' : 's'} in this view. Watch closing dates, appraisal timing, and next touches.`
    }

    if (pipelineView === 'inProcess') {
      return `${visibleLeads.length} in-process lead${visibleLeads.length === 1 ? '' : 's'} in this view. Use this for files that have moved past application intake and need active pipeline management.`
    }

    if (pipelineView === 'incompleteApplication') {
      return `${visibleLeads.length} incomplete application lead${visibleLeads.length === 1 ? '' : 's'} in this view. These need application completion before they should be treated as active pipeline.`
    }

    if (pipelineView === 'closingSoon') {
      return `${visibleLeads.length} file${visibleLeads.length === 1 ? '' : 's'} closing in the next 14 days. Review appraisal, conditions, cash to close, and client communication.`
    }

    if (pipelineView === 'refi') {
      return `${visibleLeads.length} refinance file${visibleLeads.length === 1 ? '' : 's'} in this view. Sorted by ${sortLabel.toLowerCase()}.`
    }

    if (pipelineView === 'preApproved') {
      return `${visibleLeads.length} pre-approved lead${visibleLeads.length === 1 ? '' : 's'} ready for shopping, strategy, or reactivation.`
    }

    if (pipelineView === 'closed') {
      return `${visibleLeads.length} closed client${visibleLeads.length === 1 ? '' : 's'} in this view. Use this list for post-closing follow-up and relationship touches.`
    }

    if (pipelineView === 'dnq') {
      return `${visibleLeads.length} DNQ lead${visibleLeads.length === 1 ? '' : 's'} in this view. Use this list for credit-plan follow-up and partner feedback.`
    }

    if (pipelineView === 'notInterested') {
      return `${visibleLeads.length} not interested lead${visibleLeads.length === 1 ? '' : 's'} in this view. Use this list for respectful long-term nurture.`
    }

    return `${visibleLeads.length} lead${visibleLeads.length === 1 ? '' : 's'} shown from ${filteredLeads.length} total match${filteredLeads.length === 1 ? '' : 'es'}. Sorted by ${sortLabel.toLowerCase()}.`
  }, [filteredLeads.length, pipelineView, sortMode, visibleLeads.length])


  useEffect(() => {
    if (!focusedLeadId) return

    const resetTimer = window.setTimeout(() => {
      setSelectedLeadId(focusedLeadId)
      setPipelineView('all')
      setPartnerFilter('All Partners')
      setQuery('')
    }, 0)

    const scrollTimer = window.setTimeout(() => {
      const leadElement = document.querySelector(`[data-lead-id="${focusedLeadId}"]`)

      if (!leadElement) return

      leadElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      leadElement.classList.add('focused-lead-card')

      window.setTimeout(() => {
        leadElement.classList.remove('focused-lead-card')
        if (setFocusedLeadId) setFocusedLeadId(null)
      }, 2600)
    }, 180)

    return () => {
      window.clearTimeout(resetTimer)
      window.clearTimeout(scrollTimer)
    }
  }, [focusedLeadId, setFocusedLeadId, setPartnerFilter, setQuery])

  function toggleLeadSelection(leadId) {
    setSelectedLeadIds((current) => (
      current.includes(leadId)
        ? current.filter((selectedId) => selectedId !== leadId)
        : [...current, leadId]
    ))
  }

  function toggleSelectVisibleLeads() {
    if (allVisibleSelected) {
      setSelectedLeadIds((current) => current.filter((leadId) => !visibleLeadIds.includes(leadId)))
      return
    }

    setSelectedLeadIds((current) => Array.from(new Set([...current, ...visibleLeadIds])))
  }

  function clearSelectedLeads() {
    setSelectedLeadIds([])
    setBulkActionsOpen(false)
  }

  function deleteSelectedLeads() {
    if (!selectedLeadIds.length) return

    const confirmed = window.confirm(`Archive ${selectedLeadIds.length} selected lead${selectedLeadIds.length === 1 ? '' : 's'}? They will be removed from the active pipeline.`)

    if (!confirmed) return

    const selectedSet = new Set(selectedLeadIds.map(String))
    const selectedLeads = filteredLeads.filter((lead) => selectedSet.has(String(lead.id)))
    const archivedAt = new Date().toISOString()

    setLeads((current) =>
      current.map((lead) => (
        selectedSet.has(String(lead.id))
          ? { ...lead, archived: true, archivedAt }
          : lead
      )),
    )

    setSelectedLeadIds([])
    setBulkActionsOpen(false)

    if (selectedSet.has(String(editingLeadId))) {
      closeLeadForm()
    }

    selectedLeads.forEach((lead) => {
      saveLeadToSupabase({ ...lead, archived: true, archivedAt }).catch((error) => {
        console.error('Lead archive cloud save failed:', error)
        alert(error.message || 'Lead was archived locally, but cloud save failed. Check Cloud Sync before closing the app.')
      })
    })
  }

  function updateLeadForm(field, value) {
    setLeadForm((current) => {
      if (field === 'loanAmount') {
        return {
          ...current,
          loanAmount: formatLoanAmountInput(value),
        }
      }

      if (field === 'purchasePrice') {
        return {
          ...current,
          purchasePrice: formatLoanAmountInput(value),
        }
      }

      if (field === 'secondLienAmount') {
        return {
          ...current,
          secondLienAmount: formatLoanAmountInput(value),
        }
      }

      if (field === 'creditScore') {
        const digitsOnly = String(value || '').replace(/\D/g, '').slice(0, 3)
        return {
          ...current,
          creditScore: digitsOnly,
        }
      }

      if (field === 'leadType') {
        const nextStageOptions = getStageOptionsForLeadType(value)
        const nextStage = nextStageOptions.includes(current.stage) ? current.stage : nextStageOptions[0]
        const shouldUpdateNextAction = isDefaultNextAction(current.leadType, current.nextAction)

        return {
          ...current,
          leadType: value,
          stage: nextStage,
          status: nextStage,
          nextAction: shouldUpdateNextAction ? getDefaultNextAction(value, nextStage) : current.nextAction,
        }
      }

      if (field === 'stage') {
        const shouldUpdateNextAction = isDefaultNextAction(current.leadType, current.nextAction)
        const shouldAutoSetContractDate = ['Under Contract', 'Refi'].includes(value) && !current.contractDate

        return {
          ...current,
          stage: value,
          status: value,
          contractDate: shouldAutoSetContractDate ? new Date().toISOString().slice(0, 10) : current.contractDate,
          nextAction: shouldUpdateNextAction ? getDefaultNextAction(current.leadType, value) : current.nextAction,
        }
      }

      if (field === 'hasSecondLien') {
        return {
          ...current,
          hasSecondLien: value,
          secondLienType: value ? current.secondLienType : '',
          secondLienAmount: value ? current.secondLienAmount : '',
        }
      }

      if (field === 'hasCoBorrower') {
        return {
          ...current,
          hasCoBorrower: value,
          coBorrower: value ? current.coBorrower : '',
          coBorrowerPhone: value ? current.coBorrowerPhone : '',
          coBorrowerEmail: value ? current.coBorrowerEmail : '',
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  function resetLeadForm() {
    setLeadForm({
      ...blankLeadForm,
      referralDate: new Date().toISOString().slice(0, 10),
      lastTouch: new Date().toISOString().slice(0, 10),
    })
  }

  function openAddLeadForm() {
    const stageOptions = getStageOptionsForLeadType(defaultLeadType)
    const defaultStage = stageOptions[0]

    setLeadForm({
      ...blankLeadForm,
      partner: defaultPartner,
      leadType: defaultLeadType,
      stage: defaultStage,
      status: defaultStage,
      referralDate: new Date().toISOString().slice(0, 10),
      lastTouch: new Date().toISOString().slice(0, 10),
      nextAction: getDefaultNextAction(defaultLeadType, defaultStage),
      nextActionDate: '',
    })
    setEditingLeadId(null)
    setShowLeadForm(true)
  }

  function closeLeadForm() {
    resetLeadForm()
    setEditingLeadId(null)
    setShowLeadForm(false)
  }

  function startEditingLead(lead) {
    setSelectedLeadId(lead.id)
    setLeadForm({
      client: lead.client || '',
      hasCoBorrower: Boolean(lead.coBorrower || lead.coBorrowerPhone || lead.coBorrowerEmail),
      coBorrower: lead.coBorrower || '',
      coBorrowerPhone: lead.coBorrowerPhone || '',
      coBorrowerEmail: lead.coBorrowerEmail || '',
      partner: lead.partner || '',
      leadSource: lead.leadSource || 'Referral Partner',
      phone: lead.phone || '',
      email: lead.email || '',
      brokerage: lead.brokerage || '',
      leadType: lead.leadType || 'Buyer Lead',
      stage: lead.stage === 'Attempted to Connect' ? 'Contact Attempted' : lead.stage || lead.status || 'New Referral',
      referralDate: lead.referralDate || '',
      status: lead.status || 'New Referral',
      loanAmount: lead.loanAmount ? formatLoanAmountInput(lead.loanAmount) : '',
      purchasePrice: lead.purchasePrice ? formatLoanAmountInput(lead.purchasePrice) : '',
      propertyAddress: lead.propertyAddress || '',
      loanType: lead.loanType || '',
      interestRate: lead.interestRate || '',
      firstPaymentDate: lead.firstPaymentDate || '',
      hasSecondLien: Boolean(lead.hasSecondLien),
      secondLienType: lead.secondLienType || '',
      secondLienAmount: lead.secondLienAmount ? formatLoanAmountInput(lead.secondLienAmount) : '',
      creditScore: lead.creditScore || '',
      closingDate: lead.closingDate || '',
      contractDate: lead.contractDate || lead.underContractDate || '',
      appraisalOrdered: Boolean(lead.appraisalOrdered),
      appraisalDueDate: lead.appraisalDueDate || '',
      appraisalReceived: Boolean(lead.appraisalReceived),
      appraisalNotes: lead.appraisalNotes || '',
      detail: lead.detail || '',
      lastTouch: lead.lastTouch || '',
      nextAction: lead.nextAction || '',
      nextActionDate: lead.nextActionDate || '',
    })
    setEditingLeadId(lead.id)
    setShowLeadForm(true)
  }

  function archiveLead(leadId) {
    const confirmed = window.confirm('Archive this lead? It will be removed from the active pipeline.')

    if (!confirmed) return

    const leadToArchive = filteredLeads.find((lead) => String(lead.id) === String(leadId))
    const archivedAt = new Date().toISOString()

    setLeads((current) =>
      current.map((lead) => (
        String(lead.id) === String(leadId)
          ? { ...lead, archived: true, archivedAt }
          : lead
      )),
    )

    if (String(editingLeadId) === String(leadId)) {
      closeLeadForm()
    }

    if (String(selectedLeadId) === String(leadId)) {
      setSelectedLeadId(null)
    }

    if (leadToArchive) {
      saveLeadToSupabase({ ...leadToArchive, archived: true, archivedAt }).catch((error) => {
        console.error('Lead archive cloud save failed:', error)
        alert(error.message || 'Lead was archived locally, but cloud save failed. Check Cloud Sync before closing the app.')
      })
    }
  }

  function markTouchedToday(leadId, touch = {}) {
    const today = touch.date || new Date().toISOString().slice(0, 10)
    const existingLead = filteredLeads.find((lead) => String(lead.id) === String(leadId))

    if (!existingLead) return

    const touchEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${leadId}`,
      date: today,
      type: touch.type || 'Touch',
      outcome: touch.outcome || 'Completed',
      note: touch.note || `${touch.type || 'Touch'} completed.`,
      nextAction: touch.nextAction || '',
      nextActionDate: touch.nextActionDate || '',
      meaningful: touch.meaningful !== false,
    }

    const isCompletingManualTask = Boolean(existingLead.manualTaskActive)
    const updatedLead = {
      ...existingLead,
      lastTouch: today,
      ...(touchEntry.meaningful ? { lastMeaningfulTouchDate: today } : {}),
      ...(isCompletingManualTask ? {
        manualTaskActive: false,
        manualTaskCompletedAt: new Date().toISOString(),
      } : {}),
      touchHistory: [touchEntry, ...(existingLead.touchHistory || [])],
    }
    const followUpPlan = getLeadFollowUpPlan(updatedLead)

    const leadToSave = {
      ...updatedLead,
      nextAction: touch.nextAction || (isCompletingManualTask ? followUpPlan.recommendedAction : updatedLead.nextAction),
      nextActionDate: touch.nextActionDate || followUpPlan.nextTouchDate || getRecommendedNextTouchDate(updatedLead),
    }

    setLeads((current) =>
      current.map((lead) => (String(lead.id) === String(leadId) ? leadToSave : lead)),
    )

    if (String(editingLeadId) === String(leadId)) {
      setLeadForm((current) => ({
        ...current,
        lastTouch: today,
        nextActionDate: leadToSave.nextActionDate || current.nextActionDate,
      }))
    }

    saveLeadToSupabase(leadToSave).catch((error) => {
      console.error('Touch history cloud save failed:', error)
      alert(error.message || 'Touch was saved locally, but cloud save failed. Check Cloud Sync before closing the app.')
    })
  }

  function pushNextActionThreeDays(leadId) {
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 3)
    const nextActionDate = nextDate.toISOString().slice(0, 10)

    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, nextActionDate } : lead)),
    )

    if (editingLeadId === leadId) {
      setLeadForm((current) => ({
        ...current,
        nextActionDate,
      }))
    }
  }

  function quickUpdateLead(leadId, updates) {
    let leadToSave = null
    let nextLeadsForLocalBackup = null

    setLeads((current) => {
      nextLeadsForLocalBackup = current.map((lead) => {
        if (String(lead.id) !== String(leadId)) return lead

        leadToSave = {
          ...lead,
          ...updates,
        }

        return leadToSave
      })

      return nextLeadsForLocalBackup
    })

    if (String(editingLeadId) === String(leadId)) {
      setLeadForm((current) => ({
        ...current,
        ...updates,
      }))
    }

    if (leadToSave) {
      try {
        window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(nextLeadsForLocalBackup))
      } catch (error) {
        console.error('Quick lead local backup failed:', error)
      }

      saveLeadToSupabase(leadToSave).catch((error) => {
        console.error('Quick lead update cloud save failed:', error)
        alert(error.message || 'Lead updated locally, but cloud save failed. Check Cloud Sync before closing the app.')
      })
    }
  }

  async function saveLead(event) {
    event.preventDefault()

    const trimmedClient = leadForm.client.trim()
    const trimmedPartner = leadForm.partner.trim()
    const trimmedPhone = leadForm.phone.trim()
    const trimmedEmail = leadForm.email.trim()
    const partnerIsRequired = leadForm.leadType !== 'Agent Prospect'
    const partnerToSave = trimmedPartner || 'Self-Sourced'
    const creditScoreNumber = Number(leadForm.creditScore)

    if (!trimmedClient) {
      alert('Add at least the name before saving.')
      return
    }

    if (partnerIsRequired && !trimmedPartner) {
      alert('Add the referral partner or source before saving this lead.')
      return
    }

    if (leadForm.creditScore && (creditScoreNumber < 300 || creditScoreNumber > 850)) {
      alert('Credit score must be between 300 and 850.')
      return
    }

    const existingLeadForEdit = editingLeadId
      ? filteredLeads.find((lead) => lead.id === editingLeadId)
      : null

    const newLead = {
      ...(existingLeadForEdit || {}),
      id: editingLeadId || crypto.randomUUID?.() || String(Date.now()),
      client: trimmedClient,
      coBorrower: leadForm.hasCoBorrower ? leadForm.coBorrower.trim() : '',
      coBorrowerPhone: leadForm.hasCoBorrower ? leadForm.coBorrowerPhone.trim() : '',
      coBorrowerEmail: leadForm.hasCoBorrower ? leadForm.coBorrowerEmail.trim() : '',
      partner: partnerToSave,
      leadSource: leadForm.leadSource,
      phone: trimmedPhone,
      email: trimmedEmail,
      brokerage: leadForm.brokerage.trim(),
      leadType: leadForm.leadType,
      stage: leadForm.stage,
      referralDate: leadForm.referralDate,
      dateReferred: leadForm.referralDate,
      status: leadForm.stage,
      loanAmount: parseMoneyValue(leadForm.loanAmount),
      purchasePrice: parseMoneyValue(leadForm.purchasePrice),
      propertyAddress: leadForm.propertyAddress.trim(),
      loanType: leadForm.loanType.trim(),
      interestRate: leadForm.interestRate.trim(),
      firstPaymentDate: leadForm.firstPaymentDate,
      hasSecondLien: Boolean(leadForm.hasSecondLien),
      secondLienType: leadForm.hasSecondLien ? leadForm.secondLienType.trim() : '',
      secondLienAmount: leadForm.hasSecondLien ? parseMoneyValue(leadForm.secondLienAmount) : 0,
      creditScore: leadForm.creditScore,
      closingDate: leadForm.closingDate,
      contractDate: leadForm.contractDate,
      appraisalOrdered: Boolean(leadForm.appraisalOrdered),
      appraisalDueDate: leadForm.appraisalDueDate,
      appraisalReceived: Boolean(leadForm.appraisalReceived),
      appraisalNotes: leadForm.appraisalNotes.trim(),
      detail: leadForm.detail.trim() || 'New referral added. Details pending.',
      lastTouch: leadForm.lastTouch,
      touchHistory: editingLeadId
        ? existingLeadForEdit?.touchHistory || []
        : [],
      needsList: editingLeadId ? existingLeadForEdit?.needsList || [] : [],
      manualTaskActive: editingLeadId ? existingLeadForEdit?.manualTaskActive : undefined,
      manualTaskChannel: editingLeadId ? existingLeadForEdit?.manualTaskChannel : undefined,
      manualTaskNote: editingLeadId ? existingLeadForEdit?.manualTaskNote : undefined,
      manualTaskCreatedAt: editingLeadId ? existingLeadForEdit?.manualTaskCreatedAt : undefined,
      manualTaskCompletedAt: editingLeadId ? existingLeadForEdit?.manualTaskCompletedAt : undefined,
      nextAction: leadForm.nextAction.trim() || getDefaultNextAction(leadForm.leadType, leadForm.stage),
      nextActionDate: leadForm.nextActionDate,
    }

    if (!newLead.nextActionDate) {
      newLead.nextActionDate = getRecommendedNextTouchDate(newLead)
    }

    const leadToSave = editingLeadId ? { ...newLead, id: editingLeadId } : newLead

    if (editingLeadId) {
      setLeads((current) =>
        current.map((lead) => (lead.id === editingLeadId ? leadToSave : lead)),
      )
    } else {
      setLeads((current) => [leadToSave, ...current])
    }

    setSelectedPartner(partnerToSave)
    setPartnerFilter('All Partners')
    setQuery('')
    closeLeadForm()

    try {
      const savedLead = await saveLeadToSupabase(leadToSave)
      setLeads((current) =>
        current.map((lead) => (lead.id === leadToSave.id ? { ...lead, ...savedLead } : lead)),
      )
    } catch (error) {
      console.error('Lead cloud save failed:', error)
      alert(error.message || 'Lead saved locally, but cloud save failed. Check Cloud Sync before closing the app.')
    }
  }

  function renderLeadForm() {
    const shouldShowPartnerContactFields = showPartnerContactFields || leadForm.leadType === 'Agent Prospect' || leadForm.leadType === 'Referral Partner' || leadForm.leadType === 'Listing Agent Relationship'
    const shouldShowClientContactFields = isClientLeadType(leadForm.leadType)
    const shouldShowLoanAmount = showLoanAmount && leadForm.leadType !== 'Agent Prospect' && leadForm.leadType !== 'Referral Partner' && leadForm.leadType !== 'Listing Agent Relationship'
    const shouldShowClosingDate = leadForm.leadType !== 'Agent Prospect' && leadForm.leadType !== 'Referral Partner' && leadForm.leadType !== 'Listing Agent Relationship' && ['Refi', 'Under Contract', 'Conditional Approval', 'Clear to Close', 'Closed'].includes(leadForm.stage)
    const shouldShowAppraisalFields = shouldShowClosingDate
    const shouldShowManualDateFields = Boolean(editingLeadId)
    const shouldShowStageField = Boolean(editingLeadId)
    const shouldShowManagementFields = Boolean(editingLeadId)
    const shouldPromptForClosingDetails = Boolean(editingLeadId) && (leadForm.stage === 'Closed' || hasReachedClosingDate(leadForm.closingDate))
    const missingClosingDetails = shouldPromptForClosingDetails && (!leadForm.loanAmount || !leadForm.loanType || !leadForm.interestRate || !leadForm.firstPaymentDate)
    return (
      <form className="form-card" onSubmit={saveLead}>
        <div className="form-header">
          <div>
            <h3>{editingLeadId ? editFormTitle : formTitle}</h3>
            <p>{editingLeadId ? editFormSubtitle : formSubtitle}</p>
          </div>
          <button type="button" className="ghost-button" onClick={closeLeadForm}>
            Cancel
          </button>
        </div>

        {missingClosingDetails && (
          <div className="closing-details-prompt">
            <strong>Closing details needed</strong>
            <p>This loan has reached its closing date. Add the final loan amount, loan type, interest rate, first payment date, and any second lien details.</p>
          </div>
        )}

        <div className="lead-form-grid">
          <div className="field">
            <label htmlFor="client">{nameLabel} *</label>
            <input
              id="client"
              value={leadForm.client}
              onChange={(event) => updateLeadForm('client', event.target.value)}
              placeholder={namePlaceholder}
            />
          </div>

          <div className="field">
            <label htmlFor="partner">{partnerLabel} *</label>
            <input
              id="partner"
              value={leadForm.partner}
              onChange={(event) => updateLeadForm('partner', event.target.value)}
              placeholder={partnerPlaceholder}
              list="partner-options"
            />
            <datalist id="partner-options">
              {partners.filter((partner) => partner !== 'All Partners').map((partner) => (
                <option key={partner} value={partner} />
              ))}
            </datalist>
          </div>

          <div className="field">
            <label htmlFor="leadSource">Lead Source</label>
            <select
              id="leadSource"
              value={leadForm.leadSource}
              onChange={(event) => updateLeadForm('leadSource', event.target.value)}
            >
              {leadSourceOptions.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </div>

          {(shouldShowClientContactFields || shouldShowPartnerContactFields) && (
            <>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  value={leadForm.phone}
                  onChange={(event) => updateLeadForm('phone', event.target.value)}
                  placeholder="(864) 555-1234"
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={leadForm.email}
                  onChange={(event) => updateLeadForm('email', event.target.value)}
                  placeholder={shouldShowClientContactFields ? 'client@email.com' : 'agent@email.com'}
                />
              </div>

              {shouldShowClientContactFields && (
                <div className="field checkbox-field full">
                  <label htmlFor="hasCoBorrower">
                    <input
                      id="hasCoBorrower"
                      type="checkbox"
                      checked={Boolean(leadForm.hasCoBorrower)}
                      onChange={(event) => updateLeadForm('hasCoBorrower', event.target.checked)}
                    />
                    Add co-borrower
                  </label>
                </div>
              )}

              {shouldShowClientContactFields && leadForm.hasCoBorrower && (
                <>
                  <div className="field">
                    <label htmlFor="coBorrower">Co-Borrower</label>
                    <input
                      id="coBorrower"
                      value={leadForm.coBorrower}
                      onChange={(event) => updateLeadForm('coBorrower', event.target.value)}
                      placeholder="Co-borrower name"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="coBorrowerPhone">Co-Borrower Phone</label>
                    <input
                      id="coBorrowerPhone"
                      value={leadForm.coBorrowerPhone}
                      onChange={(event) => updateLeadForm('coBorrowerPhone', event.target.value)}
                      placeholder="(864) 555-1234"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="coBorrowerEmail">Co-Borrower Email</label>
                    <input
                      id="coBorrowerEmail"
                      type="email"
                      value={leadForm.coBorrowerEmail}
                      onChange={(event) => updateLeadForm('coBorrowerEmail', event.target.value)}
                      placeholder="co-borrower@email.com"
                    />
                  </div>
                </>
              )}

              {shouldShowPartnerContactFields && (
                <div className="field full">
                  <label htmlFor="brokerage">Brokerage</label>
                  <input
                    id="brokerage"
                    value={leadForm.brokerage}
                    onChange={(event) => updateLeadForm('brokerage', event.target.value)}
                    placeholder="Brokerage or team affiliation"
                  />
                </div>
              )}
            </>
          )}

          <div className="field">
            <label htmlFor="leadType">Lead Type</label>
            <select
              id="leadType"
              value={leadForm.leadType}
              onChange={(event) => updateLeadForm('leadType', event.target.value)}
            >
              {leadTypeOptions.map((leadType) => (
                <option key={leadType}>{leadType}</option>
              ))}
            </select>
          </div>

          {shouldShowStageField && (
            <div className="field">
              <label htmlFor="stage">Lead Stage</label>
              <select
                id="stage"
                value={leadForm.stage}
                onChange={(event) => updateLeadForm('stage', event.target.value)}
              >
                {getStageOptionsForLeadType(leadForm.leadType).map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>
          )}

          {shouldShowManualDateFields && (
            <div className="field">
              <label htmlFor="referralDate">Referral Date</label>
              <input
                id="referralDate"
                type="date"
                value={leadForm.referralDate}
                onChange={(event) => updateLeadForm('referralDate', event.target.value)}
              />
            </div>
          )}

          {shouldShowLoanAmount && (
            <>
              <div className="field">
                <label htmlFor="loanAmount">Loan Amount</label>
                <input
                  id="loanAmount"
                  type="text"
                  inputMode="numeric"
                  value={leadForm.loanAmount}
                  onChange={(event) => updateLeadForm('loanAmount', event.target.value)}
                  placeholder="425,000"
                />
              </div>

              <div className="field">
                <label htmlFor="purchasePrice">Purchase Price</label>
                <input
                  id="purchasePrice"
                  type="text"
                  inputMode="numeric"
                  value={leadForm.purchasePrice}
                  onChange={(event) => updateLeadForm('purchasePrice', event.target.value)}
                  placeholder="500,000"
                />
              </div>

              <div className="field">
                <label htmlFor="propertyAddress">Property Address</label>
                <input
                  id="propertyAddress"
                  value={leadForm.propertyAddress}
                  onChange={(event) => updateLeadForm('propertyAddress', event.target.value)}
                  placeholder="123 Main St, Greenville, SC"
                />
              </div>

              <div className="field">
                <label htmlFor="creditScore">Credit Score</label>
                <input
                  id="creditScore"
                  type="number"
                  inputMode="numeric"
                  min="300"
                  max="850"
                  value={leadForm.creditScore}
                  onChange={(event) => updateLeadForm('creditScore', event.target.value)}
                  placeholder="720"
                />
              </div>
            </>
          )}

          {shouldShowClosingDate && (
            <div className="field">
              <label htmlFor="closingDate">Closing Date</label>
              <input
                id="closingDate"
                type="date"
                value={leadForm.closingDate}
                onChange={(event) => updateLeadForm('closingDate', event.target.value)}
              />
            </div>
          )}

          {shouldShowClosingDate && (
            <div className="field">
              <label htmlFor="contractDate">Contract / File Start Date</label>
              <input
                id="contractDate"
                type="date"
                value={leadForm.contractDate}
                onChange={(event) => updateLeadForm('contractDate', event.target.value)}
              />
            </div>
          )}

          {shouldShowAppraisalFields && (
            <>
              <div className="field section-heading full">
                <strong>Appraisal Tracking</strong>
                <span>Track appraisal status and due dates for in-process loans.</span>
              </div>

              <div className="field checkbox-field">
                <label htmlFor="appraisalOrdered">
                  <input
                    id="appraisalOrdered"
                    type="checkbox"
                    checked={leadForm.appraisalOrdered}
                    onChange={(event) => updateLeadForm('appraisalOrdered', event.target.checked)}
                  />
                  Appraisal ordered
                </label>
              </div>

              <div className="field">
                <label htmlFor="appraisalDueDate">Appraisal Due Date</label>
                <input
                  id="appraisalDueDate"
                  type="date"
                  value={leadForm.appraisalDueDate}
                  onChange={(event) => updateLeadForm('appraisalDueDate', event.target.value)}
                />
              </div>

              <div className="field checkbox-field">
                <label htmlFor="appraisalReceived">
                  <input
                    id="appraisalReceived"
                    type="checkbox"
                    checked={leadForm.appraisalReceived}
                    onChange={(event) => updateLeadForm('appraisalReceived', event.target.checked)}
                  />
                  Appraisal received
                </label>
              </div>

              <div className="field full">
                <label htmlFor="appraisalNotes">Appraisal Notes</label>
                <textarea
                  id="appraisalNotes"
                  value={leadForm.appraisalNotes}
                  onChange={(event) => updateLeadForm('appraisalNotes', event.target.value)}
                  placeholder="Example: Ordered with AMC, due Friday, waiting on revision, value came in..."
                />
              </div>
            </>
          )}

          {shouldPromptForClosingDetails && (
            <>
              <div className="field section-heading full">
                <strong>Final Loan Details</strong>
                <span>Complete this once the loan reaches closing.</span>
              </div>

              <div className="field">
                <label htmlFor="loanType">Loan Type *</label>
                <input
                  id="loanType"
                  value={leadForm.loanType}
                  onChange={(event) => updateLeadForm('loanType', event.target.value)}
                  placeholder="Conventional, FHA, VA, USDA..."
                />
              </div>

              <div className="field">
                <label htmlFor="interestRate">Interest Rate *</label>
                <input
                  id="interestRate"
                  value={leadForm.interestRate}
                  onChange={(event) => updateLeadForm('interestRate', event.target.value)}
                  placeholder="6.500%"
                />
              </div>

              <div className="field">
                <label htmlFor="firstPaymentDate">First Payment Date *</label>
                <input
                  id="firstPaymentDate"
                  type="date"
                  value={leadForm.firstPaymentDate}
                  onChange={(event) => updateLeadForm('firstPaymentDate', event.target.value)}
                />
              </div>

              <div className="field checkbox-field">
                <label htmlFor="hasSecondLien">
                  <input
                    id="hasSecondLien"
                    type="checkbox"
                    checked={leadForm.hasSecondLien}
                    onChange={(event) => updateLeadForm('hasSecondLien', event.target.checked)}
                  />
                  Add second lien / down payment assistance
                </label>
              </div>

              {leadForm.hasSecondLien && (
                <>
                  <div className="field">
                    <label htmlFor="secondLienType">Second Lien Type</label>
                    <input
                      id="secondLienType"
                      value={leadForm.secondLienType}
                      onChange={(event) => updateLeadForm('secondLienType', event.target.value)}
                      placeholder="DPA, forgivable second, repayable second..."
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="secondLienAmount">Second Lien Amount</label>
                    <input
                      id="secondLienAmount"
                      type="text"
                      inputMode="numeric"
                      value={leadForm.secondLienAmount}
                      onChange={(event) => updateLeadForm('secondLienAmount', event.target.value)}
                      placeholder="10,000"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {shouldShowManualDateFields && (
            <div className="field">
              <label htmlFor="lastTouch">Last Touch</label>
              <input
                id="lastTouch"
                type="date"
                value={leadForm.lastTouch}
                onChange={(event) => updateLeadForm('lastTouch', event.target.value)}
              />
            </div>
          )}

          {shouldShowManagementFields && (
            <div className="field full">
              <label htmlFor="detail">{detailLabel}</label>
              <textarea
                id="detail"
                value={leadForm.detail}
                onChange={(event) => updateLeadForm('detail', event.target.value)}
                placeholder={detailPlaceholder}
              />
            </div>
          )}

          {shouldShowManagementFields && (
            <div className="field">
              <label htmlFor="nextAction">Next Action</label>
              <input
                id="nextAction"
                value={leadForm.nextAction}
                onChange={(event) => updateLeadForm('nextAction', event.target.value)}
                placeholder="Call, text, review docs, send strategy..."
              />
            </div>
          )}

          {shouldShowManagementFields && (
            <div className="field">
              <label htmlFor="nextActionDate">Next Action Date</label>
              <input
                id="nextActionDate"
                type="date"
                value={leadForm.nextActionDate}
                onChange={(event) => updateLeadForm('nextActionDate', event.target.value)}
              />
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={resetLeadForm}>Clear</button>
          <button type="submit" className="primary-button">{editingLeadId ? 'Save Changes' : 'Save Lead'}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="panel lead-pipeline-panel density-compact">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="primary-button" onClick={showLeadForm ? closeLeadForm : openAddLeadForm}>
          {showLeadForm ? 'Close Form' : addButtonLabel}
        </button>
      </div>

      <div className="pipeline-workspace">
        <aside className="pipeline-command-rail" aria-label="Lead pipeline controls">
          <div className="pipeline-sticky-dock">
            <div className="pipeline-rail-header">
              <span>Pipeline</span>
              <strong>{visibleLeads.length}</strong>
            </div>

            <div className="pipeline-rail-nav" aria-label="Quick navigation">
              <button type="button" className="pipeline-rail-nav-button" onClick={returnToPipelineTop}>
                Back to Top
              </button>
            </div>

            <div className="filters lead-pipeline-controls collapsed-filter-bar">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
              />
              <button type="button" className="filter-toggle-button" onClick={() => setShowFilters((current) => !current)}>
                <span aria-hidden="true">☷</span>
                Filters
                {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
              </button>
            </div>

            {showFilters && (
              <div className="filter-drawer">
                <div className="field">
                  <label htmlFor="partnerFilter">Partner</label>
                  <select id="partnerFilter" value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}>
                    {partners.map((partner) => (
                      <option key={partner}>{partner}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="sortMode">Sort</label>
                  <select id="sortMode" value={sortMode} onChange={(event) => setSortMode(event.target.value)} aria-label="Sort leads">
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-drawer-actions">
                  <button type="button" className="ghost-button small-button" onClick={() => {
                    setPartnerFilter('All Partners')
                    setSortMode('dateReferredDesc')
                  }}>
                    Reset Filters
                  </button>
                  <button type="button" className="primary-button small-button" onClick={() => setShowFilters(false)}>
                    Apply
                  </button>
                </div>
              </div>
            )}

            <div className="pipeline-tabs">
              <button
                type="button"
                className={pipelineView === 'all' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('all')}
              >
                All <span>{filteredLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'needsFollowUp' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('needsFollowUp')}
              >
                Follow-Up <span>{needsFollowUpLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'underContract' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('underContract')}
              >
                Contracts <span>{underContractLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'refi' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('refi')}
              >
                Refi <span>{refiLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'preApproved' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('preApproved')}
              >
                Pre-Approved <span>{preApprovedLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'closed' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('closed')}
              >
                Closed <span>{closedLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'dnq' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('dnq')}
              >
                DNQ <span>{dnqLeads.length}</span>
              </button>
              <button
                type="button"
                className={pipelineView === 'notInterested' ? 'tab-button active' : 'tab-button'}
                onClick={() => setPipelineView('notInterested')}
              >
                Not Interested <span>{notInterestedLeads.length}</span>
              </button>
            </div>

            <label className="pipeline-sort-control rail-sort-control" htmlFor="visibleSortMode">
              <span>Sort by</span>
              <select id="visibleSortMode" value={sortMode} onChange={(event) => setSortMode(event.target.value)} aria-label="Sort visible leads">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

          </div>
        </aside>

        <main className="pipeline-main-stage">
          <div className="pipeline-summary-strip" aria-label="Lead pipeline summary">
        {pipelineSummaryMetrics.map((metric) => (
          <button
            type="button"
            className={`pipeline-summary-card ${metric.tone} ${pipelineView === metric.view ? 'active' : ''}`}
            key={metric.label}
            onClick={() => setPipelineView(metric.view)}
            aria-pressed={pipelineView === metric.view}
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>

      <div className="pipeline-view-context">
        <p>{pipelineViewContext}</p>
      </div>

      {showLeadForm && !editingLeadId && renderLeadForm()}

      <div className="pipeline-workbar">
          <div className={showLeadCheckboxes ? 'bulk-lead-toolbar active' : 'bulk-lead-toolbar'}>
            {!showLeadCheckboxes ? (
              <button type="button" className="filter-menu-button" onClick={() => setBulkActionsOpen(true)}>
                <span aria-hidden="true">☷</span>
                Bulk Actions
              </button>
            ) : (
              <>
                <button type="button" className="filter-menu-button" onClick={toggleSelectVisibleLeads}>
                  <span aria-hidden="true">☷</span>
                  {allVisibleSelected ? 'Unselect Visible' : 'Select Visible'}
                </button>
                <div className="bulk-lead-status">
                  <strong>{selectedLeadIds.length}</strong> selected
                </div>
                <button type="button" className="ghost-button small-button" onClick={clearSelectedLeads}>
                  Done
                </button>
                {selectedLeadIds.length > 0 && (
                  <button type="button" className="danger-button small-button" onClick={deleteSelectedLeads}>
                    Delete
                  </button>
                )}
              </>
            )}
          </div>

        </div>

      <div className="lead-list">
          {visibleLeads.length > 0 ? (
            visibleLeads.map((lead) => {
              const isSelected = selectedLeadIds.includes(lead.id)
              const isDetailSelected = String(selectedLeadId) === String(lead.id)

              return (
                <div className={["lead-card-group", showLeadCheckboxes ? "select-mode" : "", isSelected ? "selected" : "", isDetailSelected ? "detail-selected" : ""].filter(Boolean).join(" ")} key={lead.id} data-lead-id={lead.id}>
                  {showLeadCheckboxes && (
                    <label className="lead-select-checkbox" aria-label={`Select ${lead.client}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLeadSelection(lead.id)}
                      />
                      <span />
                    </label>
                  )}
                  <MemoLeadCard
                    lead={lead}
                    onEdit={startEditingLead}
                    onArchive={archiveLead}
                    onMarkTouched={markTouchedToday}
                    onPushNextAction={pushNextActionThreeDays}
                    onQuickUpdate={quickUpdateLead}
                  />
                  {String(editingLeadId) === String(lead.id) && renderLeadForm()}
                </div>
              )
            })
          ) : (
            <div className="empty-state">
              <strong>{pipelineView === 'needsFollowUp' ? 'Nothing needs follow-up right now.' : pipelineView === 'closed' ? 'No closed clients found.' : pipelineView === 'dnq' ? 'No DNQ leads found.' : pipelineView === 'notInterested' ? 'No not interested leads found.' : 'No leads found.'}</strong>
              <p>{pipelineView === 'needsFollowUp'
                ? 'You’re caught up based on active statuses and due next actions.'
                : pipelineView === 'underContract'
                  ? 'Under contract files will appear here when their stage is set to Under Contract.'
                  : pipelineView === 'refi'
                    ? 'Refinance files will appear here when their stage is set to Refi.'
                    : pipelineView === 'preApproved'
                      ? 'Pre-approved leads will appear here when their stage is Pre-Approved or Pre-Qualified.'
                    : pipelineView === 'closed'
                      ? 'Closed clients will appear here once leads are marked Closed.'
                    : pipelineView === 'dnq'
                      ? 'DNQ leads will appear here when their stage includes DNQ.'
                    : pipelineView === 'notInterested'
                      ? 'Not Interested leads will appear here when their stage is set to Not Interested.'
                      : 'Try adjusting your search or partner filter.'}</p>
            </div>
          )}
        </div>
        </main>
      </div>
    </div>
  )
}
