import { useMemo } from 'react'

function useLeadViews({
  leads,
  query,
  partnerFilter,
  agentQuery,
  agentFilter,
  shouldShowInReferralPartners,
  getPartnerDisplayName,
  partnerScore,
}) {
  const activeLeads = useMemo(() => {
    return leads.filter((lead) => !lead.archived)
  }, [leads])

  const partners = useMemo(() => {
    const partnerEligibleLeads = activeLeads.filter(shouldShowInReferralPartners)
    return ['All Partners', ...new Set(partnerEligibleLeads.map(getPartnerDisplayName))]
  }, [activeLeads, shouldShowInReferralPartners, getPartnerDisplayName])

  const agentSources = useMemo(() => {
    const agentLeads = activeLeads.filter((lead) => lead.leadType === 'Agent Prospect')
    return ['All Partners', ...new Set(agentLeads.map((lead) => lead.partner))]
  }, [activeLeads])

  const filteredLeads = useMemo(() => {
    return activeLeads.filter((lead) => {
      if (lead.leadType === 'Agent Prospect') return false

      const searchText = `${lead.client} ${lead.partner} ${lead.stage} ${lead.status} ${lead.detail}`.toLowerCase()
      const matchesSearch = searchText.includes(query.toLowerCase())
      const matchesPartner = partnerFilter === 'All Partners' || getPartnerDisplayName(lead) === partnerFilter
      return matchesSearch && matchesPartner
    })
  }, [activeLeads, query, partnerFilter, getPartnerDisplayName])

  const agentProspectLeads = useMemo(() => {
    return activeLeads.filter((lead) => {
      if (lead.leadType !== 'Agent Prospect') return false

      const searchText = `${lead.client} ${lead.partner} ${lead.stage} ${lead.status} ${lead.detail}`.toLowerCase()
      const matchesSearch = searchText.includes(agentQuery.toLowerCase())
      const matchesSource = agentFilter === 'All Partners' || lead.partner === agentFilter

      return matchesSearch && matchesSource
    })
  }, [activeLeads, agentQuery, agentFilter])

  const partnerRows = useMemo(() => {
    const grouped = activeLeads.reduce((acc, lead) => {
      if (!shouldShowInReferralPartners(lead)) return acc

      const partnerName = getPartnerDisplayName(lead)

      acc[partnerName] = acc[partnerName] || {
        partner: partnerName,
        relationshipRecord: null,
        referredLeads: [],
      }

      const isRelationshipRecord = lead.leadType === 'Agent Prospect' && lead.stage === 'Referral Partner'

      if (isRelationshipRecord) {
        acc[partnerName].relationshipRecord = lead
      } else {
        acc[partnerName].referredLeads.push(lead)
      }

      return acc
    }, {})

    return Object.values(grouped)
      .map((row) => {
        const relationshipStatus = row.relationshipRecord?.stage || 'Referral Partner'
        const lastTouch = row.relationshipRecord?.lastTouch || row.referredLeads[0]?.lastTouch || ''
        const nextActionDate = row.relationshipRecord?.nextActionDate || row.referredLeads[0]?.nextActionDate || ''

        return {
          partner: row.partner,
          relationshipStatus,
          relationshipRecordId: row.relationshipRecord?.id || null,
          lastTouch,
          nextActionDate,
          referrals: row.referredLeads.length,
          preApproved: row.referredLeads.filter((lead) => lead.stage === 'Pre-Approved').length,
          underContract: row.referredLeads.filter((lead) => lead.stage === 'Under Contract').length,
          score: partnerScore(row.referredLeads),
        }
      })
      .sort((a, b) => b.score - a.score)
  }, [activeLeads, shouldShowInReferralPartners, getPartnerDisplayName, partnerScore])

  return {
    activeLeads,
    partners,
    agentSources,
    filteredLeads,
    agentProspectLeads,
    partnerRows,
  }
}

export default useLeadViews