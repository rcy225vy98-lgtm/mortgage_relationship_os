import { useState } from 'react'
import { ensureLoanHubFields, generateLoanHubId, getLoanHubLink } from '../utils/loanHub'

const blankVideo = { title: '', url: '', description: '', createdAt: '' }
const blankDate = { label: '', date: '', note: '' }

function normalizeDraft(lead) {
  const loanHubLead = ensureLoanHubFields(lead)

  return {
    loanHubId: loanHubLead.loanHubId,
    loanHubEnabled: loanHubLead.loanHubEnabled,
    hfgGoPortalUrl: loanHubLead.hfgGoPortalUrl,
    progressTrackerUrl: loanHubLead.progressTrackerUrl,
    nextBestStep: loanHubLead.nextBestStep,
    strategyVideos: loanHubLead.strategyVideos.length ? loanHubLead.strategyVideos : [{ ...blankVideo }],
    importantDates: loanHubLead.importantDates.length ? loanHubLead.importantDates : [{ ...blankDate }],
  }
}

function cleanStrategyVideos(videos) {
  return videos
    .map((video) => ({
      title: String(video.title || '').trim(),
      url: String(video.url || '').trim(),
      description: String(video.description || '').trim(),
      createdAt: video.createdAt || new Date().toISOString().slice(0, 10),
    }))
    .filter((video) => video.title || video.url || video.description)
}

function cleanImportantDates(dates) {
  return dates
    .map((dateItem) => ({
      label: String(dateItem.label || '').trim(),
      date: dateItem.date || '',
      note: String(dateItem.note || '').trim(),
    }))
    .filter((dateItem) => dateItem.label || dateItem.date || dateItem.note)
}

export default function LoanHubAdminPanel({ lead, onUpdate }) {
  const [draft, setDraft] = useState(() => normalizeDraft(lead))
  const [copyStatus, setCopyStatus] = useState('idle')
  const loanHubLink = getLoanHubLink({ loanHubId: draft.loanHubId })

  function updateDraft(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateVideo(index, field, value) {
    setDraft((current) => ({
      ...current,
      strategyVideos: current.strategyVideos.map((video, videoIndex) => (
        videoIndex === index ? { ...video, [field]: value } : video
      )),
    }))
  }

  function updateImportantDate(index, field, value) {
    setDraft((current) => ({
      ...current,
      importantDates: current.importantDates.map((dateItem, dateIndex) => (
        dateIndex === index ? { ...dateItem, [field]: value } : dateItem
      )),
    }))
  }

  function addStrategyVideo() {
    setDraft((current) => ({
      ...current,
      strategyVideos: [...current.strategyVideos, { ...blankVideo }],
    }))
  }

  function addImportantDate() {
    setDraft((current) => ({
      ...current,
      importantDates: [...current.importantDates, { ...blankDate }],
    }))
  }

  function removeStrategyVideo(index) {
    setDraft((current) => ({
      ...current,
      strategyVideos: current.strategyVideos.filter((_, videoIndex) => videoIndex !== index),
    }))
  }

  function removeImportantDate(index) {
    setDraft((current) => ({
      ...current,
      importantDates: current.importantDates.filter((_, dateIndex) => dateIndex !== index),
    }))
  }

  function saveLoanHub(event) {
    event.stopPropagation()

    onUpdate(lead.id, {
      loanHubId: draft.loanHubId || generateLoanHubId(),
      loanHubEnabled: Boolean(draft.loanHubEnabled),
      hfgGoPortalUrl: draft.hfgGoPortalUrl.trim(),
      progressTrackerUrl: draft.progressTrackerUrl.trim(),
      nextBestStep: draft.nextBestStep.trim(),
      strategyVideos: cleanStrategyVideos(draft.strategyVideos),
      importantDates: cleanImportantDates(draft.importantDates),
    })
  }

  async function copyLoanHubLink(event) {
    event.stopPropagation()
    const nextLoanHubId = draft.loanHubId || generateLoanHubId()
    const nextLink = getLoanHubLink({ loanHubId: nextLoanHubId })

    if (!draft.loanHubId) {
      setDraft((current) => ({ ...current, loanHubId: nextLoanHubId }))
      onUpdate(lead.id, { loanHubId: nextLoanHubId, loanHubEnabled: true })
    }

    try {
      await navigator.clipboard.writeText(nextLink)
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 1800)
    } catch (error) {
      console.error('Unable to copy Loan Hub link:', error)
      alert('Unable to copy the Loan Hub link. You can still select and copy it manually.')
    }
  }

  return (
    <section className="loan-hub-admin-panel" onClick={(event) => event.stopPropagation()}>
      <div className="loan-hub-admin-header">
        <div>
          <span>Loan Hub</span>
          <strong>Client-facing live link</strong>
        </div>
        <label className="loan-hub-toggle">
          <input
            type="checkbox"
            checked={draft.loanHubEnabled}
            onChange={(event) => updateDraft('loanHubEnabled', event.target.checked)}
          />
          Public
        </label>
      </div>

      <div className="loan-hub-link-row">
        <input value={loanHubLink || 'Save to create a Loan Hub link'} readOnly aria-label="Loan Hub link" />
        <button type="button" onClick={copyLoanHubLink}>
          {copyStatus === 'copied' ? 'Copied' : 'Copy Loan Hub Link'}
        </button>
      </div>

      <div className="loan-hub-admin-grid">
        <label>
          HFG GO Portal Link
          <input
            value={draft.hfgGoPortalUrl}
            onChange={(event) => updateDraft('hfgGoPortalUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label>
          Progress Tracker Link
          <input
            value={draft.progressTrackerUrl}
            onChange={(event) => updateDraft('progressTrackerUrl', event.target.value)}
            placeholder="Optional tracker URL"
          />
        </label>
        <label className="loan-hub-wide-field">
          Next Best Step
          <textarea
            value={draft.nextBestStep}
            onChange={(event) => updateDraft('nextBestStep', event.target.value)}
            rows="3"
            placeholder="What should the client do next?"
          />
        </label>
      </div>

      <div className="loan-hub-admin-subsection">
        <div className="loan-hub-admin-subhead">
          <strong>Strategy Videos</strong>
          <button type="button" onClick={addStrategyVideo}>Add Video</button>
        </div>
        {draft.strategyVideos.map((video, index) => (
          <div className="loan-hub-repeater-row" key={`${index}-${video.createdAt || 'video'}`}>
            <input value={video.title} onChange={(event) => updateVideo(index, 'title', event.target.value)} placeholder="Video title" />
            <input value={video.url} onChange={(event) => updateVideo(index, 'url', event.target.value)} placeholder="Loom or video URL" />
            <input value={video.description} onChange={(event) => updateVideo(index, 'description', event.target.value)} placeholder="Short description" />
            <button type="button" onClick={() => removeStrategyVideo(index)} aria-label="Remove strategy video">x</button>
          </div>
        ))}
      </div>

      <div className="loan-hub-admin-subsection">
        <div className="loan-hub-admin-subhead">
          <strong>Important Dates</strong>
          <button type="button" onClick={addImportantDate}>Add Date</button>
        </div>
        {draft.importantDates.map((dateItem, index) => (
          <div className="loan-hub-repeater-row dates" key={`${index}-${dateItem.date || 'date'}`}>
            <input value={dateItem.label} onChange={(event) => updateImportantDate(index, 'label', event.target.value)} placeholder="Label" />
            <input type="date" value={dateItem.date} onChange={(event) => updateImportantDate(index, 'date', event.target.value)} />
            <input value={dateItem.note} onChange={(event) => updateImportantDate(index, 'note', event.target.value)} placeholder="Optional note" />
            <button type="button" onClick={() => removeImportantDate(index)} aria-label="Remove important date">x</button>
          </div>
        ))}
      </div>

      <div className="loan-hub-admin-actions">
        <button type="button" className="primary-button small-button" onClick={saveLoanHub}>Save Loan Hub Settings</button>
      </div>
    </section>
  )
}
