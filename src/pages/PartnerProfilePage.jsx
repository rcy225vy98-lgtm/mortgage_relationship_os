

import LeadPipeline from '../components/LeadPipeline'

function PartnerProfilePage({
  selectedPartnerProfile,
  partnerRows,
  activeLeads,
  getPartnerDisplayName,
  partnerProfiles,
  partnerProfileDraft,
  partnerTouchForm,
  isEditingPartnerProfile,
  setActivePage,
  startEditingPartnerProfile,
  cancelEditingPartnerProfile,
  savePartnerProfileChanges,
  setPartnerProfileDraft,
  setPartnerTouchForm,
  addPartnerTouch,
  removePartnerTouch,
  query,
  setQuery,
  setPartnerFilter,
  partners,
  setLeads,
  setSelectedPartner,
}) {
  if (!selectedPartnerProfile) {
    return (
      <div className="panel">
        <h2>Partner Profile</h2>
        <p className="panel-subtitle">Choose a referral partner to view their profile.</p>
      </div>
    )
  }

  const currentPartner = partnerRows.find((row) => row.partner === selectedPartnerProfile.partner) || selectedPartnerProfile
  const connectedLeads = activeLeads.filter((lead) => {
    const isPartnerRelationshipRecord = lead.leadType === 'Agent Prospect' && lead.stage === 'Referral Partner' && lead.client === currentPartner.partner
    return !isPartnerRelationshipRecord && getPartnerDisplayName(lead) === currentPartner.partner
  })
  const partnerProfile = partnerProfiles[currentPartner.partner] || {}
  const editableProfile = partnerProfileDraft || {
    partnerName: currentPartner.partner,
    email: partnerProfile.email || '',
    phone: partnerProfile.phone || '',
    brokerage: partnerProfile.brokerage || '',
    notes: partnerProfile.notes || '',
  }

  return (
    <section className="partner-profile-page">
      <div className="panel partner-profile-hero">
        <div className="panel-header">
          <div>
            <h2>{currentPartner.partner}</h2>
            <p>{currentPartner.relationshipStatus || 'Referral Partner'}</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => setActivePage('partners')}>
            Back to Partners
          </button>
        </div>

        <div className="partner-profile-metrics">
          <div>
            <span>Buyer Referrals</span>
            <strong>{currentPartner.referrals}</strong>
          </div>
          <div>
            <span>Pre-Approved</span>
            <strong>{currentPartner.preApproved}</strong>
          </div>
          <div>
            <span>Under Contract</span>
            <strong>{currentPartner.underContract}</strong>
          </div>
          <div>
            <span>Efficiency Score</span>
            <strong>{currentPartner.score}</strong>
          </div>
        </div>
      </div>

      <div className="panel partner-profile-editor">
        <div className="panel-header">
          <div>
            <h2>Partner Details</h2>
            <p>Store contact info, brokerage, and relationship notes for this partner.</p>
          </div>

          {!isEditingPartnerProfile ? (
            <button type="button" className="primary-button" onClick={() => startEditingPartnerProfile(currentPartner, partnerProfile)}>
              Edit Partner
            </button>
          ) : (
            <div className="partner-edit-actions">
              <button type="button" className="ghost-button" onClick={cancelEditingPartnerProfile}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={() => savePartnerProfileChanges(currentPartner)}>
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="partner-profile-form">
          <div className="field full">
            <label htmlFor="partner-name">Partner Name</label>
            <input
              id="partner-name"
              value={editableProfile.partnerName}
              disabled={!isEditingPartnerProfile}
              onChange={(event) => setPartnerProfileDraft((current) => ({ ...current, partnerName: event.target.value }))}
              placeholder="Partner name"
            />
          </div>

          <div className="field">
            <label htmlFor="partner-email">Email</label>
            <input
              id="partner-email"
              type="email"
              value={editableProfile.email}
              disabled={!isEditingPartnerProfile}
              onChange={(event) => setPartnerProfileDraft((current) => ({ ...current, email: event.target.value }))}
              placeholder="agent@email.com"
            />
          </div>

          <div className="field">
            <label htmlFor="partner-phone">Phone</label>
            <input
              id="partner-phone"
              value={editableProfile.phone}
              disabled={!isEditingPartnerProfile}
              onChange={(event) => setPartnerProfileDraft((current) => ({ ...current, phone: event.target.value }))}
              placeholder="(864) 555-1234"
            />
          </div>

          <div className="field full">
            <label htmlFor="partner-brokerage">Brokerage</label>
            <input
              id="partner-brokerage"
              value={editableProfile.brokerage}
              disabled={!isEditingPartnerProfile}
              onChange={(event) => setPartnerProfileDraft((current) => ({ ...current, brokerage: event.target.value }))}
              placeholder="Brokerage or team affiliation"
            />
          </div>

          <div className="field full">
            <label htmlFor="partner-notes">Relationship Notes</label>
            <textarea
              id="partner-notes"
              value={editableProfile.notes}
              disabled={!isEditingPartnerProfile}
              onChange={(event) => setPartnerProfileDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="What they care about, how they prefer to communicate, opportunities to add value, personal notes..."
            />
          </div>
        </div>
      </div>

      <div className="panel partner-touch-panel">
        <div className="panel-header">
          <div>
            <h2>Partner Touch History</h2>
            <p>Log relationship-building touches that are separate from buyer lead follow-up.</p>
          </div>
        </div>

        <div className="partner-touch-form">
          <div className="field">
            <label htmlFor="partner-touch-date">Date</label>
            <input
              id="partner-touch-date"
              type="date"
              value={partnerTouchForm.date}
              onChange={(event) => setPartnerTouchForm((current) => ({ ...current, date: event.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="partner-touch-type">Touch Type</label>
            <select
              id="partner-touch-type"
              value={partnerTouchForm.type}
              onChange={(event) => setPartnerTouchForm((current) => ({ ...current, type: event.target.value }))}
            >
              <option>Value Touch</option>
              <option>Coffee Meeting</option>
              <option>Lunch Meeting</option>
              <option>Phone Call</option>
              <option>Text Follow-Up</option>
              <option>Cost Review Example Sent</option>
              <option>Market Update Sent</option>
              <option>Asked for Meeting</option>
              <option>Other</option>
            </select>
          </div>

          <div className="field full">
            <label htmlFor="partner-touch-note">Touch Notes</label>
            <textarea
              id="partner-touch-note"
              value={partnerTouchForm.note}
              onChange={(event) => setPartnerTouchForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="What happened? What did you send? What did they say?"
            />
          </div>

          <div className="field full">
            <label htmlFor="partner-touch-next-action">Next Relationship Action</label>
            <input
              id="partner-touch-next-action"
              value={partnerTouchForm.nextAction}
              onChange={(event) => setPartnerTouchForm((current) => ({ ...current, nextAction: event.target.value }))}
              placeholder="Example: Send market update next month, invite to coffee, follow up after listing appointment..."
            />
          </div>

          <div className="field">
            <label htmlFor="partner-touch-next-date">Next Touch Date</label>
            <input
              id="partner-touch-next-date"
              type="date"
              value={partnerTouchForm.nextTouchDate}
              onChange={(event) => setPartnerTouchForm((current) => ({ ...current, nextTouchDate: event.target.value }))}
            />
          </div>
        </div>

        <div className="partner-touch-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              addPartnerTouch(currentPartner.partner, partnerTouchForm)
              setPartnerTouchForm({
                date: new Date().toISOString().slice(0, 10),
                type: 'Value Touch',
                note: '',
                nextAction: '',
                nextTouchDate: '',
              })
            }}
          >
            Log Partner Touch
          </button>
        </div>

        {(partnerProfile.touchHistory || []).length > 0 && (
          <div className="partner-touch-list">
            {(partnerProfile.touchHistory || []).map((touch) => (
              <div className="partner-touch-item" key={touch.id}>
                <div>
                  <strong>{touch.type}</strong>
                  {touch.note && <p>{touch.note}</p>}
                  {touch.nextAction && <small>Next: {touch.nextAction}</small>}
                  {touch.nextTouchDate && <small>Due: {touch.nextTouchDate}</small>}
                </div>
                <div className="partner-touch-meta">
                  <span>{touch.date}</span>
                  <button type="button" className="ghost-button small-button danger-button" onClick={() => removePartnerTouch(currentPartner.partner, touch.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LeadPipeline
        key={`partner-profile-${currentPartner.partner}`}
        title={`${currentPartner.partner} Connected Leads`}
        subtitle="Buyer leads connected to this partner."
        addButtonLabel="+ Add Connected Lead"
        formTitle="Add a connected buyer lead"
        editFormTitle="Edit connected buyer lead"
        formSubtitle="Add a buyer lead connected to this referral partner."
        editFormSubtitle="Update the stage, notes, and next touch for this connected lead."
        nameLabel="Client Name"
        namePlaceholder="Jane Buyer"
        partnerLabel="Referral Partner"
        partnerPlaceholder="Referral partner"
        searchPlaceholder="Search this partner’s connected leads..."
        allTabLabel="Connected Leads"
        followUpTabLabel="Needs Touch"
        defaultLeadType="Buyer Lead"
        defaultPartner={currentPartner.partner}
        showLoanAmount={true}
        showPartnerContactFields={false}
        query={query}
        setQuery={setQuery}
        partnerFilter="All Partners"
        setPartnerFilter={setPartnerFilter}
        partners={partners}
        filteredLeads={connectedLeads}
        setLeads={setLeads}
        setSelectedPartner={setSelectedPartner}
      />
    </section>
  )
}

export default PartnerProfilePage
