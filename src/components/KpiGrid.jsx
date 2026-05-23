export default function KpiGrid({ metrics }) {
  return (
    <section className="kpi-grid">
      <div className="kpi-card">
        <span>Active Leads</span>
        <strong>{metrics.active}</strong>
        <p>Open opportunities</p>
      </div>
      <div className="kpi-card">
        <span>Pre-Approved</span>
        <strong>{metrics.preApproved}</strong>
        <p>Ready to write offers</p>
      </div>
      <div className="kpi-card">
        <span>Under Contract</span>
        <strong>{metrics.underContract}</strong>
        <p>Moving toward closing</p>
      </div>
      <div className="kpi-card">
        <span>Needs Attention</span>
        <strong>{metrics.needsAttention}</strong>
        <p>Protect these leads</p>
      </div>
    </section>
  )
}
