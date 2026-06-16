export default function LoanHubCards({
  strategyVideos = [],
  hfgGoPortalUrl = '',
  progressTrackerUrl = '',
  onShowVideos,
}) {
  const icons = {
    play: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="8" y="10" width="32" height="23" rx="3" />
        <path d="M21 17.5v8.8l7.5-4.4-7.5-4.4Z" />
        <path d="M18 39h12" />
        <path d="M24 33v6" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M14 8h15l7 7v25H14V8Z" />
        <path d="M29 8v8h7" />
        <path d="M21 25h8" />
        <path d="M21 31h6" />
        <path d="M35 32v-9" />
        <path d="M31 27l4-4 4 4" />
      </svg>
    ),
    steps: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="9" y="27" width="7" height="12" rx="1.5" />
        <rect x="21" y="19" width="7" height="20" rx="1.5" />
        <rect x="33" y="9" width="7" height="30" rx="1.5" />
      </svg>
    ),
    contact: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="16" r="7" />
        <path d="M11 39c1.8-8 7-12 13-12s11.2 4 13 12" />
        <path d="M35 19c3.2.7 5.5 3.4 5.5 6.8" />
        <path d="M37 34c2.5-1.7 4-4.5 4-8" />
      </svg>
    ),
  }
  const videoCount = strategyVideos.length
  const cards = [
    {
      title: 'Strategy Videos',
      icon: 'play',
      tone: 'blue',
      explanation: 'Watch personalized videos explaining your loan strategy, options, and next steps.',
      button: 'View Videos',
      status: videoCount > 0 ? `${videoCount} video${videoCount === 1 ? '' : 's'} available` : 'No videos available yet',
      disabled: videoCount === 0,
      onClick: onShowVideos,
    },
    {
      title: 'HFG GO Portal',
      icon: 'lock',
      tone: 'green',
      explanation: 'Sign disclosures, upload documents, and check requests securely.',
      button: hfgGoPortalUrl ? 'Go to HFG GO' : 'Coming Soon',
      status: hfgGoPortalUrl ? 'Secure portal' : 'Portal link coming soon.',
      disabled: !hfgGoPortalUrl,
      href: hfgGoPortalUrl,
    },
    {
      title: 'Track Your Progress',
      icon: 'steps',
      tone: 'purple',
      explanation: 'See real-time updates and check the status of your loan process.',
      button: progressTrackerUrl ? 'View Progress' : 'View Progress',
      status: progressTrackerUrl ? 'Updated today' : 'Using current CRM status',
      href: progressTrackerUrl || '#loan-progress-overview',
    },
    {
      title: 'Contact Your Loan Team',
      icon: 'contact',
      tone: 'amber',
      explanation: 'Call, text, email or schedule time with us. We are here to help.',
      button: 'View Contact Card',
      status: "We're here to help",
      href: '#helpful-contacts',
    },
  ]

  return (
    <div className="loan-hub-action-grid">
      {cards.map((card) => {
        const content = (
          <>
            <span className={`loan-hub-card-icon icon-${card.icon}`} aria-hidden="true">
              {icons[card.icon]}
            </span>
            <strong>{card.title}</strong>
            <p>{card.explanation}</p>
            <span className="loan-hub-card-button">{card.button}</span>
            <small>{card.status}</small>
          </>
        )

        if (card.href && !card.disabled) {
          return (
            <a className={`loan-hub-action-card tone-${card.tone}`} href={card.href} key={card.title} target={card.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              {content}
            </a>
          )
        }

        return (
          <button type="button" className={`loan-hub-action-card tone-${card.tone}`} key={card.title} disabled={card.disabled} onClick={card.onClick}>
            {content}
          </button>
        )
      })}
    </div>
  )
}
