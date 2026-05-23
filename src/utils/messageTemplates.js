function getFirstName(name = '') {
  return String(name).trim().split(/\s+/)[0] || 'there'
}

function getRecentTouchSummary(lead) {
  const recentTouch = lead.touchHistory?.[0]
  if (!recentTouch) return ''

  return recentTouch.note || ''
}

function getNotesText(lead) {
  return `${lead.detail || ''} ${getRecentTouchSummary(lead)} ${lead.nextAction || ''}`.toLowerCase()
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term))
}

function getStage(lead) {
  return lead.stage || lead.status || 'New Referral'
}

const FEEDBACK_STORAGE_KEY = 'crm-message-feedback-v1'

function readStoredFeedback() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY)) || []
  } catch (error) {
    console.error('Unable to read saved message feedback:', error)
    return []
  }
}

function getLeadSituationTags(lead) {
  const text = getNotesText(lead)
  const tags = []

  if (getPaymentRange(text) || text.includes('payment')) tags.push('payment')
  if (hasAny(text, ['usda'])) tags.push('usda')
  if (hasAny(text, ['fha'])) tags.push('fha')
  if (hasAny(text, ['va loan', ' va ', 'veteran'])) tags.push('va')
  if (hasAny(text, ['new construction', 'builder', 'build'])) tags.push('new-construction')
  if (hasAny(text, ['relocat', 'moving from', 'move from', 'chicago', 'out of state', 'job in sc', 'job search'])) tags.push('relocation')
  if (hasAny(text, ['buyer agency', 'buyer-agency', 'agency agreement', 'didn’t like the buyer', "didn't like the buyer", 'wants to move on from'])) tags.push('agent-confidence')
  if (hasAny(text, ['cash to close', 'cash needed', 'funds to close'])) tags.push('cash-to-close')
  if (hasAny(text, ['rate', 'interest rate'])) tags.push('rate')

  return tags
}

function getFeedbackSituationScore(lead, feedbackItem) {
  let score = 0
  const stage = getStage(lead)
  const leadTags = getLeadSituationTags(lead)
  const feedbackText = `${feedbackItem.message || ''} ${feedbackItem.reason || ''}`.toLowerCase()

  if (feedbackItem.stage === stage) score += 8
  if (feedbackItem.leadType && feedbackItem.leadType === lead.leadType) score += 3

  leadTags.forEach((tag) => {
    if (feedbackText.includes(tag.replace('-', ' ')) || feedbackText.includes(tag)) score += 2
  })

  if (feedbackItem.feedbackType === 'improved') score += 4
  if (feedbackItem.feedbackType === 'favorite') score += 3
  if (feedbackItem.feedbackType === 'used') score += 2

  return score
}

function getSavedMessageMatch(lead, messageType) {
  const feedbackItems = readStoredFeedback()
  const eligibleItems = feedbackItems
    .filter((item) => item.messageType === messageType)
    .filter((item) => ['improved', 'favorite', 'used'].includes(item.feedbackType))
    .filter((item) => item.message)
    .map((item) => ({
      ...item,
      score: getFeedbackSituationScore(lead, item),
    }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score)

  return eligibleItems[0] || null
}

function getPaymentRange(text) {
  const has1600 = text.includes('1600') || text.includes('$1,600') || text.includes('$1600')
  const has1800 = text.includes('1800') || text.includes('$1,800') || text.includes('$1800')
  const has2000 = text.includes('2000') || text.includes('$2,000') || text.includes('$2000')

  if (has1600 && has1800) return '$1,600 to $1,800/month'
  if (has1800 && has2000) return '$1,800 to $2,000/month'
  if (has1600) return 'around $1,600/month'
  if (has1800) return 'around $1,800/month'
  if (has2000) return 'around $2,000/month'

  return ''
}

function getClientContextPieces(lead) {
  const text = getNotesText(lead)
  const pieces = []
  const paymentRange = getPaymentRange(text)

  if (paymentRange) {
    pieces.push(`keeping the payment near ${paymentRange}`)
  } else if (text.includes('payment')) {
    pieces.push('keeping the payment comfortable')
  }

  if (hasAny(text, ['usda'])) {
    pieces.push('USDA eligibility')
  }

  if (hasAny(text, ['fha'])) {
    pieces.push('FHA structure')
  }

  if (hasAny(text, ['va loan', ' va ', 'veteran'])) {
    pieces.push('VA loan options')
  }

  if (hasAny(text, ['new construction', 'builder', 'build'])) {
    pieces.push('new construction options')
  }

  if (hasAny(text, ['relocat', 'moving from', 'move from', 'chicago', 'out of state', 'job in sc', 'job search'])) {
    pieces.push('the move and job transition')
  }

  if (hasAny(text, ['buyer agency', 'buyer-agency', 'agency agreement', 'didn’t like the buyer', "didn't like the buyer", 'wants to move on from'])) {
    pieces.push('making sure the process feels clear and comfortable')
  }

  if (hasAny(text, ['cash to close', 'cash needed', 'funds to close'])) {
    pieces.push('cash to close')
  }

  if (hasAny(text, ['rate', 'interest rate'])) {
    pieces.push('rate and payment changes')
  }

  return [...new Set(pieces)].slice(0, 4)
}

function getAgentContextPieces(lead) {
  const text = getNotesText(lead)
  const pieces = []
  const paymentRange = getPaymentRange(text)

  if (paymentRange) pieces.push(`payment target near ${paymentRange}`)
  if (hasAny(text, ['usda'])) pieces.push('USDA fit')
  if (hasAny(text, ['new construction', 'builder', 'build'])) pieces.push('new construction strategy')
  if (hasAny(text, ['relocat', 'moving from', 'move from', 'chicago', 'out of state', 'job in sc', 'job search'])) pieces.push('relocation timing')
  if (hasAny(text, ['buyer agency', 'buyer-agency', 'agency agreement', 'wants to move on from'])) pieces.push('client confidence')

  return [...new Set(pieces)].slice(0, 3)
}

function joinPieces(pieces) {
  if (pieces.length === 0) return ''
  if (pieces.length === 1) return pieces[0]
  if (pieces.length === 2) return `${pieces[0]} and ${pieces[1]}`

  return `${pieces.slice(0, -1).join(', ')}, and ${pieces[pieces.length - 1]}`
}

function getClientStrategyLine(lead) {
  const pieces = getClientContextPieces(lead)
  const joined = joinPieces(pieces)

  if (!joined) {
    return 'As you keep looking at options,'
  }

  return `Since ${joined} ${pieces.length === 1 ? 'is' : 'are'} important,`
}

function getAgentStrategyLine(lead) {
  const pieces = getAgentContextPieces(lead)
  const joined = joinPieces(pieces)

  if (!joined) {
    return 'I’m staying close with them on payment strategy and affordability'
  }

  return `I’m staying close with them on ${joined}`
}

function getSimpleTemplateMessages(firstName, partnerName, stage) {
  if (stage === 'New Referral' || stage === 'New Lead') {
    return {
      clientText: `Hey ${firstName}, this is Brian McIntosh with The McIntosh Team. ${partnerName} asked me to reach out and help you get clarity on your home financing options. When you have a few minutes, I’d love to learn what you’re working toward and help you understand the best next step.`,
      agentText: `Hey ${partnerName}, thank you again for connecting me with ${firstName}. I’ll reach out and keep you posted once we connect.`,
    }
  }

  if (stage === 'Pre-Approved' || stage === 'Shopping' || stage === 'Home Shopping') {
    return {
      clientText: `Hey ${firstName}, just checking in. Send me any homes you’re considering before you get too far into it, and I can help you look at payment, cash to close, and overall fit.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. I’m staying close with them and will help review numbers as they find homes they like.`,
    }
  }

  if (stage === 'Under Contract' || stage === 'Contract to Close') {
    return {
      clientText: `Hey ${firstName}, just wanted to give you a quick update. We’re moving through the loan process, and I’ll keep you posted as each milestone moves forward.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. We’re moving through the contract-to-close process and I’ll keep everyone posted as we hit each milestone.`,
    }
  }

  return {
    clientText: `Hey ${firstName}, just checking in. I wanted to see where things stand and whether there’s anything I can help clarify as you think through your next step.`,
    agentText: `Hey ${partnerName}, quick update on ${firstName}. I’m checking in to see where things stand and will keep you posted if anything changes.`,
  }
}

function buildReturn({ clientText, agentText, reason, template }) {
  return {
    clientText,
    agentText,
    reason,
    template,
  }
}

export function getSuggestedMessages(lead) {
  const firstName = getFirstName(lead.client)
  const partnerName = lead.partner || 'your agent'
  const stage = getStage(lead)
  const text = getNotesText(lead)
  const clientStrategyLine = getClientStrategyLine(lead)
  const agentStrategyLine = getAgentStrategyLine(lead)
  const template = getSimpleTemplateMessages(firstName, partnerName, stage)

  const savedClientMessage = getSavedMessageMatch(lead, 'clientText')
  const savedAgentMessage = getSavedMessageMatch(lead, 'agentText')

  function applySavedMessages(messageSet) {
    const hasSavedClient = Boolean(savedClientMessage)
    const hasSavedAgent = Boolean(savedAgentMessage)

    if (!hasSavedClient && !hasSavedAgent) return messageSet

    return {
      ...messageSet,
      clientText: savedClientMessage?.message || messageSet.clientText,
      agentText: savedAgentMessage?.message || messageSet.agentText,
      reason: hasSavedClient || hasSavedAgent
        ? 'Using a saved message pattern from your prior feedback because it matches this lead stage or situation.'
        : messageSet.reason,
      savedMessageMatch: {
        client: savedClientMessage || null,
        agent: savedAgentMessage || null,
      },
    }
  }

  if (stage === 'New Referral' || stage === 'New Lead') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, this is Brian McIntosh with The McIntosh Team. ${partnerName} asked me to reach out and help you get clarity on your home financing options. No rush, but when you have a few minutes, I’d love to learn what you’re working toward and help you understand the best next step.`,
      agentText: `Hey ${partnerName}, thank you again for connecting me with ${firstName}. I’m going to reach out by phone and text, and I’ll keep you posted once we connect and I have a better feel for their goals.`,
      reason: 'New referrals need fast, clear contact while the relationship handoff is still warm.',
      template,
    }))
  }

  if (stage === 'Contact Attempted' || stage === 'Attempted to Connect') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, just wanted to follow up. I know schedules get busy, but I’m here whenever you’re ready to talk through your home financing options and figure out what makes the most sense for you.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. I’ve reached out and haven’t connected yet, but I’ll keep trying and let you know as soon as I’m able to talk with them.`,
      reason: 'No-connection leads need persistence without sounding pushy, plus a referral partner update.',
      template,
    }))
  }

  if (stage === 'Connected' || stage === 'Connected, Needs Application') {
    const extraContext = getClientContextPieces(lead).length > 0 ? ` I’ll use that to build options around ${joinPieces(getClientContextPieces(lead))}.` : ''

    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, I enjoyed connecting with you. The next best step is completing the application so I can give you real numbers and help you understand your options clearly.${extraContext} The goal is not to lock you into anything, it just gives us the details we need to build the right strategy.`,
      agentText: `Hey ${partnerName}, I connected with ${firstName}. ${agentStrategyLine}, and the next step is getting the application completed so I can review the full picture and give them clear numbers. I’ll keep you posted as we move forward.`,
      reason: 'Connected borrowers need momentum and clarity so they do not stall before application.',
      template,
    }))
  }

  if (stage === 'Application Started' || stage === 'Waiting on Docs' || stage === 'Documentation' || stage === 'Docs Submitted') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, we’re close. The main thing right now is making sure we have everything needed to finish reviewing your file. Once that is complete, I can give you a much clearer picture of your options and next steps.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. We’re working through the application and document review stage now. I’ll keep you posted once I have a clearer approval path and numbers to share.`,
      reason: 'The docs stage is a common friction point, so the message should reduce confusion and keep momentum.',
      template,
    }))
  }

  if (stage === 'Pre-Approved' || stage === 'Shopping' || stage === 'Home Shopping') {
    const reviewItems = []
    if (hasAny(text, ['usda'])) reviewItems.push('USDA eligibility')
    if (hasAny(text, ['new construction', 'builder', 'build'])) reviewItems.push('new construction structure')
    reviewItems.push('payment')
    reviewItems.push('cash to close')

    const reviewLine = joinPieces([...new Set(reviewItems)])

    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, just checking in. ${clientStrategyLine} send me any homes you’re considering before you get too far into it. I can help compare ${reviewLine} and whether the structure still fits what you’re trying to accomplish.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. ${agentStrategyLine} so we can help them move forward with confidence when the right home comes up.`,
      reason: 'Pre-approved buyers need weekly coaching so they do not drift, get surprised by payment changes, or shop without strategy.',
      template,
    }))
  }

  if (stage === 'Under Contract' || stage === 'Contract to Close') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, just wanted to give you a quick update. We’re watching the key pieces of the loan process and I’ll keep you posted as each milestone moves forward. My goal is to make sure you’re not left wondering where things stand.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. We’re moving through the contract-to-close process and I’ll continue keeping everyone updated as we move through underwriting, appraisal, title, and closing milestones.`,
      reason: 'Under contract files need proactive communication so the buyer and agents feel the file is being professionally managed.',
      template,
    }))
  }

  if (stage === 'Conditional Approval') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, we have conditional approval, which means underwriting has reviewed the file and given us the remaining items needed to move forward. I’ll help you work through anything we still need so we can keep the file moving toward closing.`,
      agentText: `Hey ${partnerName}, ${firstName} is at conditional approval. We’re working through the remaining conditions now, and I’ll keep you updated as we move toward clear to close.`,
      reason: 'Conditional approval is a major milestone, but borrowers need clarity on what conditions mean and who owns the next step.',
      template,
    }))
  }

  if (stage === 'Clear to Close') {
    return applySavedMessages(buildReturn({
      clientText: `Great news, ${firstName}, your loan is clear to close. That means underwriting has issued final approval. We still have final closing steps to work through, but this is the big milestone we’ve been working toward. I’ll keep you posted on final numbers and closing instructions.`,
      agentText: `Great news, ${partnerName}, ${firstName} is clear to close. I’ll keep everyone posted on final numbers, closing instructions, and anything else needed before closing.`,
      reason: 'Clear to close messages should create confidence while still setting expectations for final closing steps.',
      template,
    }))
  }

  if (stage === 'Closed' || stage === 'Post Closing' || lead.leadType === 'Past Client') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, I hope you’re settling in well. I’m grateful I got to be part of this with you. If anything comes up with your mortgage, payment, escrow, or future plans, I’m always happy to be a resource.`,
      agentText: `Hey ${partnerName}, thank you again for trusting me with ${firstName}. I’m grateful we got to work together on this and I’ll continue taking care of them after closing.`,
      reason: 'Closed clients need post-closing care so the relationship becomes a repeat/referral opportunity, not a completed transaction.',
      template,
    }))
  }

  if (stage === 'DNQ' || stage === 'Credit Plan' || lead.status === 'DNQ' || lead.status === 'Credit Plan') {
    return applySavedMessages(buildReturn({
      clientText: `Hey ${firstName}, just checking in. I know the path may take a little time, but I’m still here to help you work toward the goal. If anything has changed with income, credit, debts, or savings, let me know and we can revisit the plan.`,
      agentText: `Hey ${partnerName}, quick update on ${firstName}. They’re not ready just yet, but I’m keeping them on the radar and will continue encouraging the next steps so we can revisit when the timing makes sense.`,
      reason: 'DNQ and credit plan leads need encouragement, realistic checkpoints, and a clear path back to readiness.',
      template,
    }))
  }

  return applySavedMessages(buildReturn({
    clientText: `Hey ${firstName}, just checking in. I wanted to see where things stand and whether there’s anything I can help clarify as you think through your next step.`,
    agentText: `Hey ${partnerName}, quick update on ${firstName}. I’m checking in to see where things stand and will keep you posted if anything changes.`,
    reason: 'This is a general value-based check-in when the lead does not match a more specific stage.',
    template,
  }))
}