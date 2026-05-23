import { useEffect, useRef, useState } from 'react'
import { money, shortDate, daysSince } from '../utils/formatting'
import { getLeadFollowUpPlan, isPastDue } from '../utils/cadence'
import { downloadLoaNeedsPdf } from '../utils/loaPdf'
import SuggestedMessagePanel from './SuggestedMessagePanel'

const inactiveLeadStages = new Set(['DNQ', 'Other Lender', 'Builder Lender', 'Not Interested', 'Closed'])
const activeClosingStages = new Set(['Refi', 'Under Contract', 'Conditional Approval', 'Clear to Close'])
const loanProgressOptions = ['In Processing', 'Initial Underwrite', 'Conditional Approval', 'Final Review', 'Clear to Close', 'Closed']
const quickEditStageOptions = [
  'New Referral',
  'Contact Attempted',
  'Application Started',
  'Pre-Approved',
  'Credit Plan',
  'DNQ',
  'Under Contract',
  'Refi',
  'Conditional Approval',
  'Clear to Close',
  'Closed',
  'Other Lender',
  'Builder Lender',
  'Not Interested',
]

const touchOutcomeOptions = [
  'Connected',
  'Left Voicemail',
  'No Response',
  'Sent Docs',
  'Waiting on Borrower',
  'Waiting on Partner',
  'Needs Follow-Up',
  'Completed',
]

function addDaysToDateKey(dateValue, days) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}


function displayValue(value) {
  return value || '—'
}

function formatPhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '')

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  return value || '—'
}

function yesNo(value) {
  return value ? 'Yes' : 'No'
}

function getLeadDateReferred(lead) {
  return lead.dateReferred
    || lead.originalDateReferred
    || lead.importedDateReferred
    || lead.rawDateReferred
    || lead.date_referred
    || lead.original_date_referred
    || lead.imported_date_referred
    || lead['Date Referred']
    || lead['date referred']
    || lead['Date referred']
    || lead['DATE REFERRED']
    || lead.referralDate
    || lead.referral_date
    || ''
}

function normalizeImportedDate(value) {
  if (!value) return ''

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value)
    return excelEpoch.toISOString().slice(0, 10)
  }

  const rawValue = String(value).trim()
  if (!rawValue) return ''

  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    return rawValue.slice(0, 10)
  }

  const slashDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashDateMatch) {
    const month = slashDateMatch[1].padStart(2, '0')
    const day = slashDateMatch[2].padStart(2, '0')
    const rawYear = slashDateMatch[3]
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    return `${year}-${month}-${day}`
  }

  const parsedDate = new Date(rawValue)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10)
  }

  return ''
}

function shortLeadDate(value) {
  const normalizedDate = normalizeImportedDate(value)
  if (!normalizedDate) return '—'

  const [year, month, day] = normalizedDate.split('-')
  if (!year || !month || !day) return '—'

  return `${month}/${day}/${year.slice(-2)}`
}

function getBusinessDaysUntil(dateValue) {
  if (!dateValue) return null

  const closingDate = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(closingDate.getTime())) return null

  const today = new Date()
  today.setHours(12, 0, 0, 0)

  let cursor = new Date(today)
  let businessDays = 0
  const direction = closingDate >= today ? 1 : -1

  while ((direction === 1 && cursor < closingDate) || (direction === -1 && cursor > closingDate)) {
    cursor.setDate(cursor.getDate() + direction)
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) businessDays += direction
  }

  return businessDays
}


function formatBusinessDaysLabel(days) {
  if (days === null) return '—'
  if (days === 0) return 'Today'
  if (days < 0) return `${Math.abs(days)} business day${Math.abs(days) === 1 ? '' : 's'} past`
  return `${days} business day${days === 1 ? '' : 's'}`
}

// Helper for legacy touch history formatting
function formatLegacyTouchDate(note = '') {
  const match = String(note).match(/\d{4}-\d{2}-\d{2}/)
  if (!match) return ''

  return shortDate(match[0])
}

function getTouchTypeLabel(activity) {
  const type = activity.type || 'Touch'
  const note = activity.note || ''

  if (type === 'Follow-Up Completed' || note.startsWith('Marked touched.')) {
    return 'Touch Logged'
  }

  return type
}

function getTouchNote(activity) {
  const note = activity.note || 'Lead touched.'
  const outcomePrefix = activity.outcome ? `${activity.outcome}: ` : ''

  if (note.startsWith('Marked touched.')) {
    const nextTouch = formatLegacyTouchDate(note)
    return nextTouch ? `Follow-up completed. Next touch scheduled for ${nextTouch}.` : 'Follow-up completed.'
  }

  return `${outcomePrefix}${note}`
}

function getActivityCategory(activity) {
  const type = String(activity.type || '').toLowerCase()
  const note = String(activity.note || '').toLowerCase()

  if (type.includes('call') || type.includes('voicemail')) return 'Calls'
  if (type.includes('email') || note.includes('email')) return 'Emails'
  if (type.includes('system')) return 'System'
  if (type.includes('note') || note) return 'Notes'

  return 'All'
}


function getActivityIcon(category) {
  if (category === 'Calls') return '☎'
  if (category === 'Emails') return '✉'
  if (category === 'System') return '⚙'
  if (category === 'Notes') return '✎'
  return '•'
}

// --- Mortgage Pipeline tracker helpers (Batch 1) ---
function getLoanProgressIndex(progress) {
  const index = loanProgressOptions.indexOf(progress)
  return index >= 0 ? index : 0
}

function getLoanProgressStatus(progress, currentProgress) {
  const progressIndex = getLoanProgressIndex(progress)
  const currentIndex = getLoanProgressIndex(currentProgress)

  if (progressIndex < currentIndex) return 'complete'
  if (progressIndex === currentIndex) return 'active'
  return 'upcoming'
}

function getApprovalSummary(lead) {
  const leadType = lead.leadType || 'Buyer Lead'
  const stage = lead.stage || lead.status || ''

  if (leadType === 'Agent Prospect') {
    if (stage === 'Active Relationship') return 'Active Relationship'
    if (stage === 'Referral Partner') return 'Referral Partner'
    if (stage === 'Dormant') return 'Dormant Relationship'
    if (stage === 'Meeting Scheduled' || stage === 'Met' || stage === 'Value Follow-Up Sent') return 'Relationship Building'
    return 'Prospecting'
  }

  if (leadType === 'Referral Partner') return 'Referral Partner'
  if (leadType === 'Listing Agent Relationship') return 'Agent Relationship'
  if (leadType === 'Past Client') return 'Past Client'

  if (stage === 'Pre-Approved') return 'Pre-Approved'
  if (stage === 'Conditional Approval') return 'Conditional Approval'
  if (stage === 'Clear to Close') return 'Clear to Close'
  if (stage === 'Under Contract') return 'Under Contract'
  if (stage === 'Closed') return 'Closed'
  if (stage === 'Credit Plan' || stage === 'DNQ') return 'Not Approved Yet'
  if (stage === 'Other Lender') return 'Other Lender'
  if (stage === 'Builder Lender') return 'Builder Lender'

  return 'Not Pre-Approved Yet'
}

function getLeadChipToneClassName(label) {
  const normalizedLabel = String(label || '').trim().toLowerCase()

  if (normalizedLabel === 'pre-approved' || normalizedLabel === 'clear to close') return 'chip-tone-green'
  if (normalizedLabel === 'under contract' || normalizedLabel === 'in process' || normalizedLabel === 'in processing' || normalizedLabel === 'conditional approval') return 'chip-tone-blue'
  if (normalizedLabel === 'closed') return 'chip-tone-gold'
  if (normalizedLabel === 'dnq') return 'chip-tone-red'
  if (normalizedLabel === 'contact attempted' || normalizedLabel === 'attempted to connect') return 'chip-tone-muted'
  if (normalizedLabel === 'new lead' || normalizedLabel === 'new referral') return 'chip-tone-navy'

  return ''
}

function getLeadChipClassName(label, type = 'default') {
  const normalizedLabel = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return [
    'collapsed-lead-chip',
    `chip-type-${type}`,
    normalizedLabel ? `chip-${normalizedLabel}` : '',
    type === 'stage' || type === 'approval' ? getLeadChipToneClassName(label) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function getNeedsListCopyText(lead, needsList) {
  const unmetNeeds = needsList.filter((item) => !item.met)
  const groupedNeeds = groupNeedsByOwner(lead, unmetNeeds)

  if (!unmetNeeds.length) {
    return `${lead.client || 'Client'} needs list:\nAll needs are currently marked complete.`
  }

  return [
    getNeedsListTitle(lead),
    ...groupedNeeds.flatMap((group) => [
      '',
      `${group.label}:`,
      ...group.items.map((item) => `- ${getNeedDisplayText(item)}`),
    ]),
  ].join('\n')
}

function getNeedsListTitle(lead) {
  return lead.coBorrower
    ? `${lead.client || 'Client'} & ${lead.coBorrower} file needs:`
    : `${lead.client || 'Client'} needs list:`
}

function getNeedOwnerOptions(lead) {
  return [
    { value: 'borrower', label: lead.client || 'Borrower' },
    ...(lead.coBorrower ? [{ value: 'coBorrower', label: lead.coBorrower }] : []),
    { value: 'both', label: lead.coBorrower ? 'Both borrowers' : 'Borrower' },
    { value: 'property', label: 'Property / File' },
    { value: 'internal', label: 'LOA / Internal' },
  ]
}

function getNeedOwnerLabel(lead, owner = 'borrower') {
  return getNeedOwnerOptions(lead).find((option) => option.value === owner)?.label || 'Borrower'
}

function getNeedDisplayText(item) {
  return String(item.text || '').replace(/^[A-Z]{1,4}\s+-\s+/i, '').trim()
}

function inferNeedOwner(lead, text) {
  const normalizedText = String(text || '').trim().toLowerCase()
  const borrowerFirstName = String(lead.client || '').trim().split(/\s+/)[0]?.toLowerCase()
  const coBorrowerFirstName = String(lead.coBorrower || '').trim().split(/\s+/)[0]?.toLowerCase()

  if (coBorrowerFirstName && normalizedText.startsWith(`${coBorrowerFirstName} -`)) return 'coBorrower'
  if (borrowerFirstName && normalizedText.startsWith(`${borrowerFirstName} -`)) return 'borrower'
  if (/^(lb|cb|cob|co-borrower)\s+-\s+/.test(normalizedText)) return lead.coBorrower ? 'coBorrower' : 'borrower'
  if (/^(file|property)\s+-\s+/.test(normalizedText)) return 'property'

  return 'borrower'
}

function groupNeedsByOwner(lead, needs) {
  const groups = new Map()

  needs.forEach((item) => {
    const owner = item.owner || inferNeedOwner(lead, item.text)
    const label = getNeedOwnerLabel(lead, owner)

    if (!groups.has(owner)) {
      groups.set(owner, { owner, label, items: [] })
    }

    groups.get(owner).items.push(item)
  })

  return Array.from(groups.values())
}

function copyTextWithTextarea(value) {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  return copied
}

function getNextBestActionInsight({
  lead,
  stage,
  followUpPlan,
  actionDue,
  smartFollowUpDue,
  stale,
  attemptedNoConnection,
  showClosingTiming,
  businessDaysUntilClosing,
  hasLoanAmount,
}) {
  const recommendedAction = lead.nextAction || followUpPlan.recommendedAction || 'Follow up with client'
  const recommendedChannel = followUpPlan.recommendedChannel || 'Touch'

  if (actionDue || followUpPlan.priority === 'Urgent') {
    return {
      tone: 'urgent',
      label: 'Priority',
      title: `${recommendedChannel} overdue`,
      detail: recommendedAction,
    }
  }

  if (smartFollowUpDue) {
    return {
      tone: 'due',
      label: 'Due today',
      title: `${recommendedChannel} today`,
      detail: recommendedAction,
    }
  }

  if (showClosingTiming && businessDaysUntilClosing !== null && businessDaysUntilClosing <= 7) {
    return {
      tone: 'closing',
      label: 'Closing watch',
      title: 'Review file milestones',
      detail: 'Check closing, appraisal, and final touch timing before the next milestone.',
    }
  }

  if (['Under Contract', 'Conditional Approval', 'Clear to Close', 'Refi'].includes(stage) && !lead.appraisalOrdered && !lead.appraisalReceived) {
    return {
      tone: 'closing',
      label: 'File check',
      title: 'Confirm appraisal status',
      detail: 'Appraisal is not marked ordered or received on this file.',
    }
  }

  if (!hasLoanAmount && ['Pre-Approved', 'Under Contract', 'Refi', 'Conditional Approval'].includes(stage)) {
    return {
      tone: 'missing',
      label: 'Data needed',
      title: 'Capture loan amount',
      detail: 'Add the target loan amount so this lead contributes to pipeline volume.',
    }
  }

  if (attemptedNoConnection) {
    return {
      tone: 'muted',
      label: 'Connection',
      title: 'Try a second touch',
      detail: recommendedAction,
    }
  }

  if (stale) {
    return {
      tone: 'due',
      label: 'Re-engage',
      title: 'Refresh the relationship',
      detail: recommendedAction,
    }
  }

  return {
    tone: 'steady',
    label: lead.nextActionDate ? 'Scheduled' : 'Needs date',
    title: lead.nextActionDate ? 'Next touch is set' : 'Set next touch',
    detail: recommendedAction,
  }
}

export default function LeadCard({ lead, onEdit, onArchive, onMarkTouched, onPushNextAction, onQuickUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showTouchLogger, setShowTouchLogger] = useState(false)
  const [showSuggestedMessage, setShowSuggestedMessage] = useState(false)
  const [showTaskComposer, setShowTaskComposer] = useState(false)
  const [activityFilter, setActivityFilter] = useState('All')
  const [touchType, setTouchType] = useState('Text')
  const [touchOutcome, setTouchOutcome] = useState('Connected')
  const [touchNote, setTouchNote] = useState('')
  const [touchNextAction, setTouchNextAction] = useState('')
  const [touchNextActionDate, setTouchNextActionDate] = useState('')
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    dueDate: '',
    channel: 'Task',
    note: '',
  })
  const [needDraft, setNeedDraft] = useState('')
  const [needOwnerDraft, setNeedOwnerDraft] = useState('borrower')
  const [needsCopyStatus, setNeedsCopyStatus] = useState('idle')
  const [isQuickEditing, setIsQuickEditing] = useState(false)
  const [quickEditDraft, setQuickEditDraft] = useState({
    client: '',
    phone: '',
    email: '',
    coBorrower: '',
    coBorrowerPhone: '',
    coBorrowerEmail: '',
    partner: '',
    referralDate: '',
    leadSource: '',
    leadType: '',
    stage: '',
    loanAmount: '',
    loanType: '',
    interestRate: '',
    creditScore: '',
    firstPaymentDate: '',
    closingDate: '',
    hasSecondLien: false,
    secondLienType: '',
    secondLienAmount: '',
    appraisalOrdered: false,
    appraisalDueDate: '',
    appraisalReceived: false,
    appraisalNotes: '',
    detail: '',
  })
  const cardRef = useRef(null)

  useEffect(() => {
    if (!isExpanded) return undefined

    function handleOutsideClick(event) {
      if (!cardRef.current || cardRef.current.contains(event.target)) return
      setIsExpanded(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [isExpanded])
  const stage = lead.stage || lead.status
  const inactiveLead = inactiveLeadStages.has(stage)
  const stale = !inactiveLead && daysSince(lead.lastTouch) >= 5
  const attemptedNoConnection = stage === 'Contact Attempted' || stage === 'Attempted to Connect'
  const actionDue = isPastDue(lead.nextActionDate)
  const followUpPlan = getLeadFollowUpPlan(lead)
  const priorityClass = followUpPlan.priority.toLowerCase().replace(/\s+/g, '-')
  const smartFollowUpDue = followUpPlan.priority === 'Urgent' || followUpPlan.priority === 'Due Today'
  const hasFutureFollowUp = Boolean(lead.nextActionDate) && !smartFollowUpDue && !actionDue
  const showFollowUpReasons = inactiveLead ? actionDue || smartFollowUpDue : stale || attemptedNoConnection || actionDue || smartFollowUpDue
  const touchHistory = lead.touchHistory || []
  const activityTabs = ['All', 'Notes', 'Calls', 'Emails', 'System']
  const clientFileActivity = [
    ...touchHistory.map((activity) => ({
    id: activity.id || `${activity.date}-${activity.type}-${activity.note}`,
    type: getTouchTypeLabel(activity),
    category: getActivityCategory(activity),
    title: getTouchTypeLabel(activity),
    detail: getTouchNote(activity),
    date: activity.date,
    initials: activity.initials || 'BM',
  })),
  {
    id: 'lead-created',
    type: 'System',
    category: 'System',
    title: 'Lead created',
    detail: `${lead.client} was added to the CRM.`,
    date: getLeadDateReferred(lead),
    initials: 'CRM',
  },
]

  const filteredActivity = activityFilter === 'All'
    ? clientFileActivity
    : clientFileActivity.filter((activity) => activity.category === activityFilter)

  const recentActivity = filteredActivity.slice(0, 5)  
  const approvalSummary = getApprovalSummary(lead)
  const stageLabel = stage
  const leadTypeLabel = lead.leadType || 'Buyer Lead'
  const showApprovalSummary = approvalSummary && approvalSummary !== stageLabel && approvalSummary !== leadTypeLabel
  const showClosingTiming = activeClosingStages.has(stage) && lead.closingDate
  const businessDaysUntilClosing = getBusinessDaysUntil(lead.closingDate)
  const loanProgress = lead.loanProgress || lead.pipelineStatus || (stage === 'Refi' ? 'In Processing' : stage)
  const showLoanProgress = activeClosingStages.has(stage) || Boolean(lead.loanProgress || lead.pipelineStatus)
  const isClosedLead = stage === 'Closed' || loanProgress === 'Closed'
  const hasLoanAmount = Number(lead.loanAmount) > 0
  const needsList = Array.isArray(lead.needsList) ? lead.needsList : []
  const unmetNeedsCount = needsList.filter((item) => !item.met).length
  const needOwnerOptions = getNeedOwnerOptions(lead)
  const nextBestAction = getNextBestActionInsight({
    lead,
    stage,
    followUpPlan,
    actionDue,
    smartFollowUpDue,
    stale,
    attemptedNoConnection,
    showClosingTiming,
    businessDaysUntilClosing,
    hasLoanAmount,
  })

  const clientFileTasks = [
    lead.manualTaskActive && {
      id: 'manual-task',
      tone: actionDue || followUpPlan.priority === 'Urgent' ? 'urgent' : 'normal',
      label: followUpPlan.priority,
      title: lead.nextAction || 'Manual task',
      detail: lead.manualTaskNote || `Recommended channel: ${lead.manualTaskChannel || followUpPlan.recommendedChannel || 'Task'}`,
      date: shortDate(lead.nextActionDate),
      actionLabel: 'Log Touch',
      onClick: openTouchLogger,
    },
    actionDue && !lead.manualTaskActive && {
      id: 'next-action-due',
      tone: 'urgent',
      label: 'Overdue',
      title: 'Complete next action',
      detail: lead.nextAction || followUpPlan.recommendedAction,
      date: shortDate(lead.nextActionDate),
      actionLabel: 'Log Touch',
      onClick: openTouchLogger,
    },
    !isClosedLead && !lead.appraisalOrdered && !lead.appraisalReceived && activeClosingStages.has(stage) && {
      id: 'appraisal-not-ordered',
      tone: 'warning',
      label: 'Appraisal',
      title: 'Confirm appraisal order',
      detail: 'Appraisal has not been marked ordered or received.',
      date: shortDate(lead.appraisalDueDate),
      actionLabel: 'Mark Ordered',
      onClick: (event) => quickUpdateAppraisal({ appraisalOrdered: true }, event),
    },
    !isClosedLead && lead.appraisalDueDate && !lead.appraisalReceived && {
      id: 'appraisal-due',
      tone: isPastDue(lead.appraisalDueDate) ? 'urgent' : 'normal',
      label: 'Appraisal Due',
      title: isPastDue(lead.appraisalDueDate) ? 'Appraisal due date has passed' : 'Track appraisal due date',
      detail: lead.appraisalNotes || 'Confirm appraisal status before the next milestone.',
      date: shortDate(lead.appraisalDueDate),
      actionLabel: 'Mark Received',
      onClick: (event) => quickUpdateAppraisal({ appraisalReceived: true }, event),
    },
    smartFollowUpDue && !actionDue && !lead.manualTaskActive && {
      id: 'smart-follow-up',
      tone: followUpPlan.priority === 'Urgent' ? 'urgent' : 'normal',
      label: followUpPlan.priority,
      title: followUpPlan.recommendedAction,
      detail: `Recommended channel: ${followUpPlan.recommendedChannel}`,
      date: shortDate(lead.nextActionDate),
      actionLabel: 'Suggested Message',
      onClick: toggleSuggestedMessage,
    },
  ].filter(Boolean)

  function openTouchLogger(event) {
    event.stopPropagation()
    setTouchNextAction(lead.nextAction || followUpPlan.recommendedAction || '')
    setTouchNextActionDate(lead.nextActionDate || addDaysToDateKey(new Date().toISOString().slice(0, 10), 3))
    setShowTouchLogger((current) => !current)
    setShowSuggestedMessage(false)
    setShowTaskComposer(false)
    setIsExpanded(true)
  }

  function toggleSuggestedMessage(event) {
    event.stopPropagation()
    setShowSuggestedMessage((current) => !current)
    setShowTouchLogger(false)
    setShowTaskComposer(false)
    setIsExpanded(true)
  }

  function openTaskComposer(event) {
    event.stopPropagation()
    const today = new Date().toISOString().slice(0, 10)

    setTaskDraft({
      title: lead.nextAction || followUpPlan.recommendedAction || '',
      dueDate: lead.nextActionDate || today,
      channel: lead.manualTaskChannel || followUpPlan.recommendedChannel || 'Task',
      note: lead.manualTaskNote || '',
    })
    setShowTaskComposer((current) => !current)
    setShowTouchLogger(false)
    setShowSuggestedMessage(false)
    setIsExpanded(true)
  }

  function updateTaskDraft(field, value) {
    setTaskDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function saveTouch(event) {
    event.stopPropagation()

    onMarkTouched(lead.id, {
      type: touchType,
      outcome: touchOutcome,
      note: touchNote.trim() || `${touchType}: ${touchOutcome}.`,
      nextAction: touchNextAction.trim(),
      nextActionDate: touchNextActionDate,
      date: new Date().toISOString().slice(0, 10),
      meaningful: true,
    })

    setTouchType('Text')
    setTouchOutcome('Connected')
    setTouchNote('')
    setTouchNextAction('')
    setTouchNextActionDate('')
    setShowTouchLogger(false)
  }

  function saveManualTask(event) {
    event.stopPropagation()

    const title = taskDraft.title.trim()

    if (!title) {
      alert('Add a task before saving.')
      return
    }

    if (!taskDraft.dueDate) {
      alert('Choose a due date for this task.')
      return
    }

    const taskEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${lead.id}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'Manual Task Created',
      note: `${title} due ${shortDate(taskDraft.dueDate)}.${taskDraft.note.trim() ? ` ${taskDraft.note.trim()}` : ''}`,
    }

    if (onQuickUpdate) {
      onQuickUpdate(lead.id, {
        nextAction: title,
        nextActionDate: taskDraft.dueDate,
        manualTaskActive: true,
        manualTaskChannel: taskDraft.channel,
        manualTaskNote: taskDraft.note.trim(),
        manualTaskCreatedAt: new Date().toISOString(),
        manualTaskCompletedAt: '',
        touchHistory: [taskEntry, ...(lead.touchHistory || [])],
      })
    } else {
      onEdit(lead)
    }

    setShowTaskComposer(false)
  }

  function saveNeedsList(nextNeedsList) {
    if (onQuickUpdate) {
      onQuickUpdate(lead.id, { needsList: nextNeedsList })
      return
    }

    onEdit(lead)
  }

  function addNeedItem(event) {
    event.stopPropagation()
    const text = needDraft.trim()

    if (!text) return

    saveNeedsList([
      ...needsList,
      {
        id: crypto.randomUUID?.() || `${Date.now()}-${lead.id}`,
        text,
        owner: needOwnerDraft,
        met: false,
        createdAt: new Date().toISOString(),
      },
    ])
    setNeedDraft('')
  }

  function toggleNeedItem(itemId, met) {
    saveNeedsList(needsList.map((item) => (
      item.id === itemId
        ? { ...item, met, completedAt: met ? new Date().toISOString() : '' }
        : item
    )))
  }

  function removeNeedItem(itemId) {
    saveNeedsList(needsList.filter((item) => item.id !== itemId))
  }

  function generateLoaPdf(event) {
    event.stopPropagation()
    downloadLoaNeedsPdf({ lead, needsList, followUpPlan })
  }

  function copyNeedsList(event) {
    event.stopPropagation()
    const copyText = getNeedsListCopyText(lead, needsList)

    try {
      const copied = copyTextWithTextarea(copyText)

      if (!copied && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(copyText).catch((error) => {
          console.error('Unable to copy needs list:', error)
        })
      }

      setNeedsCopyStatus('copied')
      window.setTimeout(() => setNeedsCopyStatus('idle'), 1800)
    } catch (error) {
      console.error('Unable to copy needs list:', error)
      alert('Unable to copy the needs list. You can still select the items manually.')
    }
  }

  function quickUpdateLoanProgress(progress, event) {
    event.stopPropagation()

    if (onQuickUpdate) {
      onQuickUpdate(lead.id, {
        loanProgress: progress,
        ...(progress === 'Closed' ? { stage: 'Closed', status: 'Closed' } : {}),
      })
      return
    }

    onEdit(lead)
  }

  function quickUpdateAppraisal(updates, event) {
    event.stopPropagation()

    if (onQuickUpdate) {
      onQuickUpdate(lead.id, updates)
      return
    }

    onEdit(lead)
  }

  function startQuickEdit(event) {
    event.stopPropagation()
    setQuickEditDraft({
      client: lead.client || '',
      phone: lead.phone || '',
      email: lead.email || '',
      coBorrower: lead.coBorrower || '',
      coBorrowerPhone: lead.coBorrowerPhone || '',
      coBorrowerEmail: lead.coBorrowerEmail || '',
      partner: lead.partner || '',
      referralDate: normalizeImportedDate(getLeadDateReferred(lead)),
      leadSource: lead.leadSource || '',
      leadType: lead.leadType || 'Buyer Lead',
      stage: lead.stage || lead.status || '',
      loanAmount: lead.loanAmount || '',
      loanType: lead.loanType || '',
      interestRate: lead.interestRate || '',
      creditScore: lead.creditScore || '',
      firstPaymentDate: lead.firstPaymentDate || '',
      closingDate: lead.closingDate || '',
      hasSecondLien: Boolean(lead.hasSecondLien || lead.secondLienAmount || lead.secondLienType),
      secondLienType: lead.secondLienType || '',
      secondLienAmount: lead.secondLienAmount || '',
      appraisalOrdered: Boolean(lead.appraisalOrdered),
      appraisalDueDate: lead.appraisalDueDate || '',
      appraisalReceived: Boolean(lead.appraisalReceived),
      appraisalNotes: lead.appraisalNotes || '',
      detail: lead.detail || '',
    })
    setIsQuickEditing(true)
  }

  function updateQuickEditDraft(field, value) {
    setQuickEditDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function cancelQuickEdit(event) {
    event.stopPropagation()
    setIsQuickEditing(false)
  }

  function saveQuickEdit(event) {
    event.stopPropagation()

    const updates = {
      client: quickEditDraft.client.trim() || lead.client,
      phone: quickEditDraft.phone,
      email: quickEditDraft.email,
      coBorrower: quickEditDraft.coBorrower.trim(),
      coBorrowerPhone: quickEditDraft.coBorrowerPhone,
      coBorrowerEmail: quickEditDraft.coBorrowerEmail,
      partner: quickEditDraft.partner,
      referralDate: quickEditDraft.referralDate,
      dateReferred: quickEditDraft.referralDate,
      leadSource: quickEditDraft.leadSource,
      leadType: quickEditDraft.leadType,
      stage: quickEditDraft.stage,
      status: quickEditDraft.stage,
      loanAmount: quickEditDraft.loanAmount,
      loanType: quickEditDraft.loanType,
      interestRate: quickEditDraft.interestRate,
      creditScore: quickEditDraft.creditScore,
      firstPaymentDate: quickEditDraft.firstPaymentDate,
      closingDate: quickEditDraft.closingDate,
      hasSecondLien: Boolean(quickEditDraft.hasSecondLien),
      secondLienType: quickEditDraft.hasSecondLien ? quickEditDraft.secondLienType : '',
      secondLienAmount: quickEditDraft.hasSecondLien ? quickEditDraft.secondLienAmount : '',
      appraisalOrdered: Boolean(quickEditDraft.appraisalOrdered),
      appraisalDueDate: quickEditDraft.appraisalDueDate,
      appraisalReceived: Boolean(quickEditDraft.appraisalReceived),
      appraisalNotes: quickEditDraft.appraisalNotes,
      detail: quickEditDraft.detail,
    }

    if (onQuickUpdate) {
      onQuickUpdate(lead.id, updates)
    } else {
      onEdit(lead)
    }

    setIsQuickEditing(false)
  }

  function callLead(event) {
    event.stopPropagation()
    if (!lead.phone) return
    window.location.href = `tel:${lead.phone}`
  }

  function emailLead(event) {
    event.stopPropagation()
    if (!lead.email) return
    window.location.href = `mailto:${lead.email}`
  }

  const leadCardClassName = [
    'lead-card',
    isExpanded ? 'lead-card-expanded-detail' : '',
    showClosingTiming ? 'closing-file' : '',
    (actionDue || smartFollowUpDue) && followUpPlan.priority !== 'Due Today' ? 'action-due-file' : '',
    followUpPlan.priority === 'Urgent' ? 'urgent-follow-up-file' : '',
    followUpPlan.priority === 'Due Today' ? 'due-today-file' : '',
    hasFutureFollowUp ? 'future-follow-up-file' : '',
    !lead.nextActionDate ? 'missing-follow-up-file' : '',
    `next-action-${nextBestAction.tone}`,
  ].filter(Boolean).join(' ')

  return (
    <article
      ref={cardRef}
      className={leadCardClassName}
      onClick={() => setIsExpanded((current) => !current)}
    >
      <div className="lead-topline">
        <div className="collapsed-lead-identity">
          <div className="name-row">
            <h3 className="collapsed-lead-name-stack">
              <span>{String(lead.client || '').split(' ')[0]}</span>
              <span>{String(lead.client || '').split(' ').slice(1).join(' ')}</span>
            </h3>
          </div>

          <p className="muted lead-referral-line">
            {lead.leadType === 'Agent Prospect' ? 'Source' : 'Referred by'} <strong>{lead.partner}</strong>{getLeadDateReferred(lead) ? ` on ${shortLeadDate(getLeadDateReferred(lead))}` : ''}
          </p>

          <div className="meta-row collapsed-lead-chips">
            <span className={getLeadChipClassName(leadTypeLabel, 'lead-type')}>{leadTypeLabel}</span>
            <span className={getLeadChipClassName(stageLabel, 'stage')}>{stageLabel}</span>
            {lead.leadSource && <span className={getLeadChipClassName(lead.leadSource, 'source')}>Source: {lead.leadSource}</span>}
            {showApprovalSummary && <span className={getLeadChipClassName(approvalSummary, 'approval')}>{approvalSummary}</span>}
          </div>
        </div>

          <div className="lead-stats">
            <div className="lead-stat-item lead-stat-date-referred">
              <span>Date Referred</span>
              <strong>{shortLeadDate(getLeadDateReferred(lead))}</strong>
            </div>
          <div className="lead-stat-item">
            <span>Loan Amount</span>
            <strong className={hasLoanAmount ? '' : 'missing-data-value'}>
              {hasLoanAmount ? money(lead.loanAmount) : 'Not captured'}
            </strong>
          </div>
          <div className="lead-stat-item">
            <span>Last Touch</span>
            <strong>{shortDate(lead.lastTouch)}</strong>
          </div>
          <div className="lead-stat-item">
            <span>Next Touch</span>
            <strong>{shortDate(lead.nextActionDate)}</strong>
          </div>
        </div>

        <div className="lead-summary-row">
          {showClosingTiming && (
            <div className="closing-focus-strip">
              <span>Closing</span>
              <strong>{shortDate(lead.closingDate)}</strong>
              <b>{formatBusinessDaysLabel(businessDaysUntilClosing)}</b>
            </div>
          )}

          <div className={`next-best-action-card tone-${nextBestAction.tone}`}>
            <span>{nextBestAction.label}</span>
            <strong>{nextBestAction.title}</strong>
            <p>{nextBestAction.detail}</p>
          </div>

          <div className={`smart-follow-up-strip priority-${priorityClass}`}>
            <div className="smart-follow-up-headline">
              <span>{followUpPlan.priority} · {followUpPlan.recommendedChannel}</span>
              <p>{followUpPlan.recommendedAction}</p>
            </div>
          </div>
        </div>
      </div>

      {showFollowUpReasons && (
        <div className="reason-row">
          {attemptedNoConnection && <span className="reason-chip warning">Attempted Contact</span>}
          {stale && <span className="reason-chip danger">Stale Touch</span>}
          {actionDue && <span className="reason-chip navy">Action Due</span>}
          {smartFollowUpDue && <span className="reason-chip navy">{followUpPlan.priority}</span>}
        </div>
      )}

      {isExpanded && (
        <div className={`lead-client-file-page ${isQuickEditing ? 'is-editing-client-file' : ''}`}>
          <div className="client-file-hero" onClick={(event) => event.stopPropagation()}>
            <div className="client-file-hero-main">
              <div className="client-file-title-row">
                <div>
                  <p className="client-file-eyebrow">Client File</p>
                  <h2 className="client-file-name-stack">
                    <span>{String(lead.client || '').split(' ')[0]}</span>
                    <span>{String(lead.client || '').split(' ').slice(1).join(' ')}</span>
                  </h2>
                </div>
                <div className="client-file-quick-actions" aria-label="Client quick actions">
                  <button type="button" className="client-file-action-button" onClick={callLead} disabled={!lead.phone}>
                    <span className="client-file-action-icon" aria-hidden="true">☎</span>
                    <span>Call</span>
                  </button>
                  <button type="button" className="client-file-action-button" onClick={emailLead} disabled={!lead.email}>
                    <span className="client-file-action-icon" aria-hidden="true">✉</span>
                    <span>Email</span>
                  </button>
                  <button type="button" className="client-file-action-button" onClick={startQuickEdit}>
                    <span className="client-file-action-icon" aria-hidden="true">✎</span>
                    <span>Quick Edit</span>
                  </button>
                  <button type="button" className="client-file-action-button" onClick={openTouchLogger}>
                    <span className="client-file-action-icon" aria-hidden="true">☑</span>
                    <span>Log Touch</span>
                  </button>
                  <button type="button" className="client-file-action-button" onClick={(event) => {
                    openTaskComposer(event)
                  }}>
                    <span className="client-file-action-icon" aria-hidden="true">+</span>
                    <span>New Task</span>
                  </button>
                </div>
              </div>

              <div className="client-file-badges">
                <span>{leadTypeLabel}</span>
                <span>{stageLabel}</span>
                <span>{lead.leadSource || 'Referral Partner'}</span>
              </div>

              <p className="client-file-subtitle">
                Referred by <strong>{lead.partner || '—'}</strong>{getLeadDateReferred(lead) ? ` · Date Referred: ${shortLeadDate(getLeadDateReferred(lead))}` : ''}
              </p>
            </div>

            <div className="client-file-metrics-banner">
              <div>
                <span>Closing</span>
                <strong>{shortDate(lead.closingDate)}</strong>
                {showClosingTiming && <small>{formatBusinessDaysLabel(businessDaysUntilClosing)}</small>}
              </div>
              <div>
                <span>Appraisal Due</span>
                <strong>{shortDate(lead.appraisalDueDate)}</strong>
                <small>{lead.appraisalReceived ? 'Received' : lead.appraisalOrdered ? 'Ordered' : 'Not ordered'}</small>
              </div>
              <div>
                <span>Next Touch</span>
                <strong>{shortDate(lead.nextActionDate)}</strong>
                <small>{followUpPlan.priority}</small>
              </div>
            </div>
          </div>

          {isQuickEditing && (
            <div className="client-file-editing-banner" onClick={(event) => event.stopPropagation()}>
              <div>
                <strong>Editing Client File</strong>
                <span>Update the fields below, then save changes when finished.</span>
              </div>
              <button type="button" onClick={saveQuickEdit}>Save Changes</button>
            </div>
          )}

          <div className="client-file-snapshot">
            <div className="client-file-section">
              <div className="client-file-section-header">
                <strong>Client Details</strong>
                <span>Contact and lead source</span>
              </div>
              <div className="client-party-grid">
                <div className="client-party-card borrower">
                  <div className="client-party-card-header">
                    <span>Borrower</span>
                    {isQuickEditing ? (
                      <input
                        value={quickEditDraft.client}
                        onChange={(event) => updateQuickEditDraft('client', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="Borrower name"
                      />
                    ) : (
                      <strong>{displayValue(lead.client)}</strong>
                    )}
                  </div>
                  <div className="client-party-contact-grid">
                    <div>
                      <span>Phone</span>
                      {isQuickEditing ? (
                        <input
                          value={quickEditDraft.phone}
                          onChange={(event) => updateQuickEditDraft('phone', event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="Phone number"
                        />
                      ) : (
                        <strong>{formatPhoneNumber(lead.phone)}</strong>
                      )}
                    </div>
                    <div>
                      <span>Email</span>
                      {isQuickEditing ? (
                        <input
                          value={quickEditDraft.email}
                          onChange={(event) => updateQuickEditDraft('email', event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="Email address"
                        />
                      ) : (
                        <strong>{displayValue(lead.email)}</strong>
                      )}
                    </div>
                  </div>
                </div>

                <div className="client-party-card co-borrower">
                  <div className="client-party-card-header">
                    <span>Co-Borrower</span>
                    {isQuickEditing ? (
                      <input
                        value={quickEditDraft.coBorrower}
                        onChange={(event) => updateQuickEditDraft('coBorrower', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="Co-borrower name"
                      />
                    ) : (
                      <strong>{displayValue(lead.coBorrower)}</strong>
                    )}
                  </div>
                  <div className="client-party-contact-grid">
                    <div>
                      <span>Phone</span>
                      {isQuickEditing ? (
                        <input
                          value={quickEditDraft.coBorrowerPhone}
                          onChange={(event) => updateQuickEditDraft('coBorrowerPhone', event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="Co-borrower phone"
                        />
                      ) : (
                        <strong>{formatPhoneNumber(lead.coBorrowerPhone)}</strong>
                      )}
                    </div>
                    <div>
                      <span>Email</span>
                      {isQuickEditing ? (
                        <input
                          value={quickEditDraft.coBorrowerEmail}
                          onChange={(event) => updateQuickEditDraft('coBorrowerEmail', event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="Co-borrower email"
                        />
                      ) : (
                        <strong>{displayValue(lead.coBorrowerEmail)}</strong>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="client-file-grid client-file-meta-grid">
                <div>
                  <span>Referral Partner</span>
                  {isQuickEditing ? (
                    <input
                      value={quickEditDraft.partner}
                      onChange={(event) => updateQuickEditDraft('partner', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Referral partner"
                    />
                  ) : (
                    <strong>{displayValue(lead.partner)}</strong>
                  )}
                </div>
                <div>
                  <span>Referral Date</span>
                  {isQuickEditing ? (
                    <input
                      type="date"
                      value={quickEditDraft.referralDate}
                      onChange={(event) => updateQuickEditDraft('referralDate', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <strong>{shortLeadDate(getLeadDateReferred(lead))}</strong>
                  )}
                </div>
                <div>
                  <span>Approval / Status</span>
                  {isQuickEditing ? (
                    <select
                      value={quickEditDraft.stage}
                      onChange={(event) => updateQuickEditDraft('stage', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {quickEditStageOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <strong>{displayValue(stageLabel)}</strong>
                  )}
                </div>
                <div>
                  <span>Lead Source</span>
                  {isQuickEditing ? (
                    <input
                      value={quickEditDraft.leadSource}
                      onChange={(event) => updateQuickEditDraft('leadSource', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Lead source"
                    />
                  ) : (
                    <strong>{displayValue(lead.leadSource)}</strong>
                  )}
                </div>
                {isQuickEditing && (
                  <div>
                    <span>Lead Type</span>
                    <input
                      value={quickEditDraft.leadType}
                      onChange={(event) => updateQuickEditDraft('leadType', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Buyer Lead, Client Referral, Agent Referred..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="client-file-section">
              <div className="client-file-section-header">
                <strong>Loan Details</strong>
                <span>Current financing snapshot</span>
              </div>
              <div className="client-file-grid">
                <div>
                  <span>Loan Amount</span>
                  {isQuickEditing ? (
                    <input
                      value={quickEditDraft.loanAmount}
                      onChange={(event) => updateQuickEditDraft('loanAmount', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Example: 250000"
                    />
                  ) : (
                    <strong>{money(lead.loanAmount)}</strong>
                  )}
                </div>
                <div>
                  <span>Loan Type</span>
                  {isQuickEditing ? (
                    <input
                      value={quickEditDraft.loanType}
                      onChange={(event) => updateQuickEditDraft('loanType', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Conventional, FHA, VA, USDA..."
                    />
                  ) : (
                    <strong>{displayValue(lead.loanType)}</strong>
                  )}
                </div>
                <div>
                  <span>Interest Rate</span>
                  {isQuickEditing ? (
                    <input
                      value={quickEditDraft.interestRate}
                      onChange={(event) => updateQuickEditDraft('interestRate', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Example: 6.5"
                    />
                  ) : (
                    <strong>{lead.interestRate ? `${lead.interestRate}%` : '—'}</strong>
                  )}
                </div>
                <div>
                  <span>Credit Score</span>
                  {isQuickEditing ? (
                    <input
                      value={quickEditDraft.creditScore}
                      onChange={(event) => updateQuickEditDraft('creditScore', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      placeholder="Example: 720"
                    />
                  ) : (
                    <strong>{displayValue(lead.creditScore)}</strong>
                  )}
                </div>
                <div>
                  <span>First Payment</span>
                  {isQuickEditing ? (
                    <input
                      type="date"
                      value={quickEditDraft.firstPaymentDate}
                      onChange={(event) => updateQuickEditDraft('firstPaymentDate', event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <strong>{shortDate(lead.firstPaymentDate)}</strong>
                  )}
                </div>
                <div>
                  <span>Second Lien / DPA</span>
                  {isQuickEditing ? (
                    <label className="inline-edit-checkbox" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={quickEditDraft.hasSecondLien}
                        onChange={(event) => updateQuickEditDraft('hasSecondLien', event.target.checked)}
                      />
                      Yes
                    </label>
                  ) : (
                    <strong>{yesNo(lead.hasSecondLien || lead.secondLienAmount || lead.secondLienType)}</strong>
                  )}
                </div>
                {isQuickEditing && quickEditDraft.hasSecondLien && (
                  <>
                    <div>
                      <span>Second Lien Type</span>
                      <input
                        value={quickEditDraft.secondLienType}
                        onChange={(event) => updateQuickEditDraft('secondLienType', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="DPA, HELOC, Silent Second..."
                      />
                    </div>
                    <div>
                      <span>Second Lien Amount</span>
                      <input
                        value={quickEditDraft.secondLienAmount}
                        onChange={(event) => updateQuickEditDraft('secondLienAmount', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="Example: 10000"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {(showLoanProgress || lead.appraisalDueDate || lead.appraisalOrdered || lead.appraisalReceived) && (
              <div className="client-file-section full-width">
                <div className="client-file-section-header">
                  <strong>{isClosedLead ? 'Closed Loan Snapshot' : 'Contract / Refi Progress'}</strong>
                  <span>{isClosedLead ? 'Final loan details and post-closing record' : 'Milestones and appraisal timing'}</span>
                </div>

                {showLoanProgress && (
                  <div className="loan-progress-row mortgage-pipeline-tracker" aria-label="Mortgage pipeline progress">
                    {loanProgressOptions.map((progress) => {
                      const progressStatus = getLoanProgressStatus(progress, loanProgress)
                      const isActiveProgress = progressStatus === 'active'
                      const isCompleteProgress = progressStatus === 'complete'

                      return (
                        <button
                          type="button"
                          key={progress}
                          className={`loan-progress-step ${progressStatus}`}
                          aria-current={isActiveProgress ? 'step' : undefined}
                          onClick={(event) => quickUpdateLoanProgress(progress, event)}
                        >
                          <span className="loan-progress-marker" aria-hidden="true">
                            {isCompleteProgress ? '✓' : loanProgressOptions.indexOf(progress) + 1}
                          </span>
                          <span className="loan-progress-label">{progress}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="client-file-grid appraisal-grid">
                  <div><span>Current Progress</span><strong>{displayValue(loanProgress)}</strong></div>
                  <div>
                    <span>Closing Date</span>
                    {isQuickEditing ? (
                      <input
                        type="date"
                        value={quickEditDraft.closingDate}
                        onChange={(event) => updateQuickEditDraft('closingDate', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <strong>{shortDate(lead.closingDate)}</strong>
                    )}
                  </div>
                  <div>
                    <span>Appraisal Ordered</span>
                    {isQuickEditing ? (
                      <label className="inline-edit-checkbox" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={quickEditDraft.appraisalOrdered}
                          onChange={(event) => updateQuickEditDraft('appraisalOrdered', event.target.checked)}
                        />
                        Yes
                      </label>
                    ) : (
                      <strong>{yesNo(lead.appraisalOrdered)}</strong>
                    )}
                  </div>
                  <div>
                    <span>Appraisal Due</span>
                    {isQuickEditing ? (
                      <input
                        type="date"
                        value={quickEditDraft.appraisalDueDate}
                        onChange={(event) => updateQuickEditDraft('appraisalDueDate', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <strong>{shortDate(lead.appraisalDueDate)}</strong>
                    )}
                  </div>
                  <div>
                    <span>Appraisal Received</span>
                    {isQuickEditing ? (
                      <label className="inline-edit-checkbox" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={quickEditDraft.appraisalReceived}
                          onChange={(event) => updateQuickEditDraft('appraisalReceived', event.target.checked)}
                        />
                        Yes
                      </label>
                    ) : (
                      <strong>{yesNo(lead.appraisalReceived)}</strong>
                    )}
                  </div>
                  <div>
                    <span>Appraisal Notes</span>
                    {isQuickEditing ? (
                      <input
                        value={quickEditDraft.appraisalNotes}
                        onChange={(event) => updateQuickEditDraft('appraisalNotes', event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="Due date, value issue, revision, etc."
                      />
                    ) : (
                      <strong>{displayValue(lead.appraisalNotes)}</strong>
                    )}
                  </div>
                </div>

                {!isClosedLead && !isQuickEditing && (
                  <div className="appraisal-quick-actions">
                    <button
                      type="button"
                      onClick={(event) => quickUpdateAppraisal({ appraisalOrdered: true }, event)}
                    >
                      Mark Appraisal Ordered
                    </button>
                    <button
                      type="button"
                      onClick={(event) => quickUpdateAppraisal({ appraisalReceived: true }, event)}
                    >
                      Mark Appraisal Received
                    </button>
                    <button
                      type="button"
                      onClick={(event) => quickUpdateAppraisal({ appraisalOrdered: false, appraisalReceived: false }, event)}
                    >
                      Appraisal Not Ordered
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="detail expanded-detail-note">
            <strong>Notes</strong>
            {isQuickEditing ? (
              <textarea
                value={quickEditDraft.detail}
                onChange={(event) => updateQuickEditDraft('detail', event.target.value)}
                onClick={(event) => event.stopPropagation()}
                rows="4"
                placeholder="Add loan notes, borrower context, risks, or next steps..."
              />
            ) : (
              <p>{lead.detail || 'No notes added yet.'}</p>
            )}
          </div>

          <div className="client-file-needs" onClick={(event) => event.stopPropagation()}>
            <div className="client-file-section-header">
              <strong>Needs List</strong>
              <span>{unmetNeedsCount} unmet</span>
            </div>

            <form className="needs-list-add-row" onSubmit={(event) => {
              event.preventDefault()
              addNeedItem(event)
            }}>
              <select
                value={needOwnerDraft}
                onChange={(event) => setNeedOwnerDraft(event.target.value)}
                aria-label="Needs list owner"
              >
                {needOwnerOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                value={needDraft}
                onChange={(event) => setNeedDraft(event.target.value)}
                placeholder="Add condition, document, or LOA follow-up..."
              />
              <button type="submit">Add</button>
            </form>

            {needsList.length > 0 ? (
              <div className="needs-list-items">
                {needsList.map((item) => (
                  <div className={item.met ? 'needs-list-item met' : 'needs-list-item'} key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(item.met)}
                        onChange={(event) => toggleNeedItem(item.id, event.target.checked)}
                      />
                      <b>{getNeedOwnerLabel(lead, item.owner || inferNeedOwner(lead, item.text))}</b>
                      <span>{item.text}</span>
                    </label>
                    <button type="button" aria-label={`Remove ${item.text}`} onClick={() => removeNeedItem(item.id)}>
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="client-file-empty-state">No needs captured yet.</p>
            )}

            <div className="needs-list-actions">
              <button type="button" className="copy-needs-button" onClick={copyNeedsList}>
                {needsCopyStatus === 'copied' ? 'Copied' : 'Copy List'}
              </button>
              <button type="button" className="loa-pdf-button" onClick={generateLoaPdf}>
                Generate LOA PDF
              </button>
            </div>
          </div>

          <div className="client-file-tasks" onClick={(event) => event.stopPropagation()}>
            <div className="client-file-section-header">
              <strong>Upcoming Tasks</strong>
              <span>Priority actions</span>
            </div>

            {clientFileTasks.length > 0 ? (
              <div className="client-file-task-list">
                {clientFileTasks.map((task) => (
                  <div className={`client-file-task-card ${task.tone}`} key={task.id}>
                    <div>
                      <span>{task.label}</span>
                      <strong>{task.title}</strong>
                      <p>{task.detail}</p>
                      {task.date && <small>{task.date}</small>}
                    </div>
                    <button type="button" onClick={task.onClick}>
                      {task.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="client-file-empty-state">No urgent tasks right now.</p>
            )}
          </div>

          <div className="activity-log touch-history-log" onClick={(event) => event.stopPropagation()}>
            <div className="activity-header client-file-activity-header">
              <div>
                <span>Activity Feed</span>
                <b>{filteredActivity.length} shown</b>
              </div>
              <div className="activity-tabs" aria-label="Activity feed filters">
                {activityTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    className={activityFilter === tab ? 'active' : ''}
                    onClick={(event) => {
                      event.stopPropagation()
                      setActivityFilter(tab)
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {recentActivity.length > 0 ? (
              <div className="activity-list client-file-activity-list">
                {recentActivity.map((activity) => (
                  <div className={`activity-item client-file-activity-item ${activity.category.toLowerCase()}`} key={activity.id}>
                    <span className="activity-icon" aria-hidden="true">{getActivityIcon(activity.category)}</span>
                    <div>
                      <strong>{activity.title}</strong>
                      <p>{activity.detail}</p>
                      <small>{activity.initials}</small>
                    </div>
                    <time>{shortDate(activity.date)}</time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="client-file-empty-state">No activity in this category yet.</p>
            )}
          </div>

          {showSuggestedMessage && <SuggestedMessagePanel lead={lead} />}

          {showTaskComposer && (
            <div className="touch-logger manual-task-composer" onClick={(event) => event.stopPropagation()}>
              <div className="touch-logger-header">
                <strong>New Task</strong>
                <span>This task overrides the standard cadence until it is completed or replaced.</span>
              </div>

              <div className="touch-logger-grid">
                <label>
                  Task
                  <input
                    value={taskDraft.title}
                    onChange={(event) => updateTaskDraft('title', event.target.value)}
                    placeholder="Example: Call borrower after bank statement upload"
                  />
                </label>

                <label>
                  Due Date
                  <input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) => updateTaskDraft('dueDate', event.target.value)}
                  />
                </label>

                <label>
                  Channel
                  <select value={taskDraft.channel} onChange={(event) => updateTaskDraft('channel', event.target.value)}>
                    <option>Task</option>
                    <option>Call</option>
                    <option>Text</option>
                    <option>Email</option>
                    <option>CRM Update</option>
                    <option>Agent Update</option>
                  </select>
                </label>

                <label>
                  Note
                  <textarea
                    value={taskDraft.note}
                    onChange={(event) => updateTaskDraft('note', event.target.value)}
                    placeholder="Optional context for why this task matters."
                    rows="3"
                  />
                </label>
              </div>

              <div className="touch-logger-actions">
                <button type="button" className="ghost-button small-button" onClick={(event) => {
                  event.stopPropagation()
                  setShowTaskComposer(false)
                }}>
                  Cancel
                </button>
                <button type="button" className="primary-button small-button" onClick={saveManualTask}>
                  Save Task
                </button>
              </div>
            </div>
          )}

          {showTouchLogger && (
            <div className="touch-logger" onClick={(event) => event.stopPropagation()}>
              <div className="touch-logger-header">
                <strong>Log Touch</strong>
                <span>Record what happened and keep the follow-up history useful.</span>
              </div>

              <div className="touch-logger-grid">
                <label>
                  Touch Type
                  <select value={touchType} onChange={(event) => setTouchType(event.target.value)}>
                    <option>Call</option>
                    <option>Text</option>
                    <option>Email</option>
                    <option>Voicemail</option>
                    <option>Agent Update</option>
                    <option>Strategy Review</option>
                    <option>Mortgage Coach / TCA Sent</option>
                    <option>Client Check-In</option>
                    <option>Review Request</option>
                  </select>
                </label>

                <label>
                  Outcome
                  <select value={touchOutcome} onChange={(event) => setTouchOutcome(event.target.value)}>
                    {touchOutcomeOptions.map((outcome) => (
                      <option key={outcome}>{outcome}</option>
                    ))}
                  </select>
                </label>

                <label className="touch-logger-wide-field">
                  Note
                  <textarea
                    value={touchNote}
                    onChange={(event) => setTouchNote(event.target.value)}
                    placeholder="Example: Left voicemail and sent follow-up text."
                    rows="3"
                  />
                </label>

                <label>
                  Next Action
                  <input
                    value={touchNextAction}
                    onChange={(event) => setTouchNextAction(event.target.value)}
                    placeholder="Example: Review uploaded docs"
                  />
                </label>

                <label>
                  Next Action Date
                  <input
                    type="date"
                    value={touchNextActionDate}
                    onChange={(event) => setTouchNextActionDate(event.target.value)}
                  />
                </label>
              </div>

              <div className="touch-logger-actions">
                <button type="button" className="ghost-button small-button" onClick={(event) => {
                  event.stopPropagation()
                  setShowTouchLogger(false)
                }}>
                  Cancel
                </button>
                <button type="button" className="primary-button small-button" onClick={saveTouch}>
                  Save Touch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="lead-actions" onClick={(event) => event.stopPropagation()}>
        {!isExpanded && (
          <button
            type="button"
            className="primary-button small-button"
            onClick={(event) => {
              event.stopPropagation()
              openTouchLogger(event)
            }}
          >
            Log Touch
          </button>
        )}
        {!isExpanded && (
          <button
            type="button"
            className="ghost-button small-button"
            onClick={(event) => {
              event.stopPropagation()
              onPushNextAction(lead.id)
            }}
          >
            Push 3 Days
          </button>
        )}
        {!isExpanded && (
          <button
            type="button"
            className="ghost-button small-button"
            onClick={toggleSuggestedMessage}
          >
            Suggested Message
          </button>
        )}
        <button
          type="button"
          className="primary-button small-button open-client-file-button"
          onClick={(event) => {
            event.stopPropagation()
            setIsExpanded((current) => !current)
          }}
        >
          {isExpanded ? 'Close File' : 'Open Client File'}
        </button>
        {isExpanded && (
          <>
            <button
              type="button"
              className="ghost-button small-button"
              onClick={(event) => {
                event.stopPropagation()
                openTouchLogger(event)
              }}
            >
              Log Touch
            </button>
            <button
              type="button"
              className="ghost-button small-button"
              onClick={toggleSuggestedMessage}
            >
              Suggested Message
            </button>
            <button
              type="button"
              className="ghost-button small-button"
              onClick={(event) => {
                event.stopPropagation()
                onPushNextAction(lead.id)
              }}
            >
              Push 3 Days
            </button>
            {!isQuickEditing ? (
              <button
                type="button"
                className="ghost-button small-button"
                onClick={startQuickEdit}
              >
                Quick Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-button small-button"
                  onClick={saveQuickEdit}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="ghost-button small-button"
                  onClick={cancelQuickEdit}
                >
                  Cancel
                </button>
              </>
            )}
            <button
              type="button"
              className="ghost-button danger-button small-button"
              onClick={(event) => {
                event.stopPropagation()
                onArchive(lead.id)
              }}
            >
              Archive
            </button>
          </>
        )}
      </div>
    </article>
  )
}
