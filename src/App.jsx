import { useEffect, useMemo, useRef, useState } from 'react'
import { initialLeads } from './data/initialleads'
import { daysSince } from './utils/formatting'
import { partnerScore } from './utils/scoring'
import { getRecommendedNextTouchDate } from './utils/cadence'
import { importLeadTrackerRows, summarizeLeadTrackerImport } from './data/importLeadTracker'
import { loadLeads, saveLeads } from './data/leadsRepository'
import {
  loadPartnerProfiles,
  partnerProfilesArrayToMap,
  savePartnerProfiles,
} from './data/partnerProfilesRepository'
import CloudSyncPage from './pages/CloudSyncPage'
import KpisPage from './pages/KpisPage'
import PipelinePage from './pages/PipelinePage'
import AgentProspectsPage from './pages/AgentProspectsPage'
import WeeklyUpdatesPage from './pages/WeeklyUpdatesPage.jsx'
import PartnersPage from './pages/PartnersPage.jsx'
import PartnerProfilePage from './pages/PartnerProfilePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import usePartnerTouchReminders from './hooks/usePartnerTouchReminders'
import useKpiAnalytics from './hooks/useKpiAnalytics'
import useDashboardOverview from './hooks/useDashboardOverview'
import useLoanTimingOverview from './hooks/useLoanTimingOverview'
import useLeadImport from './hooks/useLeadImport'
import useLeadViews from './hooks/useLeadViews'
import useOperatingRhythm from './hooks/useOperatingRhythm'
import usePartnerProfileActions from './hooks/usePartnerProfileActions'
import useSupabaseAuth from './hooks/useSupabaseAuth'
import './styles/app.css'

const LEADS_STORAGE_KEY = 'mortgage_relationship_os_leads'
const PARTNER_PROFILES_STORAGE_KEY = 'mortgage_relationship_os_partner_profiles'


function parseDateValue(dateValue) {
  if (!dateValue) return null

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())
  }

  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toDateKey(dateValue) {
  const date = parseDateValue(dateValue)
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getNthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const date = new Date(year, monthIndex, 1)
  let count = 0

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === weekday) {
      count += 1
      if (count === nth) return new Date(date)
    }
    date.setDate(date.getDate() + 1)
  }

  return null
}

function getLastWeekdayOfMonth(year, monthIndex, weekday) {
  const date = new Date(year, monthIndex + 1, 0)

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === weekday) return new Date(date)
    date.setDate(date.getDate() - 1)
  }

  return null
}

function getObservedDate(year, monthIndex, day) {
  const date = new Date(year, monthIndex, day)
  const weekday = date.getDay()

  if (weekday === 6) {
    const observed = new Date(date)
    observed.setDate(date.getDate() - 1)
    return observed
  }

  if (weekday === 0) {
    const observed = new Date(date)
    observed.setDate(date.getDate() + 1)
    return observed
  }

  return date
}

function getUsFederalHolidays(year) {
  return [
    { name: "New Year's Day", date: getObservedDate(year, 0, 1) },
    { name: 'Martin Luther King Jr. Day', date: getNthWeekdayOfMonth(year, 0, 1, 3) },
    { name: "Washington's Birthday", date: getNthWeekdayOfMonth(year, 1, 1, 3) },
    { name: 'Memorial Day', date: getLastWeekdayOfMonth(year, 4, 1) },
    { name: 'Juneteenth National Independence Day', date: getObservedDate(year, 5, 19) },
    { name: 'Independence Day', date: getObservedDate(year, 6, 4) },
    { name: 'Labor Day', date: getNthWeekdayOfMonth(year, 8, 1, 1) },
    { name: 'Columbus Day', date: getNthWeekdayOfMonth(year, 9, 1, 2) },
    { name: 'Veterans Day', date: getObservedDate(year, 10, 11) },
    { name: 'Thanksgiving Day', date: getNthWeekdayOfMonth(year, 10, 4, 4) },
    { name: 'Christmas Day', date: getObservedDate(year, 11, 25) },
  ].filter((holiday) => holiday.date)
}

function countBusinessDaysBetween(startDate, endDate, holidayKeys = new Set()) {
  const start = parseDateValue(startDate)
  const end = parseDateValue(endDate)

  if (!start || !end || end < start) return null

  let businessDays = 0
  const cursor = new Date(start)

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    const weekday = cursor.getDay()
    const dateKey = toDateKey(cursor)
    const isWeekend = weekday === 0 || weekday === 6
    const isHoliday = holidayKeys.has(dateKey)

    if (!isWeekend && !isHoliday) {
      businessDays += 1
    }
  }

  return businessDays
}

function formatCompactCurrency(value) {
  const amount = Number(value) || 0

  if (amount >= 1000000) {
    const millions = amount / 1000000
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
  }

  if (amount >= 1000) {
    const thousands = amount / 1000
    return `$${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`
  }

  return `$${amount.toLocaleString()}`
}

function getPartnerDisplayName(lead) {
  if (lead.leadType === 'Agent Prospect' && lead.stage === 'Referral Partner') {
    return lead.client
  }

  return lead.partner
}

function shouldShowInReferralPartners(lead) {
  if (lead.leadType === 'Agent Prospect') {
    return lead.stage === 'Referral Partner'
  }

  return true
}

function normalizeLeadStage(stage) {
  return String(stage || '').trim().toLowerCase()
}


function isSameOrBeforeToday(dateValue, today) {
  const date = parseDateValue(dateValue)
  if (!date) return false

  const todayDate = parseDateValue(today) || new Date()
  todayDate.setHours(0, 0, 0, 0)

  return date <= todayDate
}


function isFriday(dateValue = new Date()) {
  const date = parseDateValue(dateValue) || new Date()
  return date.getDay() === 5
}

function isFirstWednesdayOfMonth(dateValue = new Date()) {
  const date = parseDateValue(dateValue) || new Date()
  return date.getDay() === 3 && date.getDate() <= 7
}

function isWeeklyPreApprovalEmailDay(dateValue = new Date()) {
  return isFriday(dateValue)
}

function getPreApprovalActivityDate(lead) {
  return lead.preApprovalReactivatedDate
    || lead.reactivatedDate
    || lead.lastClientResponseDate
    || lead.lastBorrowerResponseDate
    || lead.lastMeaningfulTouchDate
    || lead.lastMeaningfulTouch
    || lead.preApprovalDate
    || lead.preApprovedDate
    || lead.referralDate
    || lead.createdAt
    || lead.lastTouch
}


function isOlderThanDays(dateValue, dayCount, today = new Date()) {
  const date = parseDateValue(dateValue)
  const todayDate = parseDateValue(today) || new Date()

  if (!date) return false

  todayDate.setHours(0, 0, 0, 0)

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const daysOld = Math.floor((todayDate - date) / millisecondsPerDay)

  return daysOld >= dayCount
}

function getDaysSinceDate(dateValue, today = new Date()) {
  const date = parseDateValue(dateValue)
  const todayDate = parseDateValue(today) || new Date()

  if (!date) return null

  todayDate.setHours(0, 0, 0, 0)

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((todayDate - date) / millisecondsPerDay)
}

function getClosedLeadDate(lead) {
  return lead.closedDate
    || lead.closingDate
    || lead.fundedDate
    || lead.disbursementDate
    || lead.settlementDate
    || lead.createdAt
}

function isClosedLeadFollowUpDue(lead, today = new Date()) {
  const closedDate = getClosedLeadDate(lead)
  const daysSinceClosed = getDaysSinceDate(closedDate, today)

  if (daysSinceClosed === null || daysSinceClosed < 0) return false

  const postClosingMilestones = [7, 30, 90, 180, 365]

  if (postClosingMilestones.includes(daysSinceClosed)) return true

  return daysSinceClosed > 365 && daysSinceClosed % 365 === 0
}

function getLeadFollowUpCadenceDays(lead) {
  const stage = normalizeLeadStage(lead.stage || lead.status)

  if (stage === 'new lead' || stage === 'new referral') return 1
  if (stage === 'contact attempted') return 2
  if (stage === 'pre-approved' || stage === 'pre-qualified') return 7

  return null
}

function isLeadFollowUpDue(lead, today = new Date()) {
  if (lead.leadType === 'Agent Prospect') return false

  const stage = normalizeLeadStage(lead.stage || lead.status)
  const excludedStages = new Set([
    // 'closed',   // removed as per instruction
    'dnq',
    'not interested',
    'other lender',
    'builder lender',
    'archived',
    'under contract',
    'in process',
    'refinance in process',
  ])

  if (excludedStages.has(stage)) return false

  if (stage === 'closed') {
    return isClosedLeadFollowUpDue(lead, today)
  }

  const manualNextTouchDate = lead.nextTouchDate || lead.nextActionDate
  if (manualNextTouchDate) {
    return isSameOrBeforeToday(manualNextTouchDate, today)
  }

  const isPreApprovedStage = stage === 'pre-approved' || stage === 'pre-qualified'
  const preApprovalActivityDate = getPreApprovalActivityDate(lead)
  const isOlderPreApproval = isPreApprovedStage && isOlderThanDays(preApprovalActivityDate, 90, today)
  const isMonthlyIntentionalPreApprovalOutreach = isOlderPreApproval && isFirstWednesdayOfMonth(today)
  const isWeeklyPreApprovalEmailOutreach = isOlderPreApproval && isWeeklyPreApprovalEmailDay(today)
  const isNewerPreApprovalFriday = isPreApprovedStage
    && !isOlderPreApproval
    && isFriday(today)

  if (isMonthlyIntentionalPreApprovalOutreach || isWeeklyPreApprovalEmailOutreach || isNewerPreApprovalFriday) return true

  const cadenceDays = getLeadFollowUpCadenceDays(lead)
  if (cadenceDays === null) return false

  if (!lead.lastTouch) return true

  return daysSince(lead.lastTouch) >= cadenceDays
}

function App() {
  const [leads, setLeads] = useState(() => {
    try {
      const savedLeads = window.localStorage.getItem(LEADS_STORAGE_KEY)
      return savedLeads ? JSON.parse(savedLeads) : initialLeads
    } catch (error) {
      console.error('Unable to load saved leads:', error)
      return initialLeads
    }
  })
  const [partnerProfiles, setPartnerProfiles] = useState(() => {
    try {
      const savedProfiles = window.localStorage.getItem(PARTNER_PROFILES_STORAGE_KEY)
      return savedProfiles ? JSON.parse(savedProfiles) : {}
    } catch (error) {
      console.error('Unable to load saved partner profiles:', error)
      return {}
    }
  })
  const [query, setQuery] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('All Partners')
  const [agentQuery, setAgentQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState('All Partners')
  const [selectedPartner, setSelectedPartner] = useState('Aubree Lewis')
  const [mergeSourcePartner, setMergeSourcePartner] = useState('')
  const [mergeTargetPartner, setMergeTargetPartner] = useState('')
  const [selectedPartnerProfile, setSelectedPartnerProfile] = useState(null)
  const [isEditingPartnerProfile, setIsEditingPartnerProfile] = useState(false)
  const [partnerProfileDraft, setPartnerProfileDraft] = useState(null)
  const [partnerTouchForm, setPartnerTouchForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'Value Touch',
    note: '',
    nextAction: '',
    nextTouchDate: '',
  })
  const [activePage, setActivePage] = useState('dashboard')
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0)
  const {
    leadImportSummary,
    pendingLeadImport,
    importLeadTrackerFile,
    confirmPendingLeadImport,
    cancelPendingLeadImport,
  } = useLeadImport({
    leads,
    setLeads,
    importLeadTrackerRows,
    summarizeLeadTrackerImport,
  })
  const [focusedLeadId, setFocusedLeadId] = useState(null)
  const focusedLeadIdRef = useRef(null)
  const [supabaseTestMessage, setSupabaseTestMessage] = useState('Not tested yet')
  const [isSupabaseTesting, setIsSupabaseTesting] = useState(false)
  const [isSupabaseBackupRunning, setIsSupabaseBackupRunning] = useState(false)
  const [supabaseBackupMessage, setSupabaseBackupMessage] = useState('No backup run yet')
  const [isSupabaseLoadRunning, setIsSupabaseLoadRunning] = useState(false)
  const [supabaseLoadMessage, setSupabaseLoadMessage] = useState('No cloud load run yet')
  const [hasCompletedCloudStartupLoad, setHasCompletedCloudStartupLoad] = useState(false)
  const [isSupabaseAutoSaving] = useState(false)
  const [supabaseAutoSaveMessage, setSupabaseAutoSaveMessage] = useState('Manual cloud save mode is active')
  const [isPartnerProfileSyncRunning, setIsPartnerProfileSyncRunning] = useState(false)
  const [partnerProfileSyncMessage, setPartnerProfileSyncMessage] = useState('Partner profiles have not been synced yet')
  const [hasCompletedPartnerProfileStartupLoad, setHasCompletedPartnerProfileStartupLoad] = useState(false)
  const [isPartnerProfileAutoSaving, setIsPartnerProfileAutoSaving] = useState(false)
  const [partnerProfileAutoSaveMessage, setPartnerProfileAutoSaveMessage] = useState('Manual partner profile cloud save mode is active')
  const {
    supabaseAuthEmail,
    setSupabaseAuthEmail,
    supabaseAuthPassword,
    setSupabaseAuthPassword,
    supabaseAuthMessage,
    isSupabaseAuthLoading,
    signInToSupabase,
    createSupabaseAccount,
    signOutOfSupabase,
  } = useSupabaseAuth()

  useEffect(() => {
    focusedLeadIdRef.current = focusedLeadId
  }, [focusedLeadId])

  useEffect(() => {
    if (focusedLeadIdRef.current) return

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [activePage])
  async function backupCurrentLeadsToSupabase() {
    setIsSupabaseBackupRunning(true)
    setSupabaseBackupMessage('Backing up current local leads to Supabase...')

    try {
      const savedLeads = await saveLeads(leads)
      const completedAt = new Date().toLocaleString([], {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

      setSupabaseBackupMessage(
        `Backup complete. ${savedLeads.length} lead${savedLeads.length === 1 ? '' : 's'} saved to Supabase on ${completedAt}.`,
      )
    } catch (error) {
      console.error('Supabase backup failed:', error)
      setSupabaseBackupMessage(error.message || 'Supabase backup failed. Check the browser console for details.')
    } finally {
      setIsSupabaseBackupRunning(false)
    }
  }

  async function loadLeadsFromSupabaseManually() {
    setIsSupabaseLoadRunning(true)
    setSupabaseLoadMessage('Loading leads from Supabase...')

    try {
      const cloudLeads = await loadLeads()
      setLeads(cloudLeads)
      setHasCompletedCloudStartupLoad(true)
      setSupabaseAutoSaveMessage('Manual cloud save mode is active')
      setSupabaseLoadMessage(`Loaded ${cloudLeads.length} lead${cloudLeads.length === 1 ? '' : 's'} from Supabase into the app.`)
    } catch (error) {
      console.error('Supabase load failed:', error)
      setSupabaseLoadMessage(error.message || 'Supabase load failed. Check the browser console for details.')
    } finally {
      setIsSupabaseLoadRunning(false)
    }
  }

  async function backupPartnerProfilesToSupabase() {
    setIsPartnerProfileSyncRunning(true)
    setPartnerProfileSyncMessage('Backing up all referral partner profiles to Supabase...')

    try {
      const allPartnerProfiles = partnerCleanupOptions.reduce((profileMap, partnerName) => {
        profileMap[partnerName] = {
          ...(partnerProfiles[partnerName] || {}),
          partnerName,
        }
        return profileMap
      }, {})

      const savedProfiles = await savePartnerProfiles(allPartnerProfiles)
      setPartnerProfiles((current) => ({
        ...allPartnerProfiles,
        ...current,
      }))
      setPartnerProfileSyncMessage(`Backup complete. ${savedProfiles.length} partner profile${savedProfiles.length === 1 ? '' : 's'} saved to Supabase.`)
    } catch (error) {
      console.error('Partner profile backup failed:', error)
      setPartnerProfileSyncMessage(error.message || 'Partner profile backup failed. Check the browser console for details.')
    } finally {
      setIsPartnerProfileSyncRunning(false)
    }
  }

  async function loadPartnerProfilesFromSupabaseManually() {
    setIsPartnerProfileSyncRunning(true)
    setPartnerProfileSyncMessage('Loading partner profiles from Supabase...')

    try {
      const cloudProfiles = await loadPartnerProfiles()
      setPartnerProfiles(partnerProfilesArrayToMap(cloudProfiles))
      setHasCompletedPartnerProfileStartupLoad(true)
      setPartnerProfileAutoSaveMessage('Manual partner profile cloud save mode is active')
      setPartnerProfileSyncMessage(`Loaded ${cloudProfiles.length} partner profile${cloudProfiles.length === 1 ? '' : 's'} from Supabase.`)
    } catch (error) {
      console.error('Partner profile load failed:', error)
      setPartnerProfileSyncMessage(error.message || 'Partner profile load failed. Check the browser console for details.')
    } finally {
      setIsPartnerProfileSyncRunning(false)
    }
  }

  const {
    dailyOperatingPrinciple,
    weeklyOperatingRhythm,
  } = useOperatingRhythm()

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads))
      } catch (error) {
        console.error('Unable to save leads:', error)
      }
    }, 3000)

    return () => window.clearTimeout(saveTimer)
  }, [leads])



  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(PARTNER_PROFILES_STORAGE_KEY, JSON.stringify(partnerProfiles))
      } catch (error) {
        console.error('Unable to save partner profiles:', error)
      }
    }, 3000)

    return () => window.clearTimeout(saveTimer)
  }, [partnerProfiles])

  // Supabase leads auto-save effect removed for manual cloud save mode.

  const {
    activeLeads,
    partners,
    agentSources,
    filteredLeads,
    agentProspectLeads,
    partnerRows,
  } = useLeadViews({
  leads,
  query,
  partnerFilter,
  agentQuery,
  agentFilter,
  shouldShowInReferralPartners,
  getPartnerDisplayName,
  partnerScore,
})

  const metrics = useMemo(() => {
    return {
      active: activeLeads.filter((lead) => lead.stage !== 'Other Lender' && lead.stage !== 'Builder Lender').length,
      preApproved: activeLeads.filter((lead) => lead.stage === 'Pre-Approved').length,
      underContract: activeLeads.filter((lead) => lead.stage === 'Under Contract').length,
      needsAttention: activeLeads.filter((lead) => isLeadFollowUpDue(lead)).length,
    }
  }, [activeLeads])

  const todayFollowUpLeads = useMemo(() => {
    const today = new Date()

    return activeLeads.filter((lead) => isLeadFollowUpDue(lead, today))
  }, [activeLeads])

  const partnerCleanupOptions = [...new Set([
    ...partnerRows.map((row) => row.partner),
    ...Object.keys(partnerProfiles),
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b))

  const reversedPartnerNameSuggestions = (() => {
    const partnerNameSet = new Set(partnerCleanupOptions)

    return partnerCleanupOptions
      .map((partnerName) => {
        const nameParts = partnerName.trim().split(/\s+/)
        if (nameParts.length !== 2) return null

        const reversedName = `${nameParts[1]} ${nameParts[0]}`
        if (!partnerNameSet.has(reversedName)) return null

        return {
          source: partnerName,
          target: reversedName,
        }
      })
      .filter(Boolean)
      .filter((suggestion, index, allSuggestions) => {
        const pairKey = [suggestion.source, suggestion.target].sort().join('|')
        return allSuggestions.findIndex((item) => [item.source, item.target].sort().join('|') === pairKey) === index
      })
  })()

  // Supabase partner profile auto-save effect removed for manual cloud save mode.

  const dashboardOverview = useDashboardOverview(activeLeads, partnerRows)
  
  const kpiAnalytics = useKpiAnalytics(activeLeads, partnerRows, getPartnerDisplayName)
  
  const loanTimingOverview = useLoanTimingOverview({
    activeLeads,
    calendarMonthOffset,
    parseDateValue,
    toDateKey,
    getUsFederalHolidays,
    countBusinessDaysBetween,
  })

  const partnerTouchReminders = usePartnerTouchReminders(partnerProfiles)

  const {
    openPartnerProfile,
    mergePartnerNames,
    startEditingPartnerProfile,
    cancelEditingPartnerProfile,
    savePartnerProfileChanges,
    addPartnerTouch,
    removePartnerTouch,
    completePartnerReminder,
  } = usePartnerProfileActions({
    partnerProfiles,
    setPartnerProfiles,
    partnerProfileDraft,
    setPartnerProfileDraft,
    setPartnerTouchForm,
    setSelectedPartnerProfile,
    setIsEditingPartnerProfile,
    setActivePage,
    setLeads,
    selectedPartner,
    setSelectedPartner,
    partnerFilter,
    setPartnerFilter,
    agentQuery,
    setAgentQuery,
    setMergeSourcePartner,
    setMergeTargetPartner,
    setIsPartnerProfileAutoSaving,
    setPartnerProfileAutoSaveMessage,
  })

  const updateText = useMemo(() => {
    const partnerLeads = activeLeads.filter(
      (lead) => shouldShowInReferralPartners(lead) && getPartnerDisplayName(lead) === selectedPartner && lead.stage !== 'Other Lender',
    )

    if (!partnerLeads.length) {
      return 'No active updates for this partner right now.'
    }

    const lines = partnerLeads.map((lead) => `• ${lead.client}: ${lead.stage}. ${lead.detail}`)

    return `Hey ${selectedPartner.split(' ')[0]}, here’s a quick update on the clients we’re working through together this week.\n\n${lines.join('\n')}\n\nI’ll keep you posted as things move forward.`
  }, [activeLeads, selectedPartner])

  async function copyUpdate() {
    await navigator.clipboard.writeText(updateText)
    alert('Update copied to clipboard')
  }

  async function testSupabaseConnection() {
    setIsSupabaseTesting(true)
    setSupabaseTestMessage('Testing Supabase connection...')

    try {
      await loadLeads()
      setSupabaseTestMessage('Supabase connected. Lead table is reachable.')
    } catch (error) {
      console.error('Supabase test failed:', error)
      setSupabaseTestMessage(error.message || 'Supabase test failed. Check the browser console for details.')
    } finally {
      setIsSupabaseTesting(false)
    }
  }


  function clearTridAlert(leadId) {
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== leadId) return lead

        const clearedClosingDates = lead.tridClearedClosingDates || []
        const nextClearedClosingDates = lead.closingDate && !clearedClosingDates.includes(lead.closingDate)
          ? [lead.closingDate, ...clearedClosingDates]
          : clearedClosingDates

        return {
          ...lead,
          tridReviewedAt: new Date().toISOString().slice(0, 10),
          tridReviewedForClosingDate: lead.closingDate,
          tridClearedClosingDates: nextClearedClosingDates,
        }
      }),
    )
  }

  function openLeadInPipeline(leadId) {
    setFocusedLeadId(leadId)
    setActivePage('pipeline')
  }

  function markTouchedToday(leadId) {
    const today = new Date().toISOString().slice(0, 10)

    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== leadId) return lead

        const nextActionDate = getRecommendedNextTouchDate(lead)
        const touchHistory = lead.touchHistory || []

        const historyEntry = {
          id: Date.now(),
          date: today,
          type: 'Follow-up completed',
          method: lead.nextAction || 'Touch completed',
          stage: lead.stage || lead.status || 'New Referral',
          note: `Marked touched. Next follow-up set for ${nextActionDate}.`,
          nextActionDate,
        }

        return {
          ...lead,
          lastTouch: today,
          nextActionDate,
          touchHistory: [historyEntry, ...touchHistory],
        }
      }),
    )
  }

  function markPreApprovalReactivated(leadId) {
    const today = new Date().toISOString().slice(0, 10)

    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== leadId) return lead

        const nextActionDate = getRecommendedNextTouchDate({
          ...lead,
          lastTouch: today,
          preApprovalReactivatedDate: today,
          lastMeaningfulTouchDate: today,
        })
        const touchHistory = lead.touchHistory || []

        const historyEntry = {
          id: Date.now(),
          date: today,
          type: 'Pre-approval reactivated',
          method: 'Borrower re-engaged',
          stage: lead.stage || lead.status || 'Pre-Approved',
          note: `Borrower re-engaged. Removed from stale pre-approval rhythm and next follow-up set for ${nextActionDate}.`,
          nextActionDate,
        }

        return {
          ...lead,
          preApprovalReactivatedDate: today,
          lastMeaningfulTouchDate: today,
          lastTouch: today,
          nextActionDate,
          touchHistory: [historyEntry, ...touchHistory],
        }
      }),
    )
  }

  function renderPage() {
    if (activePage === 'cloudSync') {
      return (
        <CloudSyncPage
          setActivePage={setActivePage}
          hasCompletedCloudStartupLoad={hasCompletedCloudStartupLoad}
          supabaseAuthMessage={supabaseAuthMessage}
          leads={leads}
          isSupabaseAutoSaving={isSupabaseAutoSaving}
          isPartnerProfileAutoSaving={isPartnerProfileAutoSaving}
          hasCompletedPartnerProfileStartupLoad={hasCompletedPartnerProfileStartupLoad}
          supabaseLoadMessage={supabaseLoadMessage}
          supabaseAutoSaveMessage={supabaseAutoSaveMessage}
          supabaseTestMessage={supabaseTestMessage}
          supabaseBackupMessage={supabaseBackupMessage}
          partnerProfileSyncMessage={partnerProfileSyncMessage}
          partnerProfileAutoSaveMessage={partnerProfileAutoSaveMessage}
          reversedPartnerNameSuggestions={reversedPartnerNameSuggestions}
          mergePartnerNames={mergePartnerNames}
          mergeSourcePartner={mergeSourcePartner}
          setMergeSourcePartner={setMergeSourcePartner}
          mergeTargetPartner={mergeTargetPartner}
          setMergeTargetPartner={setMergeTargetPartner}
          partnerCleanupOptions={partnerCleanupOptions}
          signInToSupabase={signInToSupabase}
          supabaseAuthEmail={supabaseAuthEmail}
          setSupabaseAuthEmail={setSupabaseAuthEmail}
          supabaseAuthPassword={supabaseAuthPassword}
          setSupabaseAuthPassword={setSupabaseAuthPassword}
          isSupabaseAuthLoading={isSupabaseAuthLoading}
          createSupabaseAccount={createSupabaseAccount}
          signOutOfSupabase={signOutOfSupabase}
          testSupabaseConnection={testSupabaseConnection}
          isSupabaseTesting={isSupabaseTesting}
          backupCurrentLeadsToSupabase={backupCurrentLeadsToSupabase}
          isSupabaseBackupRunning={isSupabaseBackupRunning}
          loadLeadsFromSupabaseManually={loadLeadsFromSupabaseManually}
          isSupabaseLoadRunning={isSupabaseLoadRunning}
          backupPartnerProfilesToSupabase={backupPartnerProfilesToSupabase}
          isPartnerProfileSyncRunning={isPartnerProfileSyncRunning}
          loadPartnerProfilesFromSupabaseManually={loadPartnerProfilesFromSupabaseManually}
        />
      )
    }

    if (activePage === 'kpis') {
      return (
        <KpisPage
          dashboardOverview={dashboardOverview}
          metrics={metrics}
          kpiAnalytics={kpiAnalytics}
          formatCompactCurrency={formatCompactCurrency}
        />
      )
    }

    if (activePage === 'pipeline') {
      return (
        <PipelinePage
          query={query}
          setQuery={setQuery}
          partnerFilter={partnerFilter}
          setPartnerFilter={setPartnerFilter}
          partners={partners}
          filteredLeads={filteredLeads}
          setLeads={setLeads}
          setSelectedPartner={setSelectedPartner}
          focusedLeadId={focusedLeadId}
          setFocusedLeadId={setFocusedLeadId}
          setActivePage={setActivePage}
        />
      )
    }

    if (activePage === 'agentProspects') {
      return (
        <AgentProspectsPage
          agentQuery={agentQuery}
          setAgentQuery={setAgentQuery}
          agentFilter={agentFilter}
          setAgentFilter={setAgentFilter}
          agentSources={agentSources}
          agentProspectLeads={agentProspectLeads}
          setLeads={setLeads}
          setSelectedPartner={setSelectedPartner}
        />
      )
    }
    if (activePage === 'partners') {
      return <PartnersPage partnerRows={partnerRows} onOpenPartner={openPartnerProfile} />
    }

    if (activePage === 'partnerProfile') {
      return (
        <PartnerProfilePage
          selectedPartnerProfile={selectedPartnerProfile}
          partnerRows={partnerRows}
          activeLeads={activeLeads}
          getPartnerDisplayName={getPartnerDisplayName}
          partnerProfiles={partnerProfiles}
          partnerProfileDraft={partnerProfileDraft}
          partnerTouchForm={partnerTouchForm}
          isEditingPartnerProfile={isEditingPartnerProfile}
          setActivePage={setActivePage}
          startEditingPartnerProfile={startEditingPartnerProfile}
          cancelEditingPartnerProfile={cancelEditingPartnerProfile}
          savePartnerProfileChanges={savePartnerProfileChanges}
          setPartnerProfileDraft={setPartnerProfileDraft}
          setPartnerTouchForm={setPartnerTouchForm}
          addPartnerTouch={addPartnerTouch}
          removePartnerTouch={removePartnerTouch}
          query={query}
          setQuery={setQuery}
          setPartnerFilter={setPartnerFilter}
          partners={partners}
          setLeads={setLeads}
          setSelectedPartner={setSelectedPartner}
        />
      )
    }

    if (activePage === 'updates') {
      return (
        <WeeklyUpdatesPage
          partners={partners}
          selectedPartner={selectedPartner}
          setSelectedPartner={setSelectedPartner}
          updateText={updateText}
          copyUpdate={copyUpdate}
        />
      )
    }

    return (
      <DashboardPage
        dailyOperatingPrinciple={dailyOperatingPrinciple}
        importLeadTrackerFile={importLeadTrackerFile}
        pendingLeadImport={pendingLeadImport}
        cancelPendingLeadImport={cancelPendingLeadImport}
        confirmPendingLeadImport={confirmPendingLeadImport}
        leadImportSummary={leadImportSummary}
        formatCompactCurrency={formatCompactCurrency}
        weeklyOperatingRhythm={weeklyOperatingRhythm}
        loanTimingOverview={loanTimingOverview}
        calendarMonthOffset={calendarMonthOffset}
        setCalendarMonthOffset={setCalendarMonthOffset}
        openLeadInPipeline={openLeadInPipeline}
        clearTridAlert={clearTridAlert}
        partnerTouchReminders={partnerTouchReminders}
        openPartnerProfile={openPartnerProfile}
        completePartnerReminder={completePartnerReminder}
        todayFollowUpLeads={todayFollowUpLeads}
        markTouchedToday={markTouchedToday}
        markPreApprovalReactivated={markPreApprovalReactivated}
        dashboardOverview={dashboardOverview}
        metrics={metrics}
      />
    )
  }

  return (
    <>
      <main className="app-shell">
        <nav className="app-nav" aria-label="Main navigation">
          <button
            type="button"
            className={activePage === 'dashboard' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activePage === 'kpis' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('kpis')}
          >
            KPIs & Stats
          </button>
          <button
            type="button"
            className={activePage === 'pipeline' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('pipeline')}
          >
            Lead Pipeline
          </button>
          <button
            type="button"
            className={activePage === 'agentProspects' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('agentProspects')}
          >
            Agent Prospects
          </button>
          <button
            type="button"
            className={activePage === 'partners' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('partners')}
          >
            Referral Partners
          </button>
          {activePage === 'partnerProfile' && selectedPartnerProfile && (
            <button
              type="button"
              className="nav-button active"
              onClick={() => setActivePage('partnerProfile')}
            >
              Partner Profile
            </button>
          )}
          <button
            type="button"
            className={activePage === 'updates' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('updates')}
          >
            Weekly Updates
          </button>
          <button
            type="button"
            className={activePage === 'cloudSync' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActivePage('cloudSync')}
          >
            Cloud Sync
          </button>
        </nav>

        {renderPage()}
      </main>
    </>
  )
}

export default App
