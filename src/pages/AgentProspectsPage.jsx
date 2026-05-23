import LeadPipeline from '../components/LeadPipeline'

function AgentProspectsPage({
  agentQuery,
  setAgentQuery,
  agentFilter,
  setAgentFilter,
  agentSources,
  agentProspectLeads,
  setLeads,
  setSelectedPartner,
}) {
  return (
    <LeadPipeline
      title="Agent Prospects"
      subtitle="Track agents you want to build relationships with, from first outreach to referral partner."
      addButtonLabel="+ Add Agent"
      formTitle="Add a new agent prospect"
      editFormTitle="Edit agent prospect"
      formSubtitle="Add agents you want to intentionally build relationships with."
      editFormSubtitle="Update the relationship stage, notes, and next touch."
      nameLabel="Agent Name"
      namePlaceholder="Jane Agent"
      detailLabel="Relationship Notes"
      detailPlaceholder="How you found them, what they focus on, and the next relationship move..."
      searchPlaceholder="Search by agent, source, stage, or detail..."
      allTabLabel="All Prospects"
      followUpTabLabel="Needs Touch"
      defaultLeadType="Agent Prospect"
      partnerLabel="Source / Notes"
      partnerPlaceholder="Optional, defaults to Self-Sourced"
      showLoanAmount={false}
      showPartnerContactFields={true}
      query={agentQuery}
      setQuery={setAgentQuery}
      partnerFilter={agentFilter}
      setPartnerFilter={setAgentFilter}
      partners={agentSources}
      filteredLeads={agentProspectLeads}
      setLeads={setLeads}
      setSelectedPartner={setSelectedPartner}
    />
  )
}

export default AgentProspectsPage