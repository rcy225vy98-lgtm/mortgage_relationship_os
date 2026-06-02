import { useMemo } from 'react'

const ACTIVE_PIPELINE_STAGES = ['Pre-Approved', 'Pre-Qualified', 'Refi', 'Under Contract', 'Conditional Approval', 'Clear to Close']
const CONTRACT_TO_CLOSE_STAGES = ['Refi', 'Under Contract', 'Conditional Approval', 'Clear to Close']
const FALLOUT_STAGES = ['DNQ', 'Other Lender', 'Builder Lender']
const LOST_TO_LENDER_STAGES = ['Other Lender', 'Builder Lender']
const EARLY_STAGE_STAGES = ['New Referral', 'Contact Attempted']
const APPLICATION_STAGE_STAGES = ['Application Started', 'Connected, Needs Application', 'Waiting on Docs', 'Documentation']
const IN_PROCESS_STAGES = [...APPLICATION_STAGE_STAGES, ...CONTRACT_TO_CLOSE_STAGES]
const CREDIT_HISTORY_START = new Date(2024, 0, 1)
const ANALYSIS_YEARS = [2024, 2025, 2026]

function isPreApprovedPopulationLead(lead) {
  return lead.stage === 'Pre-Approved'
    || lead.stage === 'Under Contract'
    || lead.stage === 'Closed'
}

function getLoanAmount(lead) {
  return Number(lead.loanAmount) || 0
}

function getIncomeAmount(lead) {
  return Number(lead.income)
    || Number(lead.commission)
    || Number(lead.totalIncome)
    || Number(lead.grossCommission)
    || Number(lead.bpsPayOut)
    || 0
}

function getReferralTimestamp(lead) {
  const dateValue = getLeadReferredDateValue(lead)
  const timestamp = dateValue ? getLocalDate(dateValue)?.getTime() : 0
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getLeadReferredDateValue(lead) {
  return lead.dateReferred
    || lead.referralDate
    || lead.originalDateReferred
    || lead.importedDateReferred
    || lead.rawDateReferred
    || lead.date_referred
    || lead.original_date_referred
    || lead.imported_date_referred
    || lead['Date Referred']
    || lead['date referred']
    || lead['Date referred']
    || lead['DATE REFERRED']
    || lead.referral_date
    || ''
}

function getLocalDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value)
    return new Date(excelEpoch.getUTCFullYear(), excelEpoch.getUTCMonth(), excelEpoch.getUTCDate())
  }

  const cleaned = String(value || '').trim()
  if (!cleaned) return null

  if (/^\d{5}$/.test(cleaned)) {
    return getLocalDate(Number(cleaned))
  }

  const isoDate = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) {
    return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
  }

  const slashDate = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashDate) {
    const yearValue = Number(slashDate[3])
    const year = yearValue < 100 ? yearValue + 2000 : yearValue
    return new Date(year, Number(slashDate[1]) - 1, Number(slashDate[2]))
  }

  const namedDate = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  if (namedDate) {
    const parsed = new Date(`${namedDate[1]} ${namedDate[2]}, ${namedDate[3]}`)
    return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  return null
}

function getReferralDate(lead) {
  const timestamp = getReferralTimestamp(lead)
  if (!timestamp) return null
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date
}

function getProductionDate(lead) {
  const dateValue = lead.closingDate
    || lead.closedDate
    || lead.fundedDate
    || lead.disbursementDate
    || lead.settlementDate

  return getLocalDate(dateValue)
}

function getUnderContractDate(lead) {
  return getLocalDate(lead.underContractDate || lead.contractDate || lead.processStartDate)
}

function getDaysBetweenDates(startDate, endDate) {
  if (!startDate || !endDate) return null
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000)
}

function isProductionLeadInYear(lead, year) {
  const productionDate = getProductionDate(lead)
  if (!productionDate) return false
  return productionDate.getFullYear() === year
}

function isLeadInYear(lead, year) {
  const timestamp = getReferralTimestamp(lead)
  if (!timestamp) return false
  return new Date(timestamp).getFullYear() === year
}

function getDaysSinceReferral(lead) {
  const timestamp = getReferralTimestamp(lead)
  if (!timestamp) return null
  return Math.floor((Date.now() - timestamp) / 86400000)
}

function getAverageDays(leads) {
  const validDays = leads
    .map((lead) => getDaysSinceReferral(lead))
    .filter((days) => typeof days === 'number' && days >= 0)

  if (!validDays.length) return null
  return Math.round(validDays.reduce((sum, days) => sum + days, 0) / validDays.length)
}

function getPartnerLeadCountByStage(leads, stages) {
  return leads.filter((lead) => stages.includes(lead.stage)).length
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getMonthRange(startDate, endDate) {
  const months = []
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const finalMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (cursor <= finalMonth) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

function getCreditScore(lead) {
  const score = Number(String(lead.creditScore || '').replace(/[^\d]/g, ''))
  return score >= 300 && score <= 850 ? score : null
}

function getLeadSourceLabel(lead) {
  return lead.leadSource || lead.source || lead.referralSource || 'Referral Partner'
}

function normalizeLoanType(lead) {
  const loanText = `${lead.loanType || ''} ${lead.secondLienType || ''}`.toLowerCase()

  if (loanText.includes('non') && loanText.includes('qm')) return 'NonQM'
  if (loanText.includes('usda')) return 'USDA'
  if (loanText.includes('fha')) return 'FHA'
  if (loanText.includes('va')) return 'VA'
  if (loanText.includes('dpa') || loanText.includes('down payment') || loanText.includes('second')) return 'DPA'
  if (loanText.includes('conv')) return 'Conventional'

  return 'Unspecified'
}

function normalizeLoanPurpose(lead) {
  const purposeText = `${lead.loanPurpose || ''} ${lead.transactionType || ''} ${lead.loanType || ''} ${lead.stage || ''}`.toLowerCase()

  if (purposeText.includes('refi') || purposeText.includes('refinance')) return 'Refi'
  return 'Purchase'
}

function getAverageReferralToUnderContractDays(leads) {
  const days = leads
    .map((lead) => getDaysBetweenDates(getReferralDate(lead), getUnderContractDate(lead)))
    .filter((dayCount) => typeof dayCount === 'number' && dayCount >= 0)

  if (!days.length) return null
  return Math.round(days.reduce((sum, dayCount) => sum + dayCount, 0) / days.length)
}

function useKpiAnalytics(activeLeads, partnerRows, getPartnerDisplayName, analysisYear = new Date().getFullYear()) {
  return useMemo(() => {
    const now = new Date()
    const buyerLeads = activeLeads.filter((lead) => lead.leadType !== 'Agent Prospect')
    const ytdBuyerLeads = buyerLeads.filter((lead) => isLeadInYear(lead, analysisYear))
    const totalLoanAmount = buyerLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
    const ytdLoanAmount = ytdBuyerLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
    const fundedLeads = buyerLeads.filter((lead) => lead.stage === 'Closed')
    const ytdFundedLeads = fundedLeads.filter((lead) => isProductionLeadInYear(lead, analysisYear))
    const ytdFundedFromYtdLeads = ytdBuyerLeads.filter((lead) => lead.stage === 'Closed')
    const contractToCloseLeads = buyerLeads.filter((lead) => CONTRACT_TO_CLOSE_STAGES.includes(lead.stage))
    const ytdContractToCloseLeads = ytdBuyerLeads.filter((lead) => CONTRACT_TO_CLOSE_STAGES.includes(lead.stage))
    const inProcessLeads = buyerLeads.filter((lead) => IN_PROCESS_STAGES.includes(lead.stage))
    const ytdInProcessLeads = ytdBuyerLeads.filter((lead) => IN_PROCESS_STAGES.includes(lead.stage))
    const falloutLeads = buyerLeads.filter((lead) => FALLOUT_STAGES.includes(lead.stage))
    const ytdFalloutLeads = ytdBuyerLeads.filter((lead) => FALLOUT_STAGES.includes(lead.stage))
    const lostToLenderLeads = buyerLeads.filter((lead) => LOST_TO_LENDER_STAGES.includes(lead.stage))
    const ytdLostToLenderLeads = ytdBuyerLeads.filter((lead) => LOST_TO_LENDER_STAGES.includes(lead.stage))
    const noLongerInterestedLeads = buyerLeads.filter((lead) => lead.stage === 'Not Interested')
    const ytdNoLongerInterestedLeads = ytdBuyerLeads.filter((lead) => lead.stage === 'Not Interested')
    const preApprovalLeads = buyerLeads.filter(isPreApprovedPopulationLead)
    const ytdPreApprovalLeads = ytdBuyerLeads.filter(isPreApprovedPopulationLead)
    const monthlyLeadRows = getMonthRange(CREDIT_HISTORY_START, now).map((monthDate) => {
      const monthKey = getMonthKey(monthDate)
      const monthLeads = buyerLeads.filter((lead) => {
        const referralDate = getReferralDate(lead)
        return referralDate && getMonthKey(referralDate) === monthKey
      })
      const monthYear = monthDate.getFullYear()
      const monthNumber = monthDate.getMonth()
      const ytdLeadsThroughMonth = buyerLeads.filter((lead) => {
        const referralDate = getReferralDate(lead)
        return referralDate
          && referralDate.getFullYear() === monthYear
          && referralDate.getMonth() <= monthNumber
      })
      const creditScores = monthLeads.map(getCreditScore).filter((score) => score !== null)
      const preApprovedInMonth = monthLeads.filter(isPreApprovedPopulationLead)
      const closedInMonth = monthLeads.filter((lead) => lead.stage === 'Closed')
      const dnqInMonth = monthLeads.filter((lead) => lead.stage === 'DNQ')
      const lostInMonth = monthLeads.filter((lead) => LOST_TO_LENDER_STAGES.includes(lead.stage))
      const notInterestedInMonth = monthLeads.filter((lead) => lead.stage === 'Not Interested')
      const monthLoanAmount = monthLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
      const closedByProductionDateInMonth = fundedLeads.filter((lead) => {
        const productionDate = getProductionDate(lead)
        return productionDate && getMonthKey(productionDate) === monthKey
      })
      const closedVolumeInMonth = closedByProductionDateInMonth.reduce((sum, lead) => sum + getLoanAmount(lead), 0)

      return {
        key: monthKey,
        label: getMonthLabel(monthDate),
        year: monthYear,
        total: monthLeads.length,
        ytdTotal: ytdLeadsThroughMonth.length,
        creditScoreAverage: creditScores.length ? Math.round(creditScores.reduce((sum, score) => sum + score, 0) / creditScores.length) : null,
        creditScoreCount: creditScores.length,
        preApproved: preApprovedInMonth.length,
        closed: closedInMonth.length,
        dnq: dnqInMonth.length,
        fallout: lostInMonth.length,
        noLongerInterested: notInterestedInMonth.length,
        averageLoanAmount: monthLeads.length ? Math.round(monthLoanAmount / monthLeads.length) : 0,
        closedUnits: closedByProductionDateInMonth.length,
        closedVolume: closedVolumeInMonth,
      }
    })
    const monthlyProductionRows = monthlyLeadRows.map((row) => ({
      key: row.key,
      label: row.label,
      year: row.year,
      units: row.closedUnits,
      volume: row.closedVolume,
      averageLoanAmount: row.averageLoanAmount,
    }))
    const leadYearRows = [...new Set(monthlyLeadRows.map((row) => row.year))]
      .map((year) => ({
        year,
        total: monthlyLeadRows.filter((row) => row.year === year).reduce((sum, row) => sum + row.total, 0),
      }))
      .filter((row) => row.total > 0 || row.year === now.getFullYear())

    const trailingThreeMonthRows = monthlyLeadRows.slice(-3)
    const previousThreeMonthRows = monthlyLeadRows.slice(-6, -3)
    const trailingThreeMonthLeadAverage = trailingThreeMonthRows.length
      ? Math.round((trailingThreeMonthRows.reduce((sum, row) => sum + row.total, 0) / trailingThreeMonthRows.length) * 10) / 10
      : 0
    const previousThreeMonthLeadAverage = previousThreeMonthRows.length
      ? Math.round((previousThreeMonthRows.reduce((sum, row) => sum + row.total, 0) / previousThreeMonthRows.length) * 10) / 10
      : 0
    const currentMonthLeadCount = monthlyLeadRows[monthlyLeadRows.length - 1]?.total || 0
    const lastMonthLeadCount = monthlyLeadRows[monthlyLeadRows.length - 2]?.total || 0
    const latestCreditAverageRow = [...monthlyLeadRows].reverse().find((row) => row.creditScoreAverage !== null)
    const monthsElapsedThisYear = now.getMonth() + 1
    const ytdAverageLeadsPerMonth = monthsElapsedThisYear ? Math.round((ytdBuyerLeads.length / monthsElapsedThisYear) * 10) / 10 : 0

    const stageRows = [
      { label: 'New / Attempted Contact', count: getPartnerLeadCountByStage(buyerLeads, EARLY_STAGE_STAGES), ytdCount: getPartnerLeadCountByStage(ytdBuyerLeads, EARLY_STAGE_STAGES) },
      { label: 'Application / Docs', count: getPartnerLeadCountByStage(buyerLeads, APPLICATION_STAGE_STAGES), ytdCount: getPartnerLeadCountByStage(ytdBuyerLeads, APPLICATION_STAGE_STAGES) },
      { label: 'Pre-Approved / Pre-Qualified', count: preApprovalLeads.length, ytdCount: ytdPreApprovalLeads.length },
      { label: 'Contract to Close', count: contractToCloseLeads.length, ytdCount: ytdContractToCloseLeads.length },
      { label: 'Closed', count: fundedLeads.length, ytdCount: ytdFundedFromYtdLeads.length },
      { label: 'Fallout / Lost', count: falloutLeads.length, ytdCount: ytdFalloutLeads.length },
    ].map((row) => ({
      ...row,
      percent: buyerLeads.length ? Math.round((row.count / buyerLeads.length) * 100) : 0,
      ytdPercent: ytdBuyerLeads.length ? Math.round((row.ytdCount / ytdBuyerLeads.length) * 100) : 0,
    }))

    const partnerProductionRows = partnerRows.map((partner) => {
      const partnerLeads = buyerLeads.filter((lead) => getPartnerDisplayName(lead) === partner.partner)
      const ytdPartnerLeads = partnerLeads.filter((lead) => isLeadInYear(lead, analysisYear))
      const closed = partnerLeads.filter((lead) => lead.stage === 'Closed')
      const ytdClosed = closed.filter((lead) => isProductionLeadInYear(lead, analysisYear))
      const ytdReferralClosed = ytdPartnerLeads.filter((lead) => lead.stage === 'Closed')
      const preApproved = partnerLeads.filter(isPreApprovedPopulationLead)
      const ytdPreApproved = ytdPartnerLeads.filter(isPreApprovedPopulationLead)
      const activePipeline = partnerLeads.filter((lead) => ACTIVE_PIPELINE_STAGES.includes(lead.stage))
      const ytdActivePipeline = ytdPartnerLeads.filter((lead) => ACTIVE_PIPELINE_STAGES.includes(lead.stage))
      const fallout = partnerLeads.filter((lead) => FALLOUT_STAGES.includes(lead.stage))
      const ytdFallout = ytdPartnerLeads.filter((lead) => FALLOUT_STAGES.includes(lead.stage))
      const dnq = partnerLeads.filter((lead) => lead.stage === 'DNQ')
      const ytdDnq = ytdPartnerLeads.filter((lead) => lead.stage === 'DNQ')
      const otherLender = partnerLeads.filter((lead) => lead.stage === 'Other Lender')
      const builderLender = partnerLeads.filter((lead) => lead.stage === 'Builder Lender')
      const lostToLenderBuilder = [...otherLender, ...builderLender]
      const ytdLostToLenderBuilder = ytdPartnerLeads.filter((lead) => LOST_TO_LENDER_STAGES.includes(lead.stage))
      const cold = partnerLeads.filter((lead) => EARLY_STAGE_STAGES.includes(lead.stage))
      const ytdCold = ytdPartnerLeads.filter((lead) => EARLY_STAGE_STAGES.includes(lead.stage))
      const projectedVolume = activePipeline.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
      const ytdProjectedVolume = ytdActivePipeline.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
      const closedVolume = closed.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
      const ytdClosedVolume = ytdClosed.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
      const referralCount = Number(partner.referrals) || partnerLeads.length || 0
      const ytdReferralCount = ytdPartnerLeads.length
      const closeRate = referralCount ? Math.round((closed.length / referralCount) * 100) : 0
      const ytdCloseRate = ytdReferralCount ? Math.round((ytdReferralClosed.length / ytdReferralCount) * 100) : 0
      const falloutRate = referralCount ? Math.round((fallout.length / referralCount) * 100) : 0
      const efficiencyScore = (closed.length * 5) + preApproved.length - dnq.length - (cold.length * 2) - (lostToLenderBuilder.length * 3)
      const ytdEfficiencyScore = (ytdClosed.length * 5) + ytdPreApproved.length - ytdDnq.length - (ytdCold.length * 2) - (ytdLostToLenderBuilder.length * 3)
      const productionScore = (closed.length * 1000000) + closedVolume
      const opportunityScore = (activePipeline.length * 5) + (preApproved.length * 3) + (ytdReferralCount * 2)
      const relationshipScore = productionScore + (opportunityScore * 10000) + (ytdEfficiencyScore * 1000) - (fallout.length * 25000)
      const averageDaysSinceReferral = getAverageDays(partnerLeads)

      return {
        partner: partner.partner,
        referrals: referralCount,
        ytdReferrals: ytdReferralCount,
        activePipeline: activePipeline.length,
        ytdActivePipeline: ytdActivePipeline.length,
        preApproved: preApproved.length,
        ytdPreApproved: ytdPreApproved.length,
        closed: closed.length,
        ytdClosed: ytdClosed.length,
        fallout: fallout.length,
        ytdFallout: ytdFallout.length,
        dnq: dnq.length,
        ytdDnq: ytdDnq.length,
        cold: cold.length,
        ytdCold: ytdCold.length,
        lostToLenderBuilder: lostToLenderBuilder.length,
        ytdLostToLenderBuilder: ytdLostToLenderBuilder.length,
        projectedVolume,
        ytdProjectedVolume,
        closedVolume,
        ytdClosedVolume,
        closeRate,
        ytdCloseRate,
        falloutRate,
        averageDaysSinceReferral,
        efficiencyScore,
        ytdEfficiencyScore,
        productionScore,
        opportunityScore,
        relationshipScore,
      }
    }).filter((row) => row.referrals > 0 || row.activePipeline > 0 || row.closed > 0 || row.fallout > 0)
      .sort((a, b) => {
        const closedDiff = b.closed - a.closed
        if (closedDiff !== 0) return closedDiff

        const closedVolumeDiff = b.closedVolume - a.closedVolume
        if (closedVolumeDiff !== 0) return closedVolumeDiff

        return b.opportunityScore - a.opportunityScore
      })

    const falloutRows = [
      { label: 'DNQ', count: buyerLeads.filter((lead) => lead.stage === 'DNQ').length, ytdCount: ytdBuyerLeads.filter((lead) => lead.stage === 'DNQ').length },
      { label: 'Other Lender', count: buyerLeads.filter((lead) => lead.stage === 'Other Lender').length, ytdCount: ytdBuyerLeads.filter((lead) => lead.stage === 'Other Lender').length },
      { label: 'Builder Lender', count: buyerLeads.filter((lead) => lead.stage === 'Builder Lender').length, ytdCount: ytdBuyerLeads.filter((lead) => lead.stage === 'Builder Lender').length },
      { label: 'No Longer Interested', count: noLongerInterestedLeads.length, ytdCount: ytdNoLongerInterestedLeads.length },
    ]

    const ytdOutcomeRows = [
      { label: 'Pre-Approved / Pre-Qualified', count: ytdPreApprovalLeads.length, percent: ytdBuyerLeads.length ? Math.round((ytdPreApprovalLeads.length / ytdBuyerLeads.length) * 100) : 0 },
      { label: 'Closed', count: ytdFundedFromYtdLeads.length, percent: ytdBuyerLeads.length ? Math.round((ytdFundedFromYtdLeads.length / ytdBuyerLeads.length) * 100) : 0 },
      { label: 'DNQ', count: ytdBuyerLeads.filter((lead) => lead.stage === 'DNQ').length, percent: ytdBuyerLeads.length ? Math.round((ytdBuyerLeads.filter((lead) => lead.stage === 'DNQ').length / ytdBuyerLeads.length) * 100) : 0 },
      { label: 'Lost to Lender / Builder', count: ytdLostToLenderLeads.length, percent: ytdBuyerLeads.length ? Math.round((ytdLostToLenderLeads.length / ytdBuyerLeads.length) * 100) : 0 },
      { label: 'No Longer Interested', count: ytdNoLongerInterestedLeads.length, percent: ytdBuyerLeads.length ? Math.round((ytdNoLongerInterestedLeads.length / ytdBuyerLeads.length) * 100) : 0 },
    ]

    const ytdLeadSourceRows = Object.values(ytdBuyerLeads.reduce((rows, lead) => {
      const source = getLeadSourceLabel(lead)
      rows[source] = rows[source] || {
        label: source,
        leads: 0,
        preApproved: 0,
        closed: 0,
        fallout: 0,
        volume: 0,
      }

      rows[source].leads += 1
      if (isPreApprovedPopulationLead(lead)) rows[source].preApproved += 1
      if (lead.stage === 'Closed') rows[source].closed += 1
      if (FALLOUT_STAGES.includes(lead.stage) || lead.stage === 'Not Interested') rows[source].fallout += 1
      rows[source].volume += getLoanAmount(lead)

      return rows
    }, {})).map((row) => ({
      ...row,
      preApprovalRate: row.leads ? Math.round((row.preApproved / row.leads) * 100) : 0,
      closeRate: row.leads ? Math.round((row.closed / row.leads) * 100) : 0,
      falloutRate: row.leads ? Math.round((row.fallout / row.leads) * 100) : 0,
    })).sort((a, b) => b.leads - a.leads)

    const topProductionPartner = [...partnerProductionRows].sort((a, b) => {
      const closedDiff = b.closed - a.closed
      if (closedDiff !== 0) return closedDiff
      return b.closedVolume - a.closedVolume
    })[0]

    const topYtdProductionPartner = [...partnerProductionRows].sort((a, b) => {
      const closedDiff = b.ytdClosed - a.ytdClosed
      if (closedDiff !== 0) return closedDiff
      return b.ytdClosedVolume - a.ytdClosedVolume
    })[0]

    const topEfficiencyPartner = [...partnerProductionRows].sort((a, b) => b.ytdEfficiencyScore - a.ytdEfficiencyScore)[0]
    const topOpportunityPartner = [...partnerProductionRows].sort((a, b) => b.opportunityScore - a.opportunityScore)[0]
    const topRelationshipPartner = [...partnerProductionRows].sort((a, b) => b.relationshipScore - a.relationshipScore)[0]

    const loanTypeRows = ['Conventional', 'FHA', 'VA', 'USDA', 'DPA', 'NonQM', 'Unspecified']
      .map((label) => ({
        label,
        count: ytdFundedLeads.filter((lead) => normalizeLoanType(lead) === label).length,
      }))
      .filter((row) => row.count > 0 || row.label !== 'Unspecified')

    const purchaseRefiRows = ['Purchase', 'Refi']
      .map((label) => ({
        label,
        count: ytdFundedLeads.filter((lead) => normalizeLoanPurpose(lead) === label).length,
      }))

    const annualPerformanceRows = ANALYSIS_YEARS.map((year) => {
      const yearLeads = buyerLeads.filter((lead) => isLeadInYear(lead, year))
      const yearFunded = fundedLeads.filter((lead) => isProductionLeadInYear(lead, year))
      const income = yearFunded.reduce((sum, lead) => sum + getIncomeAmount(lead), 0)
      const volume = yearFunded.reduce((sum, lead) => sum + getLoanAmount(lead), 0)
      const preApproved = yearLeads.filter(isPreApprovedPopulationLead)
      const underContract = yearLeads.filter((lead) => CONTRACT_TO_CLOSE_STAGES.includes(lead.stage))
      const fallout = yearLeads.filter((lead) => FALLOUT_STAGES.includes(lead.stage) || lead.stage === 'Not Interested')

      return {
        year,
        leads: yearLeads.length,
        preApproved: preApproved.length,
        underContract: underContract.length,
        units: yearFunded.length,
        volume,
        income,
        conversionRate: yearLeads.length ? Math.round((yearFunded.length / yearLeads.length) * 100) : 0,
        preApprovalRate: yearLeads.length ? Math.round((preApproved.length / yearLeads.length) * 100) : 0,
        falloutRate: yearLeads.length ? Math.round((fallout.length / yearLeads.length) * 100) : 0,
        averageReferralToUnderContractDays: getAverageReferralToUnderContractDays(yearLeads),
      }
    })

    const monthlyReferralHeatmapRows = ANALYSIS_YEARS.map((year) => {
      const months = Array.from({ length: 12 }, (_, monthIndex) => {
        const count = buyerLeads.filter((lead) => {
          const referralDate = getReferralDate(lead)
          return referralDate && referralDate.getFullYear() === year && referralDate.getMonth() === monthIndex
        }).length

        return {
          monthIndex,
          label: new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'short' }),
          count,
        }
      })
      const total = months.reduce((sum, month) => sum + month.count, 0)

      return {
        year,
        months,
        total,
        average: Math.round((total / 12) * 10) / 10,
      }
    })

    return {
      analysisYear,
      buyerLeadCount: buyerLeads.length,
      ytdBuyerLeadCount: ytdBuyerLeads.length,
      averageLoanAmount: buyerLeads.length ? totalLoanAmount / buyerLeads.length : 0,
      ytdAverageLoanAmount: ytdBuyerLeads.length ? ytdLoanAmount / ytdBuyerLeads.length : 0,
      activePipelineVolume: inProcessLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0),
      ytdActivePipelineCount: ytdInProcessLeads.length,
      ytdActivePipelineVolume: ytdInProcessLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0),
      closedLoanCount: fundedLeads.length,
      ytdClosedLoanCount: ytdFundedLeads.length,
      closedVolume: fundedLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0),
      ytdClosedVolume: ytdFundedLeads.reduce((sum, lead) => sum + getLoanAmount(lead), 0),
      preApprovalCount: preApprovalLeads.length,
      ytdPreApprovalCount: ytdPreApprovalLeads.length,
      falloutCount: falloutLeads.length,
      ytdFalloutCount: ytdFalloutLeads.length,
      lostToLenderCount: lostToLenderLeads.length,
      ytdLostToLenderCount: ytdLostToLenderLeads.length,
      noLongerInterestedCount: noLongerInterestedLeads.length,
      ytdNoLongerInterestedCount: ytdNoLongerInterestedLeads.length,
      leadToPreApprovalRate: buyerLeads.length ? Math.round((preApprovalLeads.length / buyerLeads.length) * 100) : 0,
      ytdLeadToPreApprovalRate: ytdBuyerLeads.length ? Math.round((ytdPreApprovalLeads.length / ytdBuyerLeads.length) * 100) : 0,
      leadToCloseRate: buyerLeads.length ? Math.round((fundedLeads.length / buyerLeads.length) * 100) : 0,
      ytdLeadToCloseRate: ytdBuyerLeads.length ? Math.round((ytdFundedLeads.length / ytdBuyerLeads.length) * 100) : 0,
      falloutRate: buyerLeads.length ? Math.round((falloutLeads.length / buyerLeads.length) * 100) : 0,
      ytdFalloutRate: ytdBuyerLeads.length ? Math.round((ytdFalloutLeads.length / ytdBuyerLeads.length) * 100) : 0,
      stageRows,
      partnerProductionRows,
      falloutRows,
      ytdOutcomeRows,
      monthlyLeadRows,
      monthlyProductionRows,
      ytdLeadSourceRows,
      topPartnerRows: partnerProductionRows.slice(0, 8),
      leadYearRows,
      currentMonthLeadCount,
      lastMonthLeadCount,
      trailingThreeMonthLeadAverage,
      previousThreeMonthLeadAverage,
      ytdAverageLeadsPerMonth,
      latestCreditScoreAverage: latestCreditAverageRow?.creditScoreAverage || null,
      latestCreditScoreMonth: latestCreditAverageRow?.label || '',
      latestCreditScoreCount: latestCreditAverageRow?.creditScoreCount || 0,
      topProductionPartner,
      topYtdProductionPartner,
      topEfficiencyPartner,
      topOpportunityPartner,
      topRelationshipPartner,
      loanTypeRows,
      purchaseRefiRows,
      annualPerformanceRows,
      monthlyReferralHeatmapRows,
      ytdIncome: ytdFundedLeads.reduce((sum, lead) => sum + getIncomeAmount(lead), 0),
      ytdAverageReferralToUnderContractDays: getAverageReferralToUnderContractDays(ytdBuyerLeads),
    }
  }, [activeLeads, partnerRows, getPartnerDisplayName, analysisYear])
}

export default useKpiAnalytics
