

export default function Hero({ needsAttention }) {
  return (
    <section className="hero-card">
      <div>
        <p className="eyebrow">Mortgage Relationship OS</p>
        <h1>Your referral pipeline, cleaned up and under control.</h1>
        <div className="gold-line" />
        <p className="hero-copy">
          Track every lead, protect every follow-up, and see which referral partners are creating real momentum.
        </p>
      </div>
      <div className="focus-card">
        <p className="focus-label">Today’s Focus</p>
        <h2>{needsAttention} leads need attention</h2>
        <p>No connection, stale touchpoints, or next actions due.</p>
      </div>
    </section>
  )
}