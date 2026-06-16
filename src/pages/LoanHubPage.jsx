import { useMemo, useState } from 'react'
import LoanHubCards from '../components/LoanHubCards'
import LoanHubFAQ from '../components/LoanHubFAQ'
import loanHubHomeImage from '../assets/loan-hub-home.png'
import { money, shortDate } from '../utils/formatting'
import {
  getLoanHubContacts,
  getLoanHubImportantDates,
  getLoanHubProgress,
  loanHubStages,
} from '../utils/loanHub'

function displayValue(value, fallback = 'To be confirmed') {
  return value || fallback
}

function getPropertyAddress(lead) {
  return lead.propertyAddress || lead.subjectPropertyAddress || lead.address || lead.property || ''
}

function getPurchasePrice(lead) {
  return lead.purchasePrice || lead.salesPrice || lead.contractPrice || ''
}

function getDocumentChecklist(lead) {
  const needsList = Array.isArray(lead.needsList) ? lead.needsList : []

  if (needsList.length > 0) {
    return needsList.map((item) => ({
      label: item.text,
      complete: Boolean(item.met),
      owner: item.owner || 'borrower',
    }))
  }

  return [
    { label: 'Photo ID', complete: false },
    { label: 'Most recent pay stubs', complete: false },
    { label: 'Bank statements', complete: false },
    { label: 'Purchase contract or property details', complete: false },
  ]
}

