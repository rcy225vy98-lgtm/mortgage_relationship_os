import { useEffect, useMemo, useRef, useState } from 'react'
import { shortDate } from '../utils/formatting'
import { getNewReferralPartnerNextTouch, newReferralPartnerCadence } from '../utils/referralPartnerCadence'

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

const touchTypeOptions = [
  'Call',
  'Text',
  'Email',
  'Voicemail',
  'Coffee Meeting',
  'Lunch Meeting',
  'Market Update',
  'Value Touch',
  'Referral Conversation',
]

const touchOutcomeOptions = [
  'Connected',
  'No Response',
  'Left Voicemail',
  'Meeting Set',
  'Meeting Held',
  'Value Sent',
  'Referral Opportunity',
  'Completed',
]

const sortOptions = [
  { value: 'touchUrgency', label: 'Touch urgency' },
  { value: 'newest', label: 'Newest added' },
  { value: 'lastTouch', label: 'Last touch' },
  { value: 'stage', label: 'Relationship stage' },
  { value: 'name', label: 'Agent name' },
]

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysToDateKey(dateValue, dayCount) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + dayCount)
  return date.toISOString().slice(0, 10)
}

function getDateSortValue(value) {
  if (!value) return 0
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getDaysUntil(dateValue) {
  if (!dateValue) return null

  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  today.setHours(12, 0, 0, 0)

  return Math.ceil((date - today) / 86400000)
}

function getDefaultNextAction(stage) {
  if (stage === 'Target Identified') return 'Research agent and prepare first outreach'
  if (stage === 'First Outreach Sent') return 'Follow up with a useful reason to connect'
  if (stage === 'Conversation Started') return 'Ask for coffee or a short strategy call'
  if (stage === 'Meeting Scheduled') return 'Confirm meeting details and send agenda'
  if (stage === 'Met') return 'Send thank-you note and one specific value item'
  if (stage === 'Value Follow-Up Sent') return 'Follow up on the value touch'
  if (stage === 'Active Relationship') return 'Send monthly value touch'
  if (stage === 'Referral Partner') return getNewReferralPartnerNextTouch(0).nextAction
  if (stage === 'Dormant') return 'Send reconnect message'
  return 'Make purposeful relationship touch'
}

function getDefaultNextTouchDate(stage, baseDate = getTodayKey()) {
  if (stage === 'Target Identified') return addDaysToDateKey(baseDate, 1)
  if (stage === 'First Outreach Sent' || stage === 'Conversation Started') return addDaysToDateKey(baseDate, 3)
  if (stage === 'Meeting Scheduled' || stage === 'Met') return addDaysToDateKey(baseDate, 1)
  if (stage === 'Dormant') return addDaysToDateKey(baseDate, 7)
  if (stage === 'Referral Partner') return getNewReferralPartnerNextTouch(0, baseDate).nextActionDate
  return addDaysToDateKey(baseDate, 30)
}

function getConnectionLane(stage) {
  if (stage === 'Referral Partner') return 'Referral Partner'
  if (stage === 'Active Relationship' || stage === 'Value Follow-Up Sent') return 'Nurture'
  if (stage === 'Meeting Scheduled' || stage === 'Met') return 'Meeting'
  if (stage === 'Dormant') return 'Dormant'
  return 'New Connection'
}

function getTouchStatus(prospect) {
  const nextDate = prospect.nextActionDate || getDefaultNextTouchDate(prospect.stage || prospect.status)
  const daysUntil = getDaysUntil(nextDate)

  if (daysUntil === null) {
    return {
      label: 'Needs Plan',
      detail: 'No next touch scheduled',
      className: 'warning',
      rank: 1,
    }
  }

  if (daysUntil < 0) {
    return {
      label: 'Overdue',
      detail: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`,
      className: 'danger',
      rank: 0,
    }
  }

  if (daysUntil === 0) {
    return {
      label: 'Due Today',
      detail: 'Purposeful touch due today',
      className: 'warning',
      rank: 1,
    }
  }

  if (daysUntil <= 7) {
    return {
      label: 'Due Soon',
      detail: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      className: 'warning',
      rank: 2,
    }
  }

  return {
    label: 'On Track',
    detail: `Next touch ${shortDate(nextDate)}`,
    className: 'good',
    rank: 3,
  }
}

function getRelationshipFormDefaults() {
  const today = getTodayKey()
  const stage = 'Target Identified'

  return {
    client: '',
    brokerage: '',
    phone: '',
    email: '',
    partner: 'Self-Sourced',
    stage,
    referralDate: today,
    detail: '',
    nextAction: getDefaultNextAction(stage),
    nextActionDate: getDefaultNextTouchDate(stage, today),
  }
}

function getTouchDraftDefaults(prospect) {
  const stage = prospect?.stage || prospect?.status || 'Target Identified'
  const today = getTodayKey()

  return {
    date: today,
    type: 'Value Touch',
    outcome: 'Completed',
    note: '',
    nextAction: prospect?.nextAction || getDefaultNextAction(stage),
    nextActionDate: prospect?.nextActionDate || getDefaultNextTouchDate(stage, today),
  }
}

function getTouchDraftFromTouch(touch, prospect) {
  const stage = prospect?.stage || prospect?.status || 'Target Identified'
  const touchDate = touch?.date || getTodayKey()

  return {
    date: touchDate,
    type: touch?.type || 'Value Touch',
    outcome: touch?.outcome || 'Completed',
    note: touch?.note || '',
    nextAction: touch?.nextAction || prospect?.nextAction || getDefaultNextAction(stage),
    nextActionDate: touch?.nextActionDate || prospect?.nextActionDate || getDefaultNextTouchDate(stage, touchDate),
  }
}

function AgentProspectsPage({
  agentQuery,
  setAgentQuery,
  agentFilter,
  setAgentFilter,
  agentSources,
  agentProspectLeads,
  setLeads,
}) {
  const [showRelationshipForm, setShowRelationshipForm] = useState(false)
  const [editingProspectId, setEditingProspectId] = useState(null)
  const [relationshipForm, setRelationshipForm] = useState(getRelationshipFormDefaults)
  const [stageFilter, setStageFilter] = useState('All Stages')
  const [sortMode, setSortMode] = useState('touchUrgency')
  const [touchProspectId, setTouchProspectId] = useState(null)
  const [touchDraft, setTouchDraft] = useState(getTouchDraftDefaults)
  const [editingTouch, setEditingTouch] = useState(null)
  const [shouldFocusNotes, setShouldFocusNotes] = useState(false)
  const [expandedProspectId, setExpandedProspectId] = useState(null)
  const formPanelRef = useRef(null)
  const notesFieldRef = useRef(null)

  const enrichedProspects = useMemo(() => {
    return agentProspectLeads.map((prospect) => {
      const stage = prospect.stage || prospect.status || 'Target Identified'
      const touchStatus = getTouchStatus({ ...prospect, stage })
      const touchHistory = prospect.touchHistory || []

      return {
        ...prospect,
        stage,
        touchStatus,
        touchHistory,
        latestTouch: touchHistory[0] || null,
        lane: getConnectionLane(stage),
      }
    })
  }, [agentProspectLeads])

  const visibleProspects = useMemo(() => {
    return enrichedProspects
      .filter((prospect) => stageFilter === 'All Stages' || prospect.stage === stageFilter)
      .sort((a, b) => {
        if (sortMode === 'newest') return getDateSortValue(b.referralDate || b.dateReferred) - getDateSortValue(a.referralDate || a.dateReferred)
        if (sortMode === 'lastTouch') return getDateSortValue(b.lastTouch) - getDateSortValue(a.lastTouch)
        if (sortMode === 'stage') return a.stage.localeCompare(b.stage) || a.client.localeCompare(b.client)
        if (sortMode === 'name') return a.client.localeCompare(b.client)
        return a.touchStatus.rank - b.touchStatus.rank || getDateSortValue(a.nextActionDate) - getDateSortValue(b.nextActionDate)
      })
  }, [enrichedProspects, sortMode, stageFilter])

  const relationshipSummary = useMemo(() => {
    return {
      total: enrichedProspects.length,
      needsTouch: enrichedProspects.filter((prospect) => prospect.touchStatus.className !== 'good').length,
      newConnections: enrichedProspects.filter((prospect) => prospect.lane === 'New Connection').length,
      meetings: enrichedProspects.filter((prospect) => prospect.lane === 'Meeting').length,
      activeRelationships: enrichedProspects.filter((prospect) => prospect.lane === 'Nurture').length,
      referralPartners: enrichedProspects.filter((prospect) => prospect.stage === 'Referral Partner').length,
    }
  }, [enrichedProspects])

  const touchQueue = useMemo(() => {
    return [...enrichedProspects]
      .sort((a, b) => a.touchStatus.rank - b.touchStatus.rank || getDateSortValue(a.nextActionDate) - getDateSortValue(b.nextActionDate))
      .slice(0, 5)
  }, [enrichedProspects])

  useEffect(() => {
    if (!showRelationshipForm || !editingProspectId) return

    window.requestAnimationFrame(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

      if (shouldFocusNotes) {
        window.setTimeout(() => {
          notesFieldRef.current?.focus()
        }, 250)
      }
    })
  }, [editingProspectId, shouldFocusNotes, showRelationshipForm])

  function updateRelationshipForm(field, value) {
    setRelationshipForm((current) => {
      if (field === 'stage') {
        const nextActionWasDefault = agentProspectStageOptions.some((stage) => getDefaultNextAction(stage) === current.nextAction)
        const nextActionDateWasDefault = !current.nextActionDate || agentProspectStageOptions.some((stage) => getDefaultNextTouchDate(stage, current.referralDate || getTodayKey()) === current.nextActionDate)

        return {
          ...current,
          stage: value,
          nextAction: nextActionWasDefault ? getDefaultNextAction(value) : current.nextAction,
          nextActionDate: nextActionDateWasDefault ? getDefaultNextTouchDate(value) : current.nextActionDate,
        }
      }

      return {
        ...current,
        [field]: value,
      }
    })
  }

  function openAddRelationshipForm() {
    setRelationshipForm(getRelationshipFormDefaults())
    setEditingProspectId(null)
    setShowRelationshipForm(true)
  }

  function startEditingProspect(prospect, options = {}) {
    setRelationshipForm({
      client: prospect.client || '',
      brokerage: prospect.brokerage || '',
      phone: prospect.phone || '',
      email: prospect.email || '',
      partner: prospect.partner || 'Self-Sourced',
      stage: prospect.stage || prospect.status || 'Target Identified',
      referralDate: prospect.referralDate || prospect.dateReferred || getTodayKey(),
      detail: prospect.detail || '',
      nextAction: prospect.nextAction || getDefaultNextAction(prospect.stage || prospect.status || 'Target Identified'),
      nextActionDate: prospect.nextActionDate || '',
    })
    setEditingProspectId(prospect.id)
    setShouldFocusNotes(Boolean(options.focusNotes))
    setShowRelationshipForm(true)
  }

  function closeRelationshipForm() {
    setRelationshipForm(getRelationshipFormDefaults())
    setEditingProspectId(null)
    setShouldFocusNotes(false)
    setShowRelationshipForm(false)
  }

  function saveRelationship(event) {
    event.preventDefault()

    const agentName = relationshipForm.client.trim()

    if (!agentName) {
      alert('Add the agent name before saving.')
      return
    }

    const existingProspect = editingProspectId
      ? agentProspectLeads.find((prospect) => String(prospect.id) === String(editingProspectId))
      : null

    const prospectToSave = {
      ...(existingProspect || {}),
      id: editingProspectId || crypto.randomUUID?.() || String(Date.now()),
      client: agentName,
      brokerage: relationshipForm.brokerage.trim(),
      phone: relationshipForm.phone.trim(),
      email: relationshipForm.email.trim(),
      partner: relationshipForm.partner.trim() || 'Self-Sourced',
      leadSource: relationshipForm.partner.trim() || 'Self-Sourced',
      leadType: 'Agent Prospect',
      stage: relationshipForm.stage,
      status: relationshipForm.stage,
      referralDate: relationshipForm.referralDate || getTodayKey(),
      dateReferred: relationshipForm.referralDate || getTodayKey(),
      detail: relationshipForm.detail.trim(),
      lastTouch: existingProspect?.lastTouch || relationshipForm.referralDate || getTodayKey(),
      nextAction: relationshipForm.nextAction.trim() || getDefaultNextAction(relationshipForm.stage),
      nextActionDate: relationshipForm.nextActionDate || getDefaultNextTouchDate(relationshipForm.stage),
      touchHistory: existingProspect?.touchHistory || [],
      loanAmount: 0,
    }

    setLeads((current) => {
      if (editingProspectId) {
        return current.map((lead) => (String(lead.id) === String(editingProspectId) ? prospectToSave : lead))
      }

      return [prospectToSave, ...current]
    })

    closeRelationshipForm()
  }

  function archiveProspect(prospectId) {
    const confirmed = window.confirm('Archive this agent relationship? It will be removed from the active prospect list.')

    if (!confirmed) return

    setLeads((current) =>
      current.map((lead) => (
        String(lead.id) === String(prospectId)
          ? { ...lead, archived: true, archivedAt: new Date().toISOString() }
          : lead
      )),
    )
  }

  function updateProspectStage(prospect, nextStage) {
    const today = getTodayKey()
    const shouldRefreshAction = !prospect.nextAction || agentProspectStageOptions.some((stage) => getDefaultNextAction(stage) === prospect.nextAction)

    setLeads((current) =>
      current.map((lead) => {
        if (String(lead.id) !== String(prospect.id)) return lead

        return {
          ...lead,
          stage: nextStage,
          status: nextStage,
          nextAction: shouldRefreshAction ? getDefaultNextAction(nextStage) : lead.nextAction,
          nextActionDate: getDefaultNextTouchDate(nextStage, today),
        }
      }),
    )
  }

  function promoteToReferralPartner(prospect) {
    const today = getTodayKey()
    const nextPartnerTouch = getNewReferralPartnerNextTouch(0, today)
    const touchEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${prospect.id}`,
      date: today,
      type: 'Referral Partner Conversion',
      outcome: 'Completed',
      note: 'Moved relationship to referral partner status and started the new partner ramp cadence.',
      nextAction: nextPartnerTouch.nextAction,
      nextActionDate: nextPartnerTouch.nextActionDate,
      meaningful: true,
    }

    setLeads((current) =>
      current.map((lead) => {
        if (String(lead.id) !== String(prospect.id)) return lead

        return {
          ...lead,
          stage: 'Referral Partner',
          status: 'Referral Partner',
          lastTouch: today,
          lastMeaningfulTouchDate: today,
          nextAction: nextPartnerTouch.nextAction,
          nextActionDate: nextPartnerTouch.nextActionDate,
          touchHistory: [touchEntry, ...(lead.touchHistory || [])],
        }
      }),
    )
  }

  function openTouchLogger(prospect) {
    setTouchProspectId(prospect.id)
    setTouchDraft(getTouchDraftDefaults(prospect))
    setEditingTouch(null)
    setExpandedProspectId(prospect.id)
  }

  function startEditingTouch(prospect, touch, touchIndex) {
    setTouchProspectId(prospect.id)
    setTouchDraft(getTouchDraftFromTouch(touch, prospect))
    setEditingTouch({
      prospectId: prospect.id,
      touchId: touch.id || null,
      touchIndex,
    })
    setExpandedProspectId(prospect.id)
  }

  function updateTouchDraft(field, value) {
    setTouchDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function closeTouchLogger() {
    setTouchProspectId(null)
    setEditingTouch(null)
    setTouchDraft(getTouchDraftDefaults())
  }

  function saveTouch(prospect) {
    const today = getTodayKey()
    const touchDate = touchDraft.date || today
    const isEditingTouch = String(editingTouch?.prospectId) === String(prospect.id)
    const touchEntry = {
      id: editingTouch?.touchId || crypto.randomUUID?.() || `${Date.now()}-${prospect.id}`,
      date: touchDate,
      type: touchDraft.type,
      outcome: touchDraft.outcome,
      note: touchDraft.note.trim() || `${touchDraft.type}: ${touchDraft.outcome}.`,
      nextAction: touchDraft.nextAction.trim(),
      nextActionDate: touchDraft.nextActionDate,
      meaningful: true,
    }

    setLeads((current) =>
      current.map((lead) => {
        if (String(lead.id) !== String(prospect.id)) return lead

        const currentHistory = lead.touchHistory || []
        const nextHistory = isEditingTouch
          ? currentHistory.map((touch, touchIndex) => {
            const matchesById = editingTouch.touchId && String(touch.id) === String(editingTouch.touchId)
            const matchesByIndex = !editingTouch.touchId && touchIndex === editingTouch.touchIndex
            return matchesById || matchesByIndex ? touchEntry : touch
          })
          : [touchEntry, ...currentHistory]
        const sortedHistory = [...nextHistory].sort((a, b) => getDateSortValue(b.date) - getDateSortValue(a.date))
        const latestTouch = sortedHistory[0]

        return {
          ...lead,
          lastTouch: latestTouch?.date || touchDate,
          lastMeaningfulTouchDate: latestTouch?.meaningful ? latestTouch.date : lead.lastMeaningfulTouchDate || latestTouch?.date || touchDate,
          nextAction: touchEntry.nextAction || getDefaultNextAction(lead.stage || lead.status),
          nextActionDate: touchEntry.nextActionDate || getDefaultNextTouchDate(lead.stage || lead.status, touchDate),
          touchHistory: sortedHistory,
        }
      }),
    )

    closeTouchLogger()
  }

  return (
    <section className="agent-relationship-page">
      <div className="agent-relationship-hero panel">
        <div>
          <span>Relationship Development</span>
          <h2>Agent Prospects</h2>
          <p>Track new connections, purposeful value touches, meetings, and the path to referral partner.</p>
        </div>
        <button type="button" className="primary-button" onClick={openAddRelationshipForm}>
          Add Agent
        </button>
      </div>

      <div className="agent-relationship-summary" aria-label="Agent relationship summary">
        <div>
          <span>Total Connections</span>
          <strong>{relationshipSummary.total}</strong>
        </div>
        <div>
          <span>Need Touch</span>
          <strong>{relationshipSummary.needsTouch}</strong>
        </div>
        <div>
          <span>Meetings</span>
          <strong>{relationshipSummary.meetings}</strong>
        </div>
        <div>
          <span>Active Relationships</span>
          <strong>{relationshipSummary.activeRelationships}</strong>
        </div>
        <div>
          <span>Referral Partners</span>
          <strong>{relationshipSummary.referralPartners}</strong>
        </div>
      </div>

      <div className="panel partner-cadence-panel">
        <div className="panel-header">
          <div>
            <h2>New Partner Cadence</h2>
            <p>A 90-day ramp for turning a promising agent relationship into a consistent referral partner.</p>
          </div>
        </div>

        <div className="partner-cadence-steps">
          {newReferralPartnerCadence.map((step) => (
            <div className="partner-cadence-step" key={`${step.day}-${step.label}`}>
              <span>Day {step.day}</span>
              <strong>{step.label}</strong>
              <small>{step.channel}</small>
              <p>{step.action}</p>
            </div>
          ))}
        </div>
      </div>

      {showRelationshipForm && (
        <form className="panel agent-relationship-form" onSubmit={saveRelationship} ref={formPanelRef}>
          <div className="panel-header">
            <div>
              <h2>{editingProspectId ? 'Edit Agent Relationship' : 'Add Agent Relationship'}</h2>
              <p>Capture who they are, where the relationship stands, and the next purposeful touch.</p>
            </div>
            <button type="button" className="ghost-button" onClick={closeRelationshipForm}>
              Cancel
            </button>
          </div>

          <div className="agent-form-grid">
            <div className="field">
              <label htmlFor="agent-name">Agent Name *</label>
              <input
                id="agent-name"
                value={relationshipForm.client}
                onChange={(event) => updateRelationshipForm('client', event.target.value)}
                placeholder="Jane Agent"
              />
            </div>
            <div className="field">
              <label htmlFor="agent-brokerage">Brokerage / Team</label>
              <input
                id="agent-brokerage"
                value={relationshipForm.brokerage}
                onChange={(event) => updateRelationshipForm('brokerage', event.target.value)}
                placeholder="Brokerage or team"
              />
            </div>
            <div className="field">
              <label htmlFor="agent-phone">Phone</label>
              <input
                id="agent-phone"
                value={relationshipForm.phone}
                onChange={(event) => updateRelationshipForm('phone', event.target.value)}
                placeholder="(864) 555-1234"
              />
            </div>
            <div className="field">
              <label htmlFor="agent-email">Email</label>
              <input
                id="agent-email"
                type="email"
                value={relationshipForm.email}
                onChange={(event) => updateRelationshipForm('email', event.target.value)}
                placeholder="agent@email.com"
              />
            </div>
            <div className="field">
              <label htmlFor="agent-source">Source</label>
              <input
                id="agent-source"
                value={relationshipForm.partner}
                onChange={(event) => updateRelationshipForm('partner', event.target.value)}
                placeholder="Self-Sourced, open house, past client..."
              />
            </div>
            <div className="field">
              <label htmlFor="agent-stage">Relationship Stage</label>
              <select
                id="agent-stage"
                value={relationshipForm.stage}
                onChange={(event) => updateRelationshipForm('stage', event.target.value)}
              >
                {agentProspectStageOptions.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="agent-added-date">Date Added</label>
              <input
                id="agent-added-date"
                type="date"
                value={relationshipForm.referralDate}
                onChange={(event) => updateRelationshipForm('referralDate', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="agent-next-date">Next Touch Date</label>
              <input
                id="agent-next-date"
                type="date"
                value={relationshipForm.nextActionDate}
                onChange={(event) => updateRelationshipForm('nextActionDate', event.target.value)}
              />
            </div>
            <div className="field full">
              <label htmlFor="agent-next-action">Next Purposeful Touch</label>
              <input
                id="agent-next-action"
                value={relationshipForm.nextAction}
                onChange={(event) => updateRelationshipForm('nextAction', event.target.value)}
                placeholder="Example: Send market update and ask for coffee"
              />
            </div>
            <div className="field full">
              <label htmlFor="agent-notes">Relationship Notes</label>
              <textarea
                id="agent-notes"
                ref={notesFieldRef}
                value={relationshipForm.detail}
                onChange={(event) => updateRelationshipForm('detail', event.target.value)}
                placeholder="Where they work, niches, shared connections, personal notes, and what would be valuable to them..."
              />
            </div>
          </div>

          <div className="agent-form-actions">
            <button type="button" className="ghost-button" onClick={closeRelationshipForm}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Save Relationship
            </button>
          </div>
        </form>
      )}

      <div className="agent-relationship-workbench">
        <aside className="panel agent-touch-queue">
          <div className="panel-header">
            <div>
              <h2>Purposeful Touch Queue</h2>
              <p>The next relationship-building moves to make.</p>
            </div>
          </div>
          <div className="agent-touch-queue-list">
            {touchQueue.map((prospect) => (
              <button type="button" key={prospect.id} className="agent-touch-queue-row" onClick={() => openTouchLogger(prospect)}>
                <span className={`agent-touch-status ${prospect.touchStatus.className}`}>{prospect.touchStatus.label}</span>
                <strong>{prospect.client}</strong>
                <small>{prospect.nextAction || getDefaultNextAction(prospect.stage)}</small>
              </button>
            ))}
            {touchQueue.length === 0 && (
              <div className="empty-state">
                <strong>No agent prospects yet.</strong>
                <p>Add new connections to start building a purposeful touch rhythm.</p>
              </div>
            )}
          </div>
        </aside>

        <div className="panel agent-directory-panel">
          <div className="panel-header">
            <div>
              <h2>Relationship List</h2>
              <p>Manage agent connections by stage, source, and next touch.</p>
            </div>
            <span className="dashboard-pill">{visibleProspects.length} shown</span>
          </div>

          <div className="agent-relationship-toolbar">
            <label>
              <span>Search</span>
              <input
                type="search"
                value={agentQuery}
                onChange={(event) => setAgentQuery(event.target.value)}
                placeholder="Search agent, brokerage, source, or notes"
              />
            </label>
            <label>
              <span>Source</span>
              <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
                {agentSources.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Stage</span>
              <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                <option>All Stages</option>
                {agentProspectStageOptions.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="agent-relationship-list">
            {visibleProspects.map((prospect) => (
              (() => {
                const isExpanded = expandedProspectId === prospect.id || touchProspectId === prospect.id

                return (
                  <article className={isExpanded ? 'agent-relationship-card expanded' : 'agent-relationship-card'} key={prospect.id}>
                    <div className="agent-card-preview-row">
                      <div className="agent-card-name">
                        <span>{prospect.lane}</span>
                        <h3>{prospect.client}</h3>
                      </div>

                      <div className="agent-card-date">
                        <span>Last Touch</span>
                        <strong>{shortDate(prospect.lastTouch)}</strong>
                      </div>

                      <div className="agent-card-date">
                        <span>Next Touch</span>
                        <strong>{shortDate(prospect.nextActionDate)}</strong>
                      </div>

                      <div className="agent-card-statuses compact">
                        <span className={`agent-touch-status ${prospect.touchStatus.className}`}>{prospect.touchStatus.label}</span>
                        <span className="agent-stage-pill">{prospect.stage}</span>
                      </div>

                      <div className="agent-card-actions compact">
                        <button type="button" className="primary-button small-button" onClick={() => openTouchLogger(prospect)}>
                          Log Touch
                        </button>
                        <button type="button" className="ghost-button small-button" onClick={() => startEditingProspect(prospect, { focusNotes: true })}>
                          Edit Notes
                        </button>
                        <button
                          type="button"
                          className="ghost-button small-button"
                          onClick={() => setExpandedProspectId((current) => (current === prospect.id ? null : prospect.id))}
                        >
                          {isExpanded ? 'Hide Details' : 'Details'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="agent-card-expanded-body">
                        <div className="agent-next-action">
                          <span>Next Purposeful Touch</span>
                          <p>{prospect.nextAction || getDefaultNextAction(prospect.stage)}</p>
                        </div>

                        <div className="agent-card-detail-grid">
                          <div>
                            <span>Phone</span>
                            <strong>{prospect.phone || '-'}</strong>
                          </div>
                          <div>
                            <span>Email</span>
                            <strong>{prospect.email || '-'}</strong>
                          </div>
                          <div>
                            <span>Source</span>
                            <strong>{prospect.partner || 'Self-Sourced'}</strong>
                          </div>
                        </div>

                        <div className={prospect.detail ? 'agent-relationship-notes' : 'agent-relationship-notes empty'}>
                          <span>Relationship Notes</span>
                          <p>{prospect.detail || 'No notes added yet. Use Edit Notes to capture relationship context, personal details, and value ideas.'}</p>
                        </div>

                        {prospect.touchHistory.length > 0 && (
                          <div className="agent-touch-history">
                            <div className="agent-touch-history-heading">
                              <span>Touch History</span>
                              <small>{prospect.touchHistory.length} touch{prospect.touchHistory.length === 1 ? '' : 'es'}</small>
                            </div>
                            <div className="agent-touch-history-list">
                              {prospect.touchHistory.map((touch, touchIndex) => (
                                <div className="agent-touch-history-item" key={touch.id || `${prospect.id}-touch-${touchIndex}`}>
                                  <div className="agent-touch-history-copy">
                                    <strong>{shortDate(touch.date)} - {touch.type}</strong>
                                    <p>{touch.outcome ? `${touch.outcome}. ` : ''}{touch.note}</p>
                                    {(touch.nextAction || touch.nextActionDate) && (
                                      <small>Next: {touch.nextAction || 'Purposeful touch'}{touch.nextActionDate ? ` on ${shortDate(touch.nextActionDate)}` : ''}</small>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="ghost-button small-button"
                                    onClick={() => startEditingTouch(prospect, touch, touchIndex)}
                                  >
                                    Edit Touch
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="agent-stage-control">
                          <label>
                            Relationship Stage
                            <select value={prospect.stage} onChange={(event) => updateProspectStage(prospect, event.target.value)}>
                              {agentProspectStageOptions.map((stage) => (
                                <option key={stage}>{stage}</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {touchProspectId === prospect.id && (
                          <div className="agent-touch-logger">
                            <div className="agent-touch-logger-heading">
                              <span>{editingTouch ? 'Edit Touch' : 'Log Touch'}</span>
                              <p>{editingTouch ? 'Update the saved touch details and reminder.' : 'Capture the contact and set the next purposeful touch.'}</p>
                            </div>
                            <div className="agent-touch-logger-grid">
                              <label>
                                Touch Date
                                <input
                                  type="date"
                                  value={touchDraft.date}
                                  onChange={(event) => updateTouchDraft('date', event.target.value)}
                                />
                              </label>
                              <label>
                                Touch Type
                                <select value={touchDraft.type} onChange={(event) => updateTouchDraft('type', event.target.value)}>
                                  {touchTypeOptions.map((type) => (
                                    <option key={type}>{type}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Outcome
                                <select value={touchDraft.outcome} onChange={(event) => updateTouchDraft('outcome', event.target.value)}>
                                  {touchOutcomeOptions.map((outcome) => (
                                    <option key={outcome}>{outcome}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="full">
                                Touch Note
                                <textarea
                                  value={touchDraft.note}
                                  onChange={(event) => updateTouchDraft('note', event.target.value)}
                                  placeholder="What happened, what they care about, and what you learned..."
                                />
                              </label>
                              <label>
                                Next Touch
                                <input
                                  value={touchDraft.nextAction}
                                  onChange={(event) => updateTouchDraft('nextAction', event.target.value)}
                                  placeholder="Next purposeful touch"
                                />
                              </label>
                              <label>
                                Next Touch Date
                                <input
                                  type="date"
                                  value={touchDraft.nextActionDate}
                                  onChange={(event) => updateTouchDraft('nextActionDate', event.target.value)}
                                />
                              </label>
                            </div>
                            <div className="agent-touch-actions">
                              <button type="button" className="ghost-button small-button" onClick={closeTouchLogger}>
                                Cancel
                              </button>
                              <button type="button" className="primary-button small-button" onClick={() => saveTouch(prospect)}>
                                {editingTouch ? 'Update Touch' : 'Save Touch'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="agent-card-actions">
                          <button type="button" className="ghost-button small-button" onClick={() => startEditingProspect(prospect)}>
                            Edit Details
                          </button>
                          {prospect.stage !== 'Referral Partner' && (
                            <button type="button" className="ghost-button small-button" onClick={() => promoteToReferralPartner(prospect)}>
                              Mark Referral Partner
                            </button>
                          )}
                          <button type="button" className="ghost-button danger-button small-button" onClick={() => archiveProspect(prospect.id)}>
                            Archive
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })()
            ))}
          </div>

          {visibleProspects.length === 0 && (
            <div className="empty-state agent-empty-state">
              <strong>No agent relationships match this view.</strong>
              <p>Add a new connection or loosen the filters.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default AgentProspectsPage
