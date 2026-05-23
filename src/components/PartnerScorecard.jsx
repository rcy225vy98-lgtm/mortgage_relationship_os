import { useState } from 'react'
import { shortDate } from '../utils/formatting'

export default function PartnerScorecard({ partnerRows, onOpenPartner }) {
  const [expandedPartner, setExpandedPartner] = useState(null)

  function togglePartner(partner) {
    setExpandedPartner((current) => (current === partner ? null : partner))
  }

  return (
    <div className="panel">
      <h2>Referral Partners</h2>
      <p className="panel-subtitle">Relationship status, buyer referrals, and partner momentum.</p>

      <div className="partner-list">
        {partnerRows.map((row) => (
          <div className="partner-card" key={row.partner}>
            {(() => {
              const isExpanded = expandedPartner === row.partner

              return (
                <>
                  <div className="partner-topline">
                    <div>
                      <strong>{row.partner}</strong>
                      <p>{row.relationshipStatus || 'Referral Partner'}</p>
                    </div>
                    <span className={row.score >= 4 ? 'tier high' : row.score >= 0 ? 'tier moderate' : 'tier low'}>
                      {row.score >= 4 ? 'High Value' : row.score >= 0 ? 'Develop' : 'Watch'}
                    </span>
                  </div>

                  <div className="partner-metrics-grid">
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
                        <span>Partner Momentum</span>
                        <p>{row.referrals} buyer referrals, {row.preApproved} pre-approved, and {row.underContract} under contract.</p>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}