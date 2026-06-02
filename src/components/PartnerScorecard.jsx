import { useMemo, useState } from 'react'
import { shortDate } from '../utils/formatting'

function parseDateValue(dateValue) {
  if (!dateValue) return null

  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function getDaysUntil(dateValue) {
  const date = parseDateValue(dateValue)
  if (!date) return null

  const today = new Date()
  today.setHours(12, 0, 0, 0)

  return Math.ceil((date - today) / 86400000)
}

function getPartnerTier(row) {
  if (row.score >= 4) return { label: 'High Value', className: 'high' }
  if (row.score >= 0) return { label: 'Develop', className: 'moderate' }
  return { label: 'Watch', className: 'low' }
}

function getCadenceState(row) {
  const daysUntil = getDaysUntil(row.nextActionDate)

  if (daysUntil === null) {
    return {
      label: 'Needs Plan',
      detail: 'No next touch scheduled',
      className: 'warning',
      urgency: 1,
    }
  }

  if (daysUntil < 0) {
    return {
      label: 'Overdue',
      detail: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue`,
      className: 'danger',
      urgency: 0,
    }
  }

  if (daysUntil <= 7) {
    return {
      label: 'Due Soon',
      detail: daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      className: 'warning',
      urgency: 2,
    }
  }

  return {
    label: 'On Track',
    detail: `Due ${shortDate(row.nextActionDate)}`,
    className: 'good',
    urgency: 3,
  }
}

function getConversionRate(row) {
  if (!row.referrals) return 0
  return Math.round((row.closed / row.referrals) * 100)
}

function getRecentTouch(partnerProfile) {
  const touchHistory = partnerProfile?.touchHistory || []
  return touchHistory[0] || null
}

export default function PartnerScorecard({ partnerRows, partnerProfiles = {}, onOpenPartner }) {
  const [expandedPartner, setExpandedPartner] = useState(null)
  const [partnerSearch, setPartnerSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [cadenceFilter, setCadenceFilter] = useState('all')
  const [sortMode, setSortMode] = useState('score')

  function togglePartner(partner) {
    setExpandedPartner((current) => (current === partner ? null : partner))
  }

  const enrichedRows = useMemo(() => {
    return partnerRows.map((row) => {
      const partnerProfile = partnerProfiles[row.partner] || {}
      const recentTouch = getRecentTouch(partnerProfile)
      const tier = getPartnerTier(row)
      const cadence = getCadenceState(row)

      return {
        ...row,
        partnerProfile,
        recentTouch,
        tier,
        cadence,
        conversionRate: getConversionRate(row),
      }
    })
  }, [partnerRows, partnerProfiles])

  const partnerSummary = useMemo(() => {
    const totalReferrals = enrichedRows.reduce((total, row) => total + row.referrals, 0)
    const totalPreApproved = enrichedRows.reduce((total, row) => total + row.preApproved, 0)
    const totalUnderContract = enrichedRows.reduce((total, row) => total + row.underContract, 0)
    const totalClosed = enrichedRows.reduce((total, row) => total + row.closed, 0)
    const highValuePartners = enrichedRows.filter((row) => row.tier.className === 'high').length
    const actionNeeded = enrichedRows.filter((row) => row.cadence.className !== 'good').length

    return {
      totalPartners: enrichedRows.length,
      totalReferrals,
      totalPreApproved,
      totalUnderContract,
      totalClosed,
      highValuePartners,
      actionNeeded,
      conversionRate: totalReferrals ? Math.round((totalClosed / totalReferrals) * 100) : 0,
    }
  }, [enrichedRows])

  const focusRows = useMemo(() => {
    return [...enrichedRows]
      .sort((a, b) => a.cadence.urgency - b.cadence.urgency || b.closed - a.closed || b.score - a.score)
      .slice(0, 4)
  }, [enrichedRows])

  const visibleRows = useMemo(() => {
    const normalizedSearch = partnerSearch.trim().toLowerCase()

    return enrichedRows
      .filter((row) => {
        const searchText = [
          row.partner,
          row.relationshipStatus,
          row.partnerProfile.brokerage,
          row.partnerProfile.notes,
          row.recentTouch?.note,
        ].filter(Boolean).join(' ').toLowerCase()

        const matchesSearch = !normalizedSearch || searchText.includes(normalizedSearch)
        const matchesTier = tierFilter === 'all' || row.tier.className === tierFilter
        const matchesCadence = cadenceFilter === 'all' || row.cadence.className === cadenceFilter

        return matchesSearch && matchesTier && matchesCadence
      })
      .sort((a, b) => {
        if (sortMode === 'closed') return b.closed - a.closed || b.referrals - a.referrals
        if (sortMode === 'referrals') return b.referrals - a.referrals || b.score - a.score
        if (sortMode === 'conversion') return b.conversionRate - a.conversionRate || b.referrals - a.referrals
        if (sortMode === 'nextTouch') return a.cadence.urgency - b.cadence.urgency || b.score - a.score
        if (sortMode === 'name') return a.partner.localeCompare(b.partner)

        return b.score - a.score || b.referrals - a.referrals
      })
  }, [cadenceFilter, enrichedRows, partnerSearch, sortMode, tierFilter])

  return (
    <section className="partners-command-page">
      <div className="partners-hero panel">
        <div>
          <span>Referral Partner Desk</span>
          <h2>Referral Partners</h2>
          <p>Relationship status, buyer referrals, and partner momentum.</p>
        </div>

        <div className="partners-hero-stats" aria-label="Referral partner summary">
          <div>
            <span>Partners</span>
            <strong>{partnerSummary.totalPartners}</strong>
          </div>
          <div>
            <span>Referrals</span>
            <strong>{partnerSummary.totalReferrals}</strong>
          </div>
          <div>
            <span>Active Pipeline</span>
            <strong>{partnerSummary.totalPreApproved + partnerSummary.totalUnderContract}</strong>
          </div>
          <div>
            <span>Closed</span>
            <strong>{partnerSummary.totalClosed}</strong>
          </div>
        </div>
      </div>

      <div className="partner-command-grid">
        <div className="panel partner-focus-panel">
          <div className="panel-header">
            <div>
              <h2>Relationship Focus</h2>
              <p>Partners sorted by touch urgency and production value.</p>
            </div>
            <span className="dashboard-pill">{partnerSummary.actionNeeded} need action</span>
          </div>

          <div className="partner-focus-list">
            {focusRows.map((row) => (
              <button type="button" className="partner-focus-row" key={row.partner} onClick={() => onOpenPartner?.(row)}>
                <span className={`partner-cadence-pill ${row.cadence.className}`}>{row.cadence.label}</span>
                <strong>{row.partner}</strong>
                <small>{row.cadence.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel partner-mix-panel">
          <div className="panel-header">
            <div>
              <h2>Book Mix</h2>
              <p>How relationship value is distributed.</p>
            </div>
          </div>

          <div className="partner-mix-grid">
            <div>
              <span>High Value</span>
              <strong>{partnerSummary.highValuePartners}</strong>
            </div>
            <div>
              <span>Active Pipeline</span>
              <strong>{partnerSummary.totalPreApproved + partnerSummary.totalUnderContract}</strong>
            </div>
            <div>
              <span>Closed</span>
              <strong>{partnerSummary.totalClosed}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel partner-directory-panel">
        <div className="panel-header">
          <div>
            <h2>Partner Directory</h2>
            <p>Filter by relationship tier, cadence status, and current production.</p>
          </div>
          <span className="dashboard-pill">{visibleRows.length} shown</span>
        </div>

        <div className="partner-toolbar">
          <label className="partner-search-field">
            <span>Search</span>
            <input
              type="search"
              value={partnerSearch}
              onChange={(event) => setPartnerSearch(event.target.value)}
              placeholder="Search partner, brokerage, or notes"
            />
          </label>

          <label>
            <span>Tier</span>
            <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}>
              <option value="all">All tiers</option>
              <option value="high">High value</option>
              <option value="moderate">Develop</option>
              <option value="low">Watch</option>
            </select>
          </label>

          <label>
            <span>Cadence</span>
            <select value={cadenceFilter} onChange={(event) => setCadenceFilter(event.target.value)}>
              <option value="all">All cadence</option>
              <option value="danger">Overdue</option>
              <option value="warning">Needs plan or due soon</option>
              <option value="good">On track</option>
            </select>
          </label>

          <label>
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
              <option value="score">Efficiency score</option>
              <option value="closed">Closed loans</option>
              <option value="referrals">Buyer referrals</option>
              <option value="conversion">Close rate</option>
              <option value="nextTouch">Next touch</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>

        <div className="partner-list">
          {visibleRows.map((row) => (
          <div className="partner-card" key={row.partner}>
            {(() => {
              const isExpanded = expandedPartner === row.partner

              return (
                <>
                  <div className="partner-topline">
                    <div>
                      <strong>{row.partner}</strong>
                      <p>
                        {row.relationshipStatus || 'Referral Partner'}
                        {row.partnerProfile.brokerage ? ` · ${row.partnerProfile.brokerage}` : ''}
                      </p>
                    </div>
                    <div className="partner-card-statuses">
                      <span className={`partner-cadence-pill ${row.cadence.className}`}>{row.cadence.label}</span>
                      <span className={`tier ${row.tier.className}`}>{row.tier.label}</span>
                    </div>
                  </div>

                  <div className="partner-metrics-grid expanded">
                    <div>
                      <span>Buyer Referrals</span>
                      <strong>{row.referrals}</strong>
                    </div>
                    <div>
                      <span>Pre-Approved</span>
                      <strong>{row.preApproved}</strong>
                    </div>
                    <div>
                      <span>Under Contract</span>
                      <strong>{row.underContract}</strong>
                    </div>
                    <div>
                      <span>Closed</span>
                      <strong>{row.closed}</strong>
                    </div>
                    <div>
                      <span>Close Rate</span>
                      <strong>{row.conversionRate}%</strong>
                    </div>
                  </div>

                  <div className="partner-touch-grid">
                    <div>
                      <span>Last Touch</span>
                      <strong>{shortDate(row.lastTouch)}</strong>
                    </div>
                    <div>
                      <span>Next Touch</span>
                      <strong>{shortDate(row.nextActionDate)}</strong>
                    </div>
                    <div>
                      <span>Cadence Status</span>
                      <strong>{row.cadence.detail}</strong>
                    </div>
                  </div>

                  <div className="score-row">
                    <span>Efficiency Score</span>
                    <strong>{row.score}</strong>
                  </div>
                  <div className="score-bar">
                    <div style={{ width: `${Math.max(8, Math.min(100, row.score * 14 + 30))}%` }} />
                  </div>

                  <div className="partner-actions">
                    <button type="button" className="primary-button small-button" onClick={() => onOpenPartner?.(row)}>
                      Manage Partner
                    </button>
                    <button type="button" className="ghost-button small-button" onClick={() => togglePartner(row.partner)}>
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="partner-profile">
                      <div>
                        <span>Relationship Status</span>
                        <strong>{row.relationshipStatus || 'Referral Partner'}</strong>
                      </div>
                      <div>
                        <span>Relationship Touch</span>
                        <p>Last touch was {shortDate(row.lastTouch)}. Next touch is scheduled for {shortDate(row.nextActionDate)}.</p>
                      </div>
                      <div>
                        <span>Latest Logged Touch</span>
                        <p>
                          {row.recentTouch
                            ? `${shortDate(row.recentTouch.date)} · ${row.recentTouch.type}${row.recentTouch.note ? ` · ${row.recentTouch.note}` : ''}`
                            : 'No dedicated partner touch has been logged yet.'}
                        </p>
                      </div>
                      <div>
                        <span>Partner Momentum</span>
                        <p>{row.referrals} buyer referrals, {row.preApproved} pre-approved, {row.underContract} under contract, and {row.closed} closed.</p>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          ))}
        </div>

        {visibleRows.length === 0 && (
          <div className="empty-state partner-empty-state">
            <strong>No partners match those filters.</strong>
            <p>Clear the search or widen the tier and cadence filters.</p>
          </div>
        )}
      </div>
    </section>
  )
}
