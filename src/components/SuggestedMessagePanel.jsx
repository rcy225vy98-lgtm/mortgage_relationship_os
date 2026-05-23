import { useMemo, useState } from 'react'
import { getSuggestedMessages } from '../utils/messageTemplates'

const FEEDBACK_STORAGE_KEY = 'crm-message-feedback-v1'

function getStage(lead) {
  return lead.stage || lead.status || 'New Referral'
}

function getFeedbackKey(lead, messageType, messageMode) {
  return [lead.id || lead.client || 'lead', getStage(lead), messageType, messageMode].join('|')
}

function readStoredFeedback() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY)) || []
  } catch (error) {
    console.error('Unable to read message feedback:', error)
    return []
  }
}

function saveStoredFeedback(feedbackItems) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackItems))
}

export default function SuggestedMessagePanel({ lead }) {
  const [messageType, setMessageType] = useState('clientText')
  const [messageMode, setMessageMode] = useState('personalized')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [editedMessage, setEditedMessage] = useState('')

  const messages = getSuggestedMessages(lead)
  const selectedMessage = messageMode === 'personalized'
    ? messages[messageType]
    : messages.template?.[messageType] || messages[messageType]

  const messageToCopy = isEditingMessage ? editedMessage.trim() || selectedMessage : selectedMessage

  const feedbackKey = useMemo(
    () => getFeedbackKey(lead, messageType, messageMode),
    [lead, messageType, messageMode],
  )

  function recordFeedback(feedbackType, messageOverride = selectedMessage) {
    const existingFeedback = readStoredFeedback()
    const feedbackEntry = {
      id: `${Date.now()}-${feedbackType}`,
      key: feedbackType === 'improved' ? `${feedbackKey}|improved|${Date.now()}` : feedbackKey,
      leadId: lead.id || '',
      client: lead.client || '',
      partner: lead.partner || '',
      stage: getStage(lead),
      leadType: lead.leadType || '',
      messageType,
      messageMode,
      feedbackType,
      message: messageOverride,
      originalMessage: selectedMessage,
      reason: messages.reason,
      createdAt: new Date().toISOString(),
    }

    const updatedFeedback = [
      feedbackEntry,
      ...existingFeedback.filter((item) => !(item.key === feedbackEntry.key && item.feedbackType === feedbackType)),
    ].slice(0, 200)

    saveStoredFeedback(updatedFeedback)
    setFeedbackStatus(
      feedbackType === 'favorite'
        ? 'Saved as a favorite.'
        : feedbackType === 'needs-work'
          ? 'Marked as needing work.'
          : feedbackType === 'used'
            ? 'Marked as used.'
            : feedbackType === 'improved'
              ? 'Improved version saved.'
              : 'Feedback saved.',
    )
    window.setTimeout(() => setFeedbackStatus(''), 2200)
  }

  async function copyMessage(event) {
    event.stopPropagation()
    setError('')

    try {
      await navigator.clipboard.writeText(messageToCopy)
      setCopied(true)
      recordFeedback('copied', messageToCopy)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (copyError) {
      console.error('Unable to copy suggested message:', copyError)
      setError('Unable to copy. You can still highlight and copy the message manually.')
    }
  }

  function startEditingMessage(event) {
    event.stopPropagation()
    setEditedMessage(selectedMessage)
    setIsEditingMessage(true)
    setCopied(false)
    setFeedbackStatus('')
    setError('')
  }

  function saveImprovedVersion(event) {
    event.stopPropagation()
    const improvedMessage = editedMessage.trim()

    if (!improvedMessage) {
      setError('Add your improved message before saving.')
      return
    }

    recordFeedback('improved', improvedMessage)
    setIsEditingMessage(false)
    setEditedMessage('')
    setError('')
  }

  return (
    <div className="suggested-message-panel" onClick={(event) => event.stopPropagation()}>
      <div className="suggested-message-header">
        <div>
          <strong>Suggested Message</strong>
          <span>{messages.reason}</span>
        </div>

        <div className="suggested-message-toggle" role="group" aria-label="Suggested message type">
          <button
            type="button"
            className={messageType === 'clientText' ? 'active' : ''}
            onClick={(event) => {
              event.stopPropagation()
              setMessageType('clientText')
              setCopied(false)
              setFeedbackStatus('')
              setIsEditingMessage(false)
              setEditedMessage('')
            }}
          >
            Client
          </button>
          <button
            type="button"
            className={messageType === 'agentText' ? 'active' : ''}
            onClick={(event) => {
              event.stopPropagation()
              setMessageType('agentText')
              setCopied(false)
              setFeedbackStatus('')
              setIsEditingMessage(false)
              setEditedMessage('')
            }}
          >
            Agent
          </button>
        </div>
      </div>

      <div className="suggested-message-source-row">
        <span>{messageMode === 'personalized' ? 'Personalized from lead details' : 'Simple template'}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setMessageMode((current) => (current === 'personalized' ? 'template' : 'personalized'))
            setCopied(false)
            setFeedbackStatus('')
            setIsEditingMessage(false)
            setEditedMessage('')
          }}
        >
          {messageMode === 'personalized' ? 'Use Simple Template' : 'Use Personalized'}
        </button>
      </div>

      <div className="suggested-message-copy">
        {isEditingMessage ? (
          <textarea
            className="suggested-message-editor"
            value={editedMessage}
            onChange={(event) => setEditedMessage(event.target.value)}
            rows="5"
          />
        ) : (
          <p>{selectedMessage}</p>
        )}
      </div>

      {error && <p className="suggested-message-error">{error}</p>}
      {feedbackStatus && <p className="suggested-message-feedback-status">{feedbackStatus}</p>}

      <div className="suggested-message-actions suggested-message-feedback-actions">
        <button type="button" className="ghost-button small-button" onClick={copyMessage}>
          {copied ? 'Copied' : 'Copy Message'}
        </button>
        {!isEditingMessage ? (
          <button type="button" className="ghost-button small-button" onClick={startEditingMessage}>
            Edit Message
          </button>
        ) : (
          <button type="button" className="ghost-button small-button" onClick={saveImprovedVersion}>
            Save Improved Version
          </button>
        )}
        {isEditingMessage && (
          <button
            type="button"
            className="ghost-button small-button"
            onClick={(event) => {
              event.stopPropagation()
              setIsEditingMessage(false)
              setEditedMessage('')
              setError('')
            }}
          >
            Cancel Edit
          </button>
        )}
        <button type="button" className="ghost-button small-button" onClick={() => recordFeedback('used')}>
          Used This Message
        </button>
        <button type="button" className="ghost-button small-button" onClick={() => recordFeedback('favorite')}>
          Save Favorite
        </button>
        <button type="button" className="ghost-button small-button" onClick={() => recordFeedback('needs-work')}>
          Needs Work
        </button>
      </div>
    </div>
  )
}
