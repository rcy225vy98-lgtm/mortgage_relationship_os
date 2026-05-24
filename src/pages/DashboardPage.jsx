import TodayFollowUps from '../components/TodayFollowUps'

function formatMoney(value, formatCompactCurrency) {
  return formatCompactCurrency ? formatCompactCurrency(value || 0) : `$${Number(value || 0).toLocaleString()}`
}

function getDashboardDateLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function DashboardPage({
  dailyOperatingPrinciple,
  importLeadTrackerFile,
  pendingLeadImport,
  cancelPendingLeadImport,
  confirmPendingLeadImport,
  leadImportSummary,
  formatCompactCurrency,
  weeklyOperatingRhythm,
  loanTimingOverview,
  calendarMonthOffset,
  setCalendarMonthOffset,
  openLeadInPipeline,
  clearTridAlert,
  partnerTouchReminders,
  openPartnerProfile,
  completePartnerReminder,
  todayFollowUpLeads,
  markTouchedToday,
  markPreApprovalReactivated,
  dashboardOverview,
}) {
  const appraisalAlerts = loanTimingOverview.appraisalAlerts || []
  const duePartnerTouches = partnerTouchReminders.due || []
  const upcomingPartnerTouches = partnerTouchReminders.upcoming || []
  const closingWindowLeads = loanTimingOverview.tenBusinessDayClosings || []
  const tridAlerts = loanTimingOverview.tridAlerts || []
  const followUpCount = todayFollowUpLeads.length
  const riskCount = tridAlerts.length + appraisalAlerts.length + closingWindowLeads.length
  const relationshipCount = duePartnerTouches.length + upcomingPartnerTouches.length
  const attentionCount = followUpCount + duePartnerTouches.length + tridAlerts.length + appraisalAlerts.length
  const topPartnerName = dashboardOverview.partnerMomentum[0]?.partner || 'Build one this week'
  const actionQueue = [
    ...todayFollowUpLeads.slice(0, 4).map((lead) => ({
      id: `followup-${lead.id}`,
      tone: lead.dueLabel === 'Overdue' ? 'urgent' : 'today',
      label: lead.dueLabel || 'Due today',
      title: lead.client,
      detail: `${lead.stage || 'Lead'} · ${lead.nextAction || 'Follow up with client'}`,
      actionLabel: 'Open Lead',
      onAction: () => openLeadInPipeline(lead.id),
      secondaryLabel: 'Mark Touched',
      onSecondary: () => markTouchedToday(lead.id),
    })),
    ...tridAlerts.slice(0, 3).map((lead) => ({
      id: `trid-${lead.id}`,
      tone: 'risk',
      label: 'TRID',
      title: lead.client,
      detail: `Closing ${lead.closingDate} · ${lead.businessDaysToClosing} business day${lead.businessDaysToClosing === 1 ? '' : 's'}`,
      actionLabel: 'Review File',
      onAction: () => openLeadInPipeline(lead.id),
      secondaryLabel: 'Clear',
      onSecondary: () => clearTridAlert(lead.id),
    })),
    ...appraisalAlerts.slice(0, 3).map((alert) => ({
      id: `appraisal-${alert.leadId}-${alert.type}`,
      tone: alert.severity === 'danger' ? 'urgent' : 'risk',
      label: 'Appraisal',
      title: alert.client,
      detail: alert.message,
      actionLabel: 'Open File',
      onAction: () => openLeadInPipeline(alert.leadId),
    })),
    ...duePartnerTouches.slice(0, 3).map((reminder) => ({
      id: `partner-${reminder.partnerName}-${reminder.touchId}`,
      tone: 'relationship',
      label: 'Partner',
      title: reminder.partnerName,
      detail: reminder.nextAction,
      actionLabel: 'Open Partner',
      onAction: () => openPartnerProfile({ partner: reminder.partnerName }),
      secondaryLabel: 'Complete',
      onSecondary: () => completePartnerReminder(reminder.partnerName, reminder.touchId),
    })),
  ].slice(0, 7)
  const hasActionQueue = actionQueue.length > 0
  const focusLine = hasActionQueue
    ? `${actionQueue[0].title}: ${actionQueue[0].detail}`
    : 'No urgent queue items. Use the clean slate to create fresh partner touches or review pipeline quality.'

  return (
    <>
      <section className="daily-command-center">
        <div className="command-hero">
          <div>
            <span className="command-date">{getDashboardDateLabel()}</span>
            <h1>Today’s command center</h1>
            <p>{focusLine}</p>
          </div>
          <div className="command-hero-actions">
            <button type="button" className="primary-button" onClick={() => actionQueue[0]?.onAction?.()} disabled={!hasActionQueue}>
              Start Top Priority
            </button>
            <button type="button" className="ghost-button" onClick={() => openLeadInPipeline(todayFollowUpLeads[0]?.id)}>
              Open Pipeline
            </button>
          </div>
        </div>

        <div className="command-principle-card">
          <span>Operating Principle</span>
          <p>{dailyOperatingPrinciple}</p>
          <label className="import-csv-button">
            Import Lead Tracker CSV
            <input type="file" accept=".csv,text/csv" onChange={importLeadTrackerFile} />
          </label>
        </div>
      </section>

      <section className="command-metric-strip" aria-label="Daily operating metrics">
        <div>
          <span>Do Today</span>
          <strong>{attentionCount}</strong>
          <p>{followUpCount} borrower touch{followUpCount === 1 ? '' : 'es'} · {duePartnerTouches.length} partner touch{duePartnerTouches.length === 1 ? '' : 'es'}</p>
        </div>
        <div>
          <span>{dashboardOverview.currentYear} Referrals</span>
          <strong>{dashboardOverview.leadsThisYear}</strong>
          <p>{dashboardOverview.leadToPreQualifiedRate}% YTD lead-to-preapproval</p>
        </div>
        <div>
          <span>Closing Risk</span>
          <strong>{riskCount}</strong>
          <p>{tridAlerts.length} TRID · {appraisalAlerts.length} appraisal · {closingWindowLeads.length} close-window</p>
        </div>
        <div>
          <span>Future Volume</span>
          <strong>{formatMoney(dashboardOverview.projectedFutureVolume, formatCompactCurrency)}</strong>
          <p>{dashboardOverview.futureClosings} future closing{dashboardOverview.futureClosings === 1 ? '' : 's'}</p>
        </div>
        <div>
          <span>Top Relationship</span>
          <strong>{topPartnerName}</strong>
          <p>{relationshipCount} relationship item{relationshipCount === 1 ? '' : 's'} in motion</p>
        </div>
      </section>

      <section className="daily-workbench">
        <div className="panel priority-queue-panel">
          <div className="panel-header">
            <div>
              <h2>Priority Queue</h2>
              <p>The highest-impact borrower, file, and partner actions in one list.</p>
            </div>
            <span className="dashboard-pill">{actionQueue.length} queued</span>
          </div>

          {hasActionQueue ? (
            <div className="priority-queue-list">
              {actionQueue.map((item, index) => (
                <article className={`priority-queue-item ${item.tone}`} key={item.id}>
                  <div className="priority-rank">{index + 1}</div>
                  <div className="priority-queue-copy">
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <div className="priority-queue-actions">
                    {item.secondaryLabel && (
                      <button type="button" className="ghost-button small-button" onClick={item.onSecondary}>
                        {item.secondaryLabel}
                      </button>
                    )}
                    <button type="button" className="primary-button small-button" onClick={item.onAction}>
                      {item.actionLabel}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state command-empty-state">
              <strong>No urgent actions queued.</strong>
              <p>Pipeline follow-ups, partner touches, and timing alerts are clear for today.</p>
            </div>
          )}
        </div>

        <div className="command-side-stack">
          <div className="panel command-lane-card">
            <div className="panel-header">
              <div>
                <h2>Revenue Lane</h2>
                <p>Where active production is concentrated.</p>
              </div>
            </div>
            <div className="command-stage-list">
              {dashboardOverview.buyerPipeline.map((row) => (
                <div className="command-stage-row" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel command-lane-card relationship-lane">
            <div className="panel-header">
              <div>
                <h2>Relationship Lane</h2>
                <p>Referral partners and agent pipeline health.</p>
              </div>
            </div>
            <div className="command-stage-list">
              <div className="command-stage-row">
                <span>Referral Partners</span>
                <strong>{dashboardOverview.referralPartnerCount}</strong>
              </div>
              <div className="command-stage-row">
                <span>Agent Prospects</span>
                <strong>{dashboardOverview.activeAgentProspects}</strong>
              </div>
              <div className="command-stage-row highlight">
                <span>Top Partner</span>
                <strong>{topPartnerName}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {pendingLeadImport && (
        <section className="import-summary-card preview">
          <div>
            <span>Import Preview</span>
            <strong>{pendingLeadImport.fileName}</strong>
            <p>
              Ready to import {pendingLeadImport.summary.totalImported} new lead{pendingLeadImport.summary.totalImported === 1 ? '' : 's'} from {pendingLeadImport.summary.totalCsvRows} CSV rows. {pendingLeadImport.summary.skippedDuplicates} duplicate{pendingLeadImport.summary.skippedDuplicates === 1 ? '' : 's'} will be skipped.
            </p>
          </div>
          <div className="import-summary-metrics">
            <div>
              <span>Buyer Leads</span>
              <strong>{pendingLeadImport.summary.buyerLeads}</strong>
            </div>
            <div>
              <span>Closed</span>
              <strong>{pendingLeadImport.summary.closed}</strong>
            </div>
            <div>
              <span>Closing Dates</span>
              <strong>{pendingLeadImport.summary.withClosingDate}</strong>
            </div>
            <div>
              <span>Loan Volume</span>
              <strong>{formatCompactCurrency(pendingLeadImport.summary.totalLoanAmount)}</strong>
            </div>
          </div>
          <div className="import-preview-actions">
            <button type="button" className="ghost-button" onClick={cancelPendingLeadImport}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={confirmPendingLeadImport}>
              Import These Leads
            </button>
          </div>
        </section>
      )}

      {leadImportSummary && (
        <section className={leadImportSummary.error ? 'import-summary-card error' : 'import-summary-card'}>
          <div>
            <span>Last Import</span>
            <strong>{leadImportSummary.fileName}</strong>
            {leadImportSummary.error ? (
              <p>{leadImportSummary.error}</p>
            ) : (
              <p>
                Imported {leadImportSummary.totalImported} new leads from {leadImportSummary.totalCsvRows} CSV rows. Skipped {leadImportSummary.skippedDuplicates} duplicate{leadImportSummary.skippedDuplicates === 1 ? '' : 's'}.
              </p>
            )}
          </div>
          {!leadImportSummary.error && (
            <div className="import-summary-metrics">
              <div>
                <span>Buyer Leads</span>
                <strong>{leadImportSummary.buyerLeads}</strong>
              </div>
              <div>
                <span>Closed</span>
                <strong>{leadImportSummary.closed}</strong>
              </div>
              <div>
                <span>Closing Dates</span>
                <strong>{leadImportSummary.withClosingDate}</strong>
              </div>
              <div>
                <span>Loan Volume</span>
                <strong>{formatCompactCurrency(leadImportSummary.totalLoanAmount)}</strong>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Cloud Sync compact card removed */}

      <section className="weekly-rhythm-card">
        <div>
          <span>Weekly Operating Rhythm</span>
          <h2>{weeklyOperatingRhythm.day}: {weeklyOperatingRhythm.theme}</h2>
          <p>{weeklyOperatingRhythm.action}</p>
        </div>
        <div className="weekly-rhythm-mini-list">
          <div className={weeklyOperatingRhythm.day === 'Monday' ? 'active' : ''}>
            <span>Mon</span>
            <strong>Partner Follow-Up</strong>
          </div>
          <div className={weeklyOperatingRhythm.day === 'Tuesday' ? 'active' : ''}>
            <span>Tue</span>
            <strong>Status Updates</strong>
          </div>
          <div className={weeklyOperatingRhythm.day === 'Wednesday' ? 'active' : ''}>
            <span>Wed</span>
            <strong>Lead Follow-Ups</strong>
          </div>
          <div className={weeklyOperatingRhythm.day === 'Thursday' ? 'active' : ''}>
            <span>Thu</span>
            <strong>Database Day</strong>
          </div>
          <div className={weeklyOperatingRhythm.day === 'Friday' ? 'active' : ''}>
            <span>Fri</span>
            <strong>Pre-Approval Updates</strong>
          </div>
        </div>
      </section>

      <section className="panel loan-timing-panel">
        <div className="panel-header">
          <div>
            <h2>Loan Timing Calendar</h2>
            <p>Upcoming closings, federal holidays, and loan timing alerts for {loanTimingOverview.monthLabel}.</p>
          </div>
          <div className="calendar-header-actions">
            {calendarMonthOffset !== 0 && (
              <button type="button" className="ghost-button small-button" onClick={() => setCalendarMonthOffset(0)}>
                Today
              </button>
            )}
            <div className="calendar-month-controls" aria-label="Calendar month controls">
              <button type="button" onClick={() => setCalendarMonthOffset((current) => current - 1)} aria-label="Previous month">
                ‹
              </button>
              <span>{loanTimingOverview.monthLabel}</span>
              <button type="button" onClick={() => setCalendarMonthOffset((current) => current + 1)} aria-label="Next month">
                ›
              </button>
            </div>
            <span className="dashboard-pill">{loanTimingOverview.upcomingClosingsThisMonth.length} closings this month</span>
          </div>
        </div>

        <div className="loan-month-calendar">
          <div className="loan-calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="loan-calendar-grid">
            {loanTimingOverview.monthCalendarDays.map((day) => (
              <div
                className={[
                  'loan-calendar-day',
                  day.isBlank ? 'blank' : '',
                  day.isToday ? 'today' : '',
                  day.isWeekend ? 'weekend' : '',
                  day.holiday ? 'holiday' : '',
                  day.closings?.length ? 'has-closing' : '',
                  day.hasTimingRisk ? 'risk' : '',
                ].filter(Boolean).join(' ')}
                key={day.key}
              >
                {!day.isBlank && (
                  <>
                    <strong>{day.dayNumber}</strong>
                    <div className="loan-calendar-events">
                      {day.holiday && <span className="holiday-event">Holiday</span>}
                      {day.closings?.slice(0, 2).map((lead) => (
                        <button type="button" className="closing-event clickable" key={lead.id} onClick={() => openLeadInPipeline(lead.id)}>
                          {lead.client}
                        </button>
                      ))}
                      {day.closings?.length > 2 && <span className="more-event">+{day.closings.length - 2} more</span>}
                    </div>

                    {day.closings?.length > 0 && (
                      <div className="calendar-closing-tooltip">
                        <span>{day.closings.length} closing{day.closings.length === 1 ? '' : 's'}</span>
                        {day.closings.map((lead) => (
                          <button type="button" key={lead.id} onClick={() => openLeadInPipeline(lead.id)}>
                            <strong>{lead.client}</strong>
                            <small>{lead.stage} · ${Number(lead.loanAmount || 0).toLocaleString()}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="loan-calendar-legend">
            <span className="legend-closing">Closing</span>
            <span className="legend-holiday">Federal Holiday</span>
          </div>
        </div>

        <div className="loan-timing-grid">
          <div className="loan-timing-column">
            <h3>10 Business Day Closing Window</h3>
            {loanTimingOverview.tenBusinessDayClosings.length > 0 ? (
              <div className="loan-timing-list">
                {loanTimingOverview.tenBusinessDayClosings.slice(0, 5).map((lead) => (
                  <button type="button" className="loan-timing-row clickable" key={lead.id} onClick={() => openLeadInPipeline(lead.id)}>
                    <span>{lead.businessDaysToClosing} business day{lead.businessDaysToClosing === 1 ? '' : 's'} · {lead.closingDate}</span>
                    <strong>{lead.client}</strong>
                    <small>{lead.stage} · ${Number(lead.loanAmount || 0).toLocaleString()}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="loan-timing-empty">No files are inside the 10 business day closing window.</p>
            )}
          </div>

          <div className="loan-timing-column risk-column">
            <h3>TRID Alerts</h3>
            {loanTimingOverview.tridAlerts.length > 0 ? (
              <div className="trid-alert-list standalone">
                {loanTimingOverview.tridAlerts.map((lead) => (
                  <div className="trid-alert-item" key={lead.id}>
                    <button type="button" className="trid-alert-lead-link" onClick={() => openLeadInPipeline(lead.id)}>
                      <strong>{lead.client}</strong>
                      <span>Closing {lead.closingDate} · {lead.businessDaysToClosing} business day{lead.businessDaysToClosing === 1 ? '' : 's'}</span>
                    </button>
                    <button type="button" className="ghost-button small-button" onClick={() => clearTridAlert(lead.id)}>
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="loan-timing-empty">No TRID alerts inside the 5 business day window.</p>
            )}
          </div>

          <div className="loan-timing-column appraisal-alert-column">
            <h3>Appraisal Alerts</h3>
            {appraisalAlerts.length > 0 ? (
              <div className="trid-alert-list standalone appraisal-alert-list">
                {appraisalAlerts.map((alert) => (
                  <div className={`trid-alert-item appraisal-alert-item ${alert.severity || 'warning'}`} key={`${alert.leadId}-${alert.type}`}>
                    <button type="button" className="trid-alert-lead-link" onClick={() => openLeadInPipeline(alert.leadId)}>
                      <strong>{alert.client}</strong>
                      <span>{alert.message}</span>
                      {alert.detail && <small>{alert.detail}</small>}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="loan-timing-empty">No appraisal alerts right now.</p>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-action-grid">
        <section className="panel partner-reminders-panel">
          <div className="panel-header">
            <div>
              <h2>Partner Touch Reminders</h2>
              <p>Relationship follow-ups from your partner touch history.</p>
            </div>
            <span className="dashboard-pill">{partnerTouchReminders.due.length} due</span>
          </div>

          {partnerTouchReminders.due.length === 0 && partnerTouchReminders.upcoming.length === 0 ? (
            <div className="partner-reminder-empty">
              <strong>No partner touches due.</strong>
              <p>Add a Next Touch Date inside a Partner Profile to create a relationship reminder.</p>
            </div>
          ) : (
            <div className="partner-reminder-list">
              {partnerTouchReminders.due.length > 0 && (
                <div className="partner-reminder-group-label">Due / Overdue</div>
              )}
              {partnerTouchReminders.due.slice(0, 4).map((reminder) => (
                <div className="partner-reminder-card" key={`${reminder.partnerName}-${reminder.touchId}`}>
                  <div>
                    <strong>{reminder.partnerName}</strong>
                    <p>{reminder.nextAction}</p>
                    {reminder.previousTouchType && <small>Last touch: {reminder.previousTouchType}</small>}
                  </div>
                  <div className="partner-reminder-meta">
                    <span>Due {reminder.dueDate}</span>
                    <button type="button" className="ghost-button small-button" onClick={() => openPartnerProfile({ partner: reminder.partnerName })}>
                      Open Partner
                    </button>
                    <button type="button" className="primary-button small-button" onClick={() => completePartnerReminder(reminder.partnerName, reminder.touchId)}>
                      Complete
                    </button>
                  </div>
                </div>
              ))}

              {partnerTouchReminders.upcoming.length > 0 && (
                <div className="partner-reminder-group-label">Upcoming Next 14 Days</div>
              )}
              {partnerTouchReminders.upcoming.slice(0, 4).map((reminder) => (
                <div className="partner-reminder-card upcoming" key={`${reminder.partnerName}-${reminder.touchId}`}>
                  <div>
                    <strong>{reminder.partnerName}</strong>
                    <p>{reminder.nextAction}</p>
                    {reminder.previousTouchType && <small>Last touch: {reminder.previousTouchType}</small>}
                  </div>
                  <div className="partner-reminder-meta">
                    <span>Upcoming {reminder.dueDate}</span>
                    <button type="button" className="ghost-button small-button" onClick={() => openPartnerProfile({ partner: reminder.partnerName })}>
                      Open Partner
                    </button>
                    <button type="button" className="primary-button small-button" onClick={() => completePartnerReminder(reminder.partnerName, reminder.touchId)}>
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <TodayFollowUps
          leads={todayFollowUpLeads}
          onMarkTouched={markTouchedToday}
          onMarkReactivated={markPreApprovalReactivated}
          onOpenLead={openLeadInPipeline}
        />
      </section>

      <section className="production-dashboard-grid">
        <div className="panel production-side-card">
          <div className="panel-header">
            <div>
              <h2>Pipeline Snapshot</h2>
              <p>Current buyer pipeline by stage.</p>
            </div>
          </div>

          <div className="compact-pipeline-list">
            {dashboardOverview.buyerPipeline.map((row) => (
              <div className="compact-pipeline-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel production-side-card">
          <div className="panel-header">
            <div>
              <h2>Relationship Snapshot</h2>
              <p>Referral partner and agent growth view.</p>
            </div>
          </div>

          <div className="compact-pipeline-list">
            <div className="compact-pipeline-row">
              <span>Referral Partners</span>
              <strong>{dashboardOverview.referralPartnerCount}</strong>
            </div>
            <div className="compact-pipeline-row">
              <span>Agent Prospects</span>
              <strong>{dashboardOverview.activeAgentProspects}</strong>
            </div>
            <div className="compact-pipeline-row highlight">
              <span>Top Partner</span>
              <strong>{dashboardOverview.partnerMomentum[0]?.partner || 'None yet'}</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default DashboardPage
