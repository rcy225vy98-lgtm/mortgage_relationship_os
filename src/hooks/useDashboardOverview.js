import { useMemo } from 'react'

function useDashboardOverview(activeLeads, partnerRows) {
  return useMemo(() => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()

    function getYear(dateValue) {
      if (!dateValue) return null
      const date = new Date(dateValue)
      if (Number.isNaN(date.getTime())) return null
      return date.getFullYear()
    }

    function isThisYear(dateValue) {
      return getYear(dateValue) === currentYear
    }

    function isThisMonth(dateValue) {
      if (!dateValue) return false
      const date = new Date(dateValue)
      if (Number.isNaN(date.getTime())) return false
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth
    }

    function isFutureClosing(dateValue) {
      if (!dateValue) return false
      const date = new Date(dateValue)
      if (Number.isNaN(date.getTime())) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    }

    const buyerLeads = activeLeads.filter((lead) => lead.leadType !== 'Agent Prospect')
    const leadsThisYear = buyerLeads.filter((lead) => isThisYear(lead.referralDate)).length
    const closedThisYear = buyerLeads.filter((lead) => lead.stage === 'Closed' && isThisYear(lead.closingDate || lead.lastTouch || lead.referralDate))
    const volumeClosedThisYear = closedThisYear.reduce((sum, lead) => sum + (Number(lead.loanAmount) || 0), 0)
    const preQualifiedThisYear = buyerLeads.filter((lead) => (lead.stage === 'Pre-Approved' || lead.stage === 'Pre-Qualified') && isThisYear(lead.referralDate)).length
    const dnqOrLostThisYear = buyerLeads.filter((lead) => (lead.stage === 'DNQ' || lead.stage === 'Other Lender' || lead.stage === 'Builder Lender') && isThisYear(lead.referralDate)).length
    const closingThisMonth = buyerLeads.filter((lead) => (lead.stage === 'Refi' || lead.stage === 'Under Contract' || lead.stage === 'Conditional Approval' || lead.stage === 'Clear to Close') && isThisMonth(lead.closingDate)).length
    const futureClosingLeads = buyerLeads.filter((lead) => (lead.stage === 'Refi' || lead.stage === 'Under Contract' || lead.stage === 'Conditional Approval' || lead.stage === 'Clear to Close') && isFutureClosing(lead.closingDate))
    const futureClosings = futureClosingLeads.length
    const projectedFutureVolume = futureClosingLeads.reduce((sum, lead) => sum + (Number(lead.loanAmount) || 0), 0)
    const activeAgentProspects = activeLeads.filter((lead) => lead.leadType === 'Agent Prospect' && lead.stage !== 'Referral Partner').length
    const leadToPreQualifiedRate = leadsThisYear ? Math.round((preQualifiedThisYear / leadsThisYear) * 100) : 0
    const leadToClosedRate = leadsThisYear ? Math.round((closedThisYear.length / leadsThisYear) * 100) : 0
    const falloutRate = leadsThisYear ? Math.round((dnqOrLostThisYear / leadsThisYear) * 100) : 0

    const buyerPipeline = [
      {
        label: 'New / No Contact',
        value: buyerLeads.filter((lead) => lead.stage === 'New Referral' || lead.stage === 'Contact Attempted').length,
      },
      {
        label: 'Application / Docs',
        value: buyerLeads.filter((lead) => lead.stage === 'Application Started' || lead.stage === 'Connected, Needs Application' || lead.stage === 'Waiting on Docs' || lead.stage === 'Documentation').length,
      },
      {
        label: 'Pre-Approved',
        value: buyerLeads.filter((lead) => lead.stage === 'Pre-Approved' || lead.stage === 'Pre-Qualified').length,
      },
      {
        label: 'Contract / Refi to Close',
        value: buyerLeads.filter((lead) => lead.stage === 'Refi' || lead.stage === 'Under Contract' || lead.stage === 'Conditional Approval' || lead.stage === 'Clear to Close').length,
      },
    ]

    return {
      currentYear,
      leadsThisYear,
      closingsThisYear: closedThisYear.length,
      volumeClosedThisYear,
      preQualifiedThisYear,
      dnqOrLostThisYear,
      closingThisMonth,
      futureClosings,
      projectedFutureVolume,
      leadToPreQualifiedRate,
      leadToClosedRate,
      falloutRate,
      referralPartnerCount: partnerRows.length,
      activeAgentProspects,
      buyerPipeline,
      partnerMomentum: partnerRows.slice(0, 3),
    }
  }, [activeLeads, partnerRows])
}

export default useDashboardOverview