export default function LoanHubPage({ lead, isLoading = false }) {
  const [showVideos, setShowVideos] = useState(false)
  const progress = getLoanHubProgress(lead || {})
  const strategyVideos = Array.isArray(lead?.strategyVideos) ? lead.strategyVideos : []
  const importantDates = useMemo(() => getLoanHubImportantDates(lead || {}), [lead])
  const contacts = useMemo(() => getLoanHubContacts(lead || {}), [lead])
  const checklist = useMemo(() => getDocumentChecklist(lead || {}), [lead])
  const propertyAddress = getPropertyAddress(lead || {})
  const purchasePrice = getPurchasePrice(lead || {})
  const loanProgram = lead?.loanProgram || lead?.loanType || 'To be confirmed'

  if (isLoading) {
    return (
      <main className="loan-hub-public-page">
        <section className="loan-hub-unavailable">
          <strong>Loading Loan Hub</strong>
          <p>We are pulling the latest information for this link.</p>
        </section>
      </main>
    )
  }

  if (!lead) {
    return (
      <main className="loan-hub-public-page">
        <section className="loan-hub-unavailable">
          <strong>Loan Hub not found</strong>
          <p>Please check the link or contact your loan team.</p>
        </section>
      </main>
    )
  }

  if (lead.loanHubEnabled === false) {
    return (
      <main className="loan-hub-public-page">
        <section className="loan-hub-unavailable">
          <strong>This Loan Hub is currently unavailable.</strong>
          <p>Please contact your loan team.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="loan-hub-public-page">
      <section className="loan-hub-hero">
        <div className="loan-hub-hero-copy">
          <span className="loan-hub-welcome">Welcome to Your</span>
          <h1>Loan Hub</h1>
          <p className="loan-hub-hero-subtitle">Everything you need for your home loan journey in one place.</p>
          <span className="loan-hub-title-rule" aria-hidden="true" />
          <div className="loan-hub-hero-meta">
            <strong>{displayValue(lead.client || lead.borrowerName, 'Borrower')}</strong>
            <span>{propertyAddress || 'Property address coming soon'}</span>
          </div>
        </div>
        <div className="loan-hub-hero-photo" aria-label="Home loan visual">
          <img src={loanHubHomeImage} alt="" />
        </div>
      </section>

      <LoanHubCards
        strategyVideos={strategyVideos}
        hfgGoPortalUrl={lead.hfgGoPortalUrl}
        progressTrackerUrl={lead.progressTrackerUrl}
        onShowVideos={() => setShowVideos((current) => !current)}
      />

      {showVideos && (
        <section className="loan-hub-section loan-hub-videos" id="strategy-videos">
          <div className="loan-hub-section-header">
            <span>Strategy Videos</span>
            <h2>Personalized updates</h2>
          </div>
          <div className="loan-hub-video-list">
            {strategyVideos.map((video) => (
              <a href={video.url} target="_blank" rel="noreferrer" className="loan-hub-video-card" key={`${video.title}-${video.url}`}>
                <strong>{video.title || 'Strategy Video'}</strong>
                <p>{video.description || 'Open this video for your latest loan strategy update.'}</p>
                <span>{shortDate(video.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="loan-hub-dashboard-grid">
        <section className="loan-hub-section loan-hub-section-blue" id="loan-progress-overview">
          <div className="loan-hub-section-header">
            <h2>Loan Progress Overview</h2>
          </div>
          <div className="loan-hub-progress">
            {loanHubStages.map((stage, index) => {
              const isComplete = index < progress.index
              const isCurrent = index === progress.index
              const status = isComplete ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'

              return (
                <div className={isComplete ? 'complete' : isCurrent ? 'active' : ''} key={stage}>
                  <span aria-hidden="true">{isComplete ? '✓' : ''}</span>
                  <strong>{stage}</strong>
                  <small>{status}</small>
                </div>
              )
            })}
          </div>
          <a className="loan-hub-outline-link" href={lead.progressTrackerUrl || '#loan-progress-overview'}>
            View Full Progress
          </a>
        </section>

        <section className="loan-hub-section loan-hub-section-green">
          <div className="loan-hub-section-header">
            <h2>Important Dates</h2>
          </div>
          <div className="loan-hub-date-list">
            {importantDates.length > 0 ? importantDates.map((dateItem) => (
              <div key={`${dateItem.label}-${dateItem.date}`}>
                <span className="loan-hub-date-icon" aria-hidden="true">▣</span>
                <div>
                  <strong>{dateItem.label}</strong>
                  <time>{shortDate(dateItem.date)}</time>
                </div>
              </div>
            )) : (
              <p className="loan-hub-empty">Important dates will appear here as they are confirmed.</p>
            )}
          </div>
          <button type="button" className="loan-hub-outline-link green">Add to Calendar</button>
        </section>

        <section className="loan-hub-section loan-hub-section-purple">
          <div className="loan-hub-section-header">
            <h2>Loan Summary Snapshot</h2>
            <span className="loan-hub-section-badge" aria-hidden="true">⌂</span>
          </div>
          <p className="loan-hub-section-intro">This is your most recent estimated loan summary.</p>
          <div className="loan-hub-summary-grid">
            <div><span>Loan Program</span><strong>{loanProgram}</strong></div>
            <div><span>Purchase Price</span><strong>{purchasePrice ? money(purchasePrice) : 'To be confirmed'}</strong></div>
            <div><span>Loan Amount</span><strong>{lead.loanAmount ? money(lead.loanAmount) : 'To be confirmed'}</strong></div>
            <div><span>Interest Rate</span><strong>{lead.interestRate || 'To be confirmed'}</strong></div>
            <div><span>Closing Date</span><strong>{shortDate(lead.closingDate)}</strong></div>
            <div><span>Agent</span><strong>{displayValue(lead.partner, 'Coming soon')}</strong></div>
          </div>
          <a className="loan-hub-outline-link purple" href="#loan-progress-overview">View Full Loan Estimate</a>
        </section>
      </div>

      <div className="loan-hub-dashboard-grid">
        <section className="loan-hub-section loan-hub-section-amber">
          <div className="loan-hub-section-header">
            <h2>Document Checklist</h2>
            <span className="loan-hub-section-badge" aria-hidden="true">▤</span>
          </div>
          <p className="loan-hub-section-intro">Here are the most common docs needed.</p>
          <div className="loan-hub-checklist">
            {checklist.map((item) => (
              <div className={item.complete ? 'complete' : ''} key={`${item.owner}-${item.label}`}>
                <span aria-hidden="true">{item.complete ? '✓' : '□'}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
          <a className="loan-hub-text-link" href={lead.hfgGoPortalUrl || '#'}>View Full Checklist</a>
        </section>

        <section className="loan-hub-section loan-hub-section-blue-soft" id="helpful-contacts">
          <div className="loan-hub-section-header">
            <h2>Helpful Contacts</h2>
            <span className="loan-hub-section-badge" aria-hidden="true">☷</span>
          </div>
          <p className="loan-hub-section-intro">Our team and partners are here for you.</p>
          <div className="loan-hub-contact-grid">
            {contacts.map((contact) => (
              <div className="loan-hub-contact-card" key={`${contact.name}-${contact.role}`}>
                <span className="loan-hub-contact-avatar" aria-hidden="true">{contact.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{contact.name}</strong>
                  <small>{contact.role}</small>
                </div>
                <a href={contact.phone ? `tel:${contact.phone}` : '#'}>{contact.phone || 'Phone coming soon'}</a>
              </div>
            ))}
          </div>
          <a className="loan-hub-text-link" href="#helpful-contacts">View All Contacts</a>
        </section>

        <section className="loan-hub-section loan-hub-section-faq">
          <div className="loan-hub-section-header">
            <h2>Frequently Asked Questions</h2>
            <span className="loan-hub-section-badge" aria-hidden="true">?</span>
          </div>
          <LoanHubFAQ />
          <a className="loan-hub-text-link orange" href="#faq">View All FAQs</a>
        </section>
      </div>

      <div className="loan-hub-two-column final">
        <section className="loan-hub-security">
          <span className="loan-hub-banner-icon" aria-hidden="true">▣</span>
          <div>
          <strong>Keep Your Information Secure</strong>
          <p>Please do not email or text sensitive documents. Use HFG GO to upload and sign securely.</p>
          </div>
        </section>
        <section className="loan-hub-next-step">
          <span className="loan-hub-banner-icon" aria-hidden="true">→</span>
          <div>
            <strong>Next Best Step</strong>
            <p>{lead.nextBestStep || lead.nextAction || 'Watch for your next update from the loan team.'}</p>
            {lead.hfgGoPortalUrl && <a href={lead.hfgGoPortalUrl}>Go to HFG GO Portal</a>}
          </div>
        </section>
      </div>

      <section className="loan-hub-reminder">
        <span className="loan-hub-banner-icon" aria-hidden="true">⌁</span>
        <div>
          <strong>Friendly Reminder</strong>
          <p>Check your email and HFG GO regularly for updates and requests from the team.</p>
        </div>
      </section>
    </main>
  )
}
