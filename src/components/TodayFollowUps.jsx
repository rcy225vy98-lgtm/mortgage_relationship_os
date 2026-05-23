import { getTodaysFollowUps } from '../utils/followups'
import { shortDate } from '../utils/formatting'

function parseDateValue(dateValue) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function normalizeStage(stage) {
  return String(stage || '').trim().toLowerCase()
}

function isFriday(dateValue = new Date()) {
  const date = parseDateValue(dateValue) || new Date()
  return date.getDay() === 5
}

function isFirstWednesdayOfMonth(dateValue = new Date()) {
  const date = parseDateValue(dateValue) || new Date()
  return date.getDay() === 3 && date.getDate() <= 7
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

function getClosedClientFollowUpLabel(lead, today = new Date()) {
  const daysSinceClosed = getDaysSinceDate(getClosedLeadDate(lead), today)

  if (daysSinceClosed === 7) return '7-day post-closing check-in'
  if (daysSinceClosed === 30) return '30-day first-payment check-in'
  if (daysSinceClosed === 90) return '90-day homeowner check-in'
  if (daysSinceClosed === 180) return '6-month homeowner check-in'
  if (daysSinceClosed >= 365 && daysSinceClosed % 365 === 0) return 'Annual mortgage review'

  return 'Post-closing follow-up'
}

function getFollowUpTaskLabel(lead, today = new Date()) {
  const stage = normalizeStage(lead.stage || lead.status)
  const isPreApprovedStage = stage === 'pre-approved' || stage === 'pre-qualified'

  if (stage === 'closed') {
    return getClosedClientFollowUpLabel(lead, today)
  }

  if (!isPreApprovedStage) {
    return 'Regular follow-up due'
  }

  const preApprovalActivityDate = getPreApprovalActivityDate(lead)
  const isOlderPreApproval = isOlderThanDays(preApprovalActivityDate, 90, today)

  if (isOlderPreApproval && isFirstWednesdayOfMonth(today)) {
    return 'Monthly reset outreach'
  }

  if (isOlderPreApproval && isFriday(today)) {
    return 'Weekly email nurture'
  }

  if (!isOlderPreApproval && isFriday(today)) {
    return 'Friday pre-approval check-in'
  }

  return 'Pre-approval follow-up'
}

function isStalePreApprovalLead(lead, today = new Date()) {
  const stage = normalizeStage(lead.stage || lead.status)
  const isPreApprovedStage = stage === 'pre-approved' || stage === 'pre-qualified'

  if (!isPreApprovedStage) return false

  const preApprovalActivityDate = getPreApprovalActivityDate(lead)
  return isOlderThanDays(preApprovalActivityDate, 90, today)
}

export default function TodayFollowUps({ leads = [], onMarkTouched, onMarkReactivated, onOpenLead }) {
  const followUps = getTodaysFollowUps(leads)

  async function copyMessage(message) {
    await navigator.clipboard.writeText(message)
    alert('Message copied to clipboard')
  }

  return (
    <section className="panel followup-panel">
      <div className="panel-header">
        <div>
          <h2>Today’s Follow-Ups</h2>
          <p>Due and overdue touches based on your cadence rules.</p>
        </div>
        <span className="followup-count">{followUps.length}</span>
      </div>

      {followUps.length > 0 ? (
        <div className="followup-list">
          {followUps.map((lead) => (
            <article
              className={onOpenLead ? 'followup-card clickable-followup-card' : 'followup-card'}
              key={lead.id}
              role={onOpenLead ? 'button' : undefined}
              tabIndex={onOpenLead ? 0 : undefined}
              onClick={() => onOpenLead?.(lead.id)}
              onKeyDown={(event) => {
                if (!onOpenLead) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenLead(lead.id)
                }
              }}
            >
              <div className="followup-card-header">
                <div className="followup-client-block">
                  <div className="followup-title-row">
                    <h3>{lead.client}</h3>
                    <span className={lead.dueLabel === 'Due today' ? 'due-pill today' : 'due-pill overdue'}>
                      {lead.dueLabel}
                    </span>
                  </div>
                  <p className="followup-meta-line">
                    <span>{lead.leadType || 'Buyer Lead'}</span>
                    <span>{lead.stage || 'New Referral'}</span>
                    <span>Next: {shortDate(lead.nextActionDate)}</span>
                  </p>
                </div>

                <span className="followup-task-pill">{getFollowUpTaskLabel(lead)}</span>
              </div>

              <div className="suggested-message compact-message-preview">
                <span>Suggested message</span>
                <p>{lead.suggestedMessage}</p>
              </div>

              <div className="followup-actions">
                <button
                  type="button"
                  className="ghost-button small-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    copyMessage(lead.suggestedMessage)
                  }}
                >
                  Copy {getFollowUpTaskLabel(lead).includes('email') ? 'Email' : 'Message'}
                </button>
                {isStalePreApprovalLead(lead) && (
                  <button
                    type="button"
                    className="ghost-button small-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onMarkReactivated?.(lead.id)
                    }}
                  >
                    Mark Reactivated
                  </button>
                )}
                <button
                  type="button"
                  className="primary-button small-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onMarkTouched?.(lead.id)
                  }}
                >
                  Mark Touched
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state followup-empty">
          <strong>No follow-ups due today.</strong>
          <p>You’re clear for now based on the next action dates in your tracker.</p>
        </div>
      )}
    </section>
  )
}