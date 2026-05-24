function getScoreTier(score) {
  if (score >= 40) return 'High'
  if (score >= 15) return 'Moderate'
  return 'Low'
}

function getPercentOfTotal(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function formatTrendValue(value) {
  if (value > 0) return `+${value}`
  return String(value)
}

function getMaxValue(rows, key) {
  return Math.max(...rows.map((row) => Number(row[key]) || 0), 1)
}

function getDonutBackground(rows) {
  const colors = ['#0b2a4a', '#c9a227', '#2563eb', '#dc2626', '#7c3aed', '#64748b']
  const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
  if (!total) return '#edf2f7'

  let cursor = 0
  const segments = rows.map((row, index) => {
    const count = Number(row.count) || 0
    const start = cursor
    const end = cursor + (count / total) * 100
    cursor = end
    return `${colors[index % colors.length]} ${start}% ${end}%`
  })

  return `conic-gradient(${segments.join(', ')})`
}

function MiniBarChart({ rows, valueKey, labelKey = 'label', formatValue = (value) => value, emptyLabel = 'No data yet' }) {
  const maxValue = getMaxValue(rows, valueKey)

  if (!rows.length) {
    return <p className="chart-empty-state">{emptyLabel}</p>
  }

  return (
    <div className="kpi-bar-chart">
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0
        const width = value ? Math.max((value / maxValue) * 100, 6) : 0

        return (
          <div className="kpi-bar-row" key={row.key || row[labelKey]}>
            <span>{row[labelKey]}</span>
            <div className="kpi-bar-track">
              <div style={{ width: `${width}%` }} />
            </div>
            <strong>{formatValue(value)}</strong>
          </div>
        )
      })}
    </div>
  )
}

function ProductionComboChart({ rows, formatCompactCurrency }) {
  const maxVolume = getMaxValue(rows, 'volume')
  const maxUnits = getMaxValue(rows, 'units')

  return (
    <div className="production-combo-chart">
      {rows.map((row) => (
        <div className="production-combo-row" key={row.key}>
          <span>{row.label}</span>
          <div>
            <div className="volume-track">
              <div style={{ width: `${row.volume ? Math.max((row.volume / maxVolume) * 100, 6) : 0}%` }} />
            </div>
            <div className="unit-track">
              <div style={{ width: `${row.units ? Math.max((row.units / maxUnits) * 100, 8) : 0}%` }} />
            </div>
          </div>
          <strong>{formatCompactCurrency(row.volume || 0)}</strong>
          <em>{row.units || 0} unit{row.units === 1 ? '' : 's'}</em>
        </div>
      ))}
    </div>
  )
}

function TrendLineChart({ rows, valueKey, formatValue = (value) => value }) {
  const chartRows = rows.filter((row) => Number(row[valueKey]) > 0)
  const maxValue = getMaxValue(chartRows, valueKey)
  const points = chartRows.map((row, index) => {
    const x = chartRows.length === 1 ? 50 : (index / (chartRows.length - 1)) * 100
    const y = 100 - ((Number(row[valueKey]) || 0) / maxValue) * 82
    return `${x},${Math.max(y, 10)}`
  }).join(' ')
  const latestRow = chartRows[chartRows.length - 1]

  if (!chartRows.length) {
    return <p className="chart-empty-state">No trend data yet.</p>
  }

  return (
    <div className="trend-chart">
      <svg viewBox="0 0 100 110" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} />
      </svg>
      <div className="trend-chart-footer">
        <span>{chartRows[0]?.label}</span>
        <strong>{latestRow?.label}: {formatValue(latestRow?.[valueKey] || 0)}</strong>
      </div>
    </div>
  )
}

function OutcomeDonut({ rows }) {
  const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)

  return (
    <div className="outcome-donut-layout">
      <div className="outcome-donut" style={{ background: getDonutBackground(rows) }}>
        <div>
          <strong>{total}</strong>
          <span>YTD</span>
        </div>
      </div>
      <div className="outcome-donut-legend">
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.count} · {row.percent}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function KpisPage({ dashboardOverview, metrics, kpiAnalytics, formatCompactCurrency }) {
  const buyerPipeline = dashboardOverview?.buyerPipeline || []
  const partnerMomentum = dashboardOverview?.partnerMomentum || []
  const stageRows = kpiAnalytics?.stageRows || []
  const partnerProductionRows = kpiAnalytics?.partnerProductionRows || []
  const falloutRows = kpiAnalytics?.falloutRows || []
  const ytdOutcomeRows = kpiAnalytics?.ytdOutcomeRows || []
  const monthlyLeadRows = kpiAnalytics?.monthlyLeadRows || []
  const monthlyProductionRows = kpiAnalytics?.monthlyProductionRows || []
  const ytdLeadSourceRows = kpiAnalytics?.ytdLeadSourceRows || []
  const loanTypeRows = kpiAnalytics?.loanTypeRows || []
  const purchaseRefiRows = kpiAnalytics?.purchaseRefiRows || []
  const topPartnerRows = kpiAnalytics?.topPartnerRows || []
  const leadYearRows = kpiAnalytics?.leadYearRows || []
  const recentMonthlyLeadRows = monthlyLeadRows.slice(-12)
  const recentProductionRows = monthlyProductionRows.slice(-12)
  const maxMonthlyLeadTotal = Math.max(...recentMonthlyLeadRows.map((row) => row.total), 1)
  const maxCreditAverage = Math.max(...monthlyLeadRows.map((row) => row.creditScoreAverage || 0), 1)
  const threeMonthPaceChange = (kpiAnalytics?.trailingThreeMonthLeadAverage || 0) - (kpiAnalytics?.previousThreeMonthLeadAverage || 0)
  const topProductionPartner = kpiAnalytics?.topProductionPartner
  const topYtdProductionPartner = kpiAnalytics?.topYtdProductionPartner
  const topEfficiencyPartner = kpiAnalytics?.topEfficiencyPartner
  const topOpportunityPartner = kpiAnalytics?.topOpportunityPartner
  const topRelationshipPartner = kpiAnalytics?.topRelationshipPartner

  const totalFallout = falloutRows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)
  const totalYtdFallout = falloutRows.reduce((sum, row) => sum + (Number(row.ytdCount) || 0), 0)

  const highestFalloutRow = falloutRows.reduce((topRow, row) => {
    if (!topRow) return row
    return (Number(row.count) || 0) > (Number(topRow.count) || 0) ? row : topRow
  }, null)
  const highestStageRow = stageRows.reduce((topRow, row) => {
    if (!topRow) return row
    return (Number(row.count) || 0) > (Number(topRow.count) || 0) ? row : topRow
  }, null)

  return (
    <>
      <section className="kpi-scorecard-strip">
        <div>
          <span>YTD Lead Count</span>
          <strong>{kpiAnalytics?.ytdBuyerLeadCount || 0}</strong>
          <em>{kpiAnalytics?.currentMonthLeadCount || 0} this month</em>
        </div>
        <div>
          <span>YTD Pre-Approvals</span>
          <strong>{kpiAnalytics?.ytdPreApprovalCount || 0}</strong>
          <em>{kpiAnalytics?.ytdLeadToPreApprovalRate || 0}% of YTD leads</em>
        </div>
        <div>
          <span>YTD In-Process</span>
          <strong>{kpiAnalytics?.ytdActivePipelineCount || 0}</strong>
          <em>{formatCompactCurrency(kpiAnalytics?.ytdActivePipelineVolume || 0)} active volume</em>
        </div>
        <div>
          <span>YTD Closed</span>
          <strong>{kpiAnalytics?.ytdClosedLoanCount || 0}</strong>
          <em>{formatCompactCurrency(kpiAnalytics?.ytdClosedVolume || 0)} closed volume</em>
        </div>
        <div>
          <span>YTD Fallout</span>
          <strong>{kpiAnalytics?.ytdFalloutCount || 0}</strong>
          <em>{kpiAnalytics?.ytdFalloutRate || 0}% of YTD leads</em>
        </div>
      </section>

      <section className="executive-summary-strip daily-business-brief kpi-summary-strip">
        <div>
          <span>Business Performance Brief</span>
          <div className="daily-brief-lines">
            <p>
              <strong>Production:</strong> {kpiAnalytics?.ytdClosedLoanCount || 0} YTD closings, {formatCompactCurrency(kpiAnalytics?.ytdClosedVolume || 0)} closed volume, and {formatCompactCurrency(kpiAnalytics?.ytdActivePipelineVolume || 0)} active contract-to-close volume.
            </p>
            <p>
              <strong>Flow:</strong> {kpiAnalytics?.ytdBuyerLeadCount || 0} YTD buyer leads, {kpiAnalytics?.currentMonthLeadCount || 0} this month, {kpiAnalytics?.ytdAverageLeadsPerMonth || 0} average per month, and {metrics.needsAttention} follow-up item{metrics.needsAttention === 1 ? '' : 's'} due.
            </p>
          </div>
        </div>
      </section>

      <section className="kpi-chart-grid">
        <div className="panel domo-card kpi-chart-card wide">
          <div className="panel-header">
            <div>
              <h2>Lead Flow</h2>
              <p>Referral volume by month from the Date Referred field.</p>
            </div>
          </div>
          <MiniBarChart rows={recentMonthlyLeadRows} valueKey="total" />
        </div>

        <div className="panel domo-card kpi-chart-card wide">
          <div className="panel-header">
            <div>
              <h2>Production: Units and Volume</h2>
              <p>Closed units and closed loan volume by production month.</p>
            </div>
          </div>
          <div className="chart-legend-row">
            <span className="volume-key">Volume</span>
            <span className="unit-key">Units</span>
          </div>
          <ProductionComboChart rows={recentProductionRows} formatCompactCurrency={formatCompactCurrency} />
        </div>
      </section>

      <section className="kpi-chart-grid">
        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Loan Type Mix</h2>
              <p>YTD closed loans by product type.</p>
            </div>
          </div>
          <MiniBarChart rows={loanTypeRows} valueKey="count" />
        </div>

        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Purchase vs Refi</h2>
              <p>YTD closed production split.</p>
            </div>
          </div>
          <MiniBarChart rows={purchaseRefiRows} valueKey="count" />
        </div>
      </section>

      <section className="kpi-chart-grid">
        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Conversion Funnel</h2>
              <p>Where buyer opportunities currently sit.</p>
            </div>
          </div>
          <MiniBarChart rows={stageRows} valueKey="count" />
        </div>

        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>YTD Outcome Mix</h2>
              <p>What happened to this year’s buyer leads.</p>
            </div>
          </div>
          <OutcomeDonut rows={ytdOutcomeRows} />
        </div>
      </section>

      <section className="kpi-chart-grid">
        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Lead Sources</h2>
              <p>YTD lead volume by source.</p>
            </div>
          </div>
          <MiniBarChart rows={ytdLeadSourceRows.slice(0, 8)} valueKey="leads" />
        </div>

        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Partner Production</h2>
              <p>Top partners by production and opportunity.</p>
            </div>
          </div>
          <MiniBarChart
            rows={topPartnerRows.map((row) => ({ ...row, label: row.partner, value: row.ytdReferrals }))}
            valueKey="value"
          />
        </div>
      </section>

      <section className="kpi-chart-grid">
        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Credit Score Trend</h2>
              <p>Average score by referred month.</p>
            </div>
          </div>
          <TrendLineChart rows={monthlyLeadRows} valueKey="creditScoreAverage" />
        </div>

        <div className="panel domo-card kpi-chart-card">
          <div className="panel-header">
            <div>
              <h2>Average Loan Amount</h2>
              <p>Lead loan amount trend by referred month.</p>
            </div>
          </div>
          <TrendLineChart rows={monthlyLeadRows} valueKey="averageLoanAmount" formatValue={formatCompactCurrency} />
        </div>
      </section>

      <section className="kpi-ops-grid">
        <div className="panel domo-card kpi-lead-history-card">
          <div className="panel-header">
            <div>
              <h2>Lead Referrals by Month</h2>
              <p>Monthly lead count based only on Date Referred.</p>
            </div>
          </div>

          <div className="monthly-lead-chart">
            <div className="monthly-lead-row monthly-lead-row-header">
              <span>Month</span>
              <span>Relative volume</span>
              <strong>Leads</strong>
            </div>
            {recentMonthlyLeadRows.map((row) => (
              <div className="monthly-lead-row" key={row.key}>
                <span>{row.label}</span>
                <div className="monthly-lead-bar-track">
                  <div style={{ width: `${Math.max((row.total / maxMonthlyLeadTotal) * 100, row.total > 0 ? 8 : 0)}%` }} />
                </div>
                <strong>{row.total}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel domo-card kpi-lead-pace-card">
          <div className="panel-header">
            <div>
              <h2>Lead Pace</h2>
              <p>How current referral volume compares to recent months.</p>
            </div>
          </div>

          <div className="kpi-pace-grid">
            <div className="kpi-pace-stat primary">
              <span>This Month</span>
              <strong>{kpiAnalytics?.currentMonthLeadCount || 0}</strong>
            </div>
            <div className="kpi-pace-stat">
              <span>Last Month</span>
              <strong>{kpiAnalytics?.lastMonthLeadCount || 0}</strong>
            </div>
            <div className="kpi-pace-stat">
              <span>3-Month Avg</span>
              <strong>{kpiAnalytics?.trailingThreeMonthLeadAverage || 0}</strong>
            </div>
            <div className="kpi-pace-stat">
              <span>YTD Avg / Month</span>
              <strong>{kpiAnalytics?.ytdAverageLeadsPerMonth || 0}</strong>
            </div>
            <div className="kpi-pace-stat">
              <span>Vs Prior 3 Months</span>
              <strong>{formatTrendValue(Math.round(threeMonthPaceChange * 10) / 10)}</strong>
            </div>
            {leadYearRows.map((row) => (
              <div className="kpi-pace-stat" key={row.year}>
                <span>{row.year} Leads</span>
                <strong>{row.total}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="domo-kpi-grid">
        <div className="panel domo-card wide">
          <div className="panel-header">
            <div>
              <h2>Credit Score Average by Month</h2>
              <p>Monthly average credit score from January 2025 forward.</p>
            </div>
          </div>

          <div className="credit-trend-list">
            {monthlyLeadRows.map((row) => (
              <div className="credit-trend-row" key={row.key}>
                <span>{row.label}</span>
                <div className="credit-trend-bar-track">
                  <div style={{ width: `${row.creditScoreAverage ? Math.max((row.creditScoreAverage / maxCreditAverage) * 100, 12) : 0}%` }} />
                </div>
                <strong>{row.creditScoreAverage || 'N/A'}</strong>
                <em>{row.creditScoreCount} scored</em>
              </div>
            ))}
          </div>
        </div>

        <div className="panel domo-card">
          <div className="panel-header">
            <div>
              <h2>Credit Quality Read</h2>
              <p>The most recent month with score data.</p>
            </div>
          </div>

          <div className="domo-big-number">{kpiAnalytics?.latestCreditScoreAverage || 'N/A'}</div>
          <p className="domo-card-note">
            Latest scored month: {kpiAnalytics?.latestCreditScoreMonth || 'not available'} with {kpiAnalytics?.latestCreditScoreCount || 0} scored lead{kpiAnalytics?.latestCreditScoreCount === 1 ? '' : 's'}.
          </p>
        </div>
      </section>

      <section className="domo-kpi-grid">
        <div className="panel domo-card wide">
          <div className="panel-header">
            <div>
              <h2>YTD Lead Outcomes</h2>
              <p>Pre-approvals, DNQ, lender or builder losses, and no-longer-interested leads.</p>
            </div>
          </div>

          <div className="outcome-grid">
            {ytdOutcomeRows.map((row) => (
              <div className="outcome-card" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.count}</strong>
                <div className="domo-bar-track">
                  <div style={{ width: `${Math.max(row.percent, row.count > 0 ? 6 : 0)}%` }} />
                </div>
                <em>{row.percent}% of YTD buyer leads</em>
              </div>
            ))}
          </div>
        </div>

        <div className="panel domo-card">
          <div className="panel-header">
            <div>
              <h2>Outcome Ratios</h2>
              <p>A sharper read on what happens after referral.</p>
            </div>
          </div>

          <div className="domo-mini-list">
            <div>
              <span>YTD Lead to Pre-App</span>
              <strong>{kpiAnalytics?.ytdLeadToPreApprovalRate || 0}%</strong>
            </div>
            <div>
              <span>YTD Lead to Close</span>
              <strong>{kpiAnalytics?.ytdLeadToCloseRate || 0}%</strong>
            </div>
            <div>
              <span>YTD DNQ</span>
              <strong>{ytdOutcomeRows.find((row) => row.label === 'DNQ')?.count || 0}</strong>
            </div>
            <div>
              <span>YTD Fallout</span>
              <strong>{kpiAnalytics?.ytdLostToLenderCount || 0}</strong>
            </div>
            <div>
              <span>YTD Not Interested</span>
              <strong>{kpiAnalytics?.ytdNoLongerInterestedCount || 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="domo-kpi-grid">
        <div className="panel domo-card wide">
          <div className="panel-header">
            <div>
              <h2>Business Intelligence Summary</h2>
              <p>The quick read on what is driving the business right now.</p>
            </div>
          </div>

          <div className="domo-mini-list">
            <div>
              <span>Largest Lead Bucket</span>
              <strong>{highestStageRow?.label || 'None yet'} · {highestStageRow?.count || 0}</strong>
            </div>
            <div>
              <span>Primary Fallout Source</span>
              <strong>{highestFalloutRow?.label || 'None yet'} · {highestFalloutRow?.count || 0}</strong>
            </div>
            <div>
              <span>Top Production Partner</span>
              <strong>{topProductionPartner?.partner || 'None yet'} · {topProductionPartner?.closed || 0} closed</strong>
            </div>
            <div>
              <span>Top YTD Production Partner</span>
              <strong>{topYtdProductionPartner?.partner || 'None yet'} · {topYtdProductionPartner?.ytdClosed || 0} YTD closed</strong>
            </div>
            <div>
              <span>Top Efficiency Partner</span>
              <strong>{topEfficiencyPartner?.partner || 'None yet'} · {topEfficiencyPartner?.efficiencyScore || 0} score</strong>
            </div>
            <div>
              <span>Top Opportunity Partner</span>
              <strong>{topOpportunityPartner?.partner || 'None yet'} · {topOpportunityPartner?.activePipeline || 0} active</strong>
            </div>
            <div>
              <span>Top Overall Relationship</span>
              <strong>{topRelationshipPartner?.partner || 'None yet'} · {topRelationshipPartner?.relationshipScore || 0} score</strong>
            </div>
          </div>
        </div>

        <div className="panel domo-card">
          <div className="panel-header">
            <div>
              <h2>Recommended Attention</h2>
              <p>Where to focus first based on today’s numbers.</p>
            </div>
          </div>

          <div className="daily-brief-lines">
            <p>
              <strong>Protect:</strong> Follow up on active pipeline and future closings so projected volume does not leak.
            </p>
            <p>
              <strong>Convert:</strong> Review the largest lead bucket and move qualified buyers to the next clear step.
            </p>
            <p>
              <strong>Coach:</strong> Separate production, efficiency, and opportunity so you know who deserves gratitude, who deserves coaching, and who deserves more attention.
            </p>
          </div>
        </div>
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
            <div className="compact-pipeline-row highlight">
              <span>YTD Buyer Leads</span>
              <strong>{kpiAnalytics?.ytdBuyerLeadCount || 0}</strong>
            </div>
            <div className="compact-pipeline-row highlight">
              <span>YTD Pre-Approvals</span>
              <strong>{kpiAnalytics?.ytdPreApprovalCount || 0}</strong>
            </div>
            <div className="compact-pipeline-row highlight">
              <span>YTD Closed Loans</span>
              <strong>{kpiAnalytics?.ytdClosedLoanCount || 0}</strong>
            </div>
            {buyerPipeline.map((row) => (
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
              <span>Top Production Partner</span>
              <strong>{topProductionPartner?.partner || partnerMomentum[0]?.partner || 'None yet'}</strong>
            </div>
            <div className="compact-pipeline-row">
              <span>Top YTD Partner</span>
              <strong>{topYtdProductionPartner?.partner || 'None yet'}</strong>
            </div>
            <div className="compact-pipeline-row">
              <span>Best Overall Relationship</span>
              <strong>{topRelationshipPartner?.partner || 'None yet'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="domo-kpi-grid">
        <div className="panel domo-card wide">
          <div className="panel-header">
            <div>
              <h2>Lead Conversion Funnel</h2>
              <p>Where buyer opportunities are currently sitting by stage.</p>
            </div>
          </div>

          <div className="domo-funnel-list">
            {stageRows.map((row) => (
              <div className="domo-funnel-row" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.count} total · {row.percent}% overall · {row.ytdCount || 0} YTD · {row.ytdPercent || 0}% YTD</span>
                </div>
                <div className="domo-bar-track">
                  <div style={{ width: `${Math.max(row.percent, row.count > 0 ? 6 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel domo-card">
          <div className="panel-header">
            <div>
              <h2>Pipeline Value</h2>
              <p>Active contract-to-close volume.</p>
            </div>
          </div>
          <div className="domo-big-number">{formatCompactCurrency(kpiAnalytics?.ytdActivePipelineVolume || 0)}</div>
          <p className="domo-card-note">YTD average lead loan amount: {formatCompactCurrency(kpiAnalytics?.ytdAverageLoanAmount || 0)}</p>
        </div>

        <div className="panel domo-card wide">
          <div className="panel-header">
            <div>
              <h2>Partner Production Detail</h2>
              <p>Referral partner production, pipeline, fallout, and efficiency.</p>
            </div>
          </div>

          <div className="domo-table">
            <div className="domo-table-row header">
              <span>Partner</span>
              <span>YTD Refs</span>
              <span>YTD Active</span>
              <span>DNQ</span>
              <span>Lost</span>
              <span>YTD Closed</span>
              <span>YTD Close %</span>
              <span>All Closed</span>
              <span>Closed $</span>
              <span>Eff.</span>
              <span>Tier</span>
            </div>
            {partnerProductionRows.map((row) => (
              <div className="domo-table-row" key={row.partner}>
                <strong>{row.partner}</strong>
                <span>{row.ytdReferrals}</span>
                <span>{row.ytdActivePipeline}</span>
                <span>{row.dnq}</span>
                <span>{row.lostToLenderBuilder}</span>
                <span>{row.ytdClosed}</span>
                <span>{row.ytdCloseRate}%</span>
                <span>{row.closed}</span>
                <span>{formatCompactCurrency(row.closedVolume || 0)}</span>
                <span>{row.efficiencyScore}</span>
                <span>{getScoreTier(Number(row.efficiencyScore) || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel domo-card">
          <div className="panel-header">
            <div>
              <h2>Fallout Detail</h2>
              <p>Where opportunities are leaking.</p>
            </div>
          </div>

          <div className="domo-mini-list">
            {falloutRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <strong>{row.count} total · {getPercentOfTotal(row.count, totalFallout)}% · {row.ytdCount || 0} YTD · {getPercentOfTotal(row.ytdCount || 0, totalYtdFallout)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default KpisPage
