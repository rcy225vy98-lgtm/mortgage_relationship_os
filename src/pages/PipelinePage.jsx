import LeadPipeline from '../components/LeadPipeline'

function PipelinePage({
  query,
  setQuery,
  partnerFilter,
  setPartnerFilter,
  partners,
  filteredLeads,
  setLeads,
  setSelectedPartner,
  focusedLeadId,
  setFocusedLeadId,
  setActivePage,
}) {
  return (
    <LeadPipeline
      query={query}
      setQuery={setQuery}
      partnerFilter={partnerFilter}
      setPartnerFilter={setPartnerFilter}
      partners={partners}
      filteredLeads={filteredLeads}
      setLeads={setLeads}
      setSelectedPartner={setSelectedPartner}
      focusedLeadId={focusedLeadId}
      setFocusedLeadId={setFocusedLeadId}
      setActivePage={setActivePage}
    />
  )
}

export default PipelinePage
