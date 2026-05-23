export function isPastDue(dateValue) {
  if (!dateValue) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const actionDate = new Date(`${dateValue}T12:00:00`)
  actionDate.setHours(0, 0, 0, 0)

  return actionDate <= today
}

export function addDaysFromToday(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function toDateOnly(dateValue) {
  if (!dateValue) return null

  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null

  date.setHours(0, 0, 0, 0)
  return date
}

function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return null

  const millisecondsPerDay = 1000 * 60 * 60 * 24
  return Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay)
}

function getDaysSince(dateValue) {
  const date = toDateOnly(dateValue)
  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return daysBetween(date, today)
}

function getDaysUntil(dateValue) {
  const date = toDateOnly(dateValue)
  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return daysBetween(today, date)
}

function hasMissingClosingDetails(lead) {
  return !lead.loanAmount || !lead.loanType || !lead.interestRate || !lead.firstPaymentDate
}

function getLeadTouchAge(lead) {
  return getDaysSince(lead.lastTouch || lead.referralDate)
}

function normalizeStage(lead) {
  return lead.stage || lead.status || 'New Referral'
}

function normalizeLeadType(lead) {
  return lead.leadType || 'Buyer Lead'
}

function getPostClosingMilestone(lead) {
  const daysSinceClosing = getDaysSince(lead.closingDate)

  if (daysSinceClosing === null) {
    return {
      nextTouchDays: 30,
      reason: 'Closed client needs a post-closing nurture plan.',
      recommendedAction: 'Schedule the next post-closing relationship touch.',
      recommendedChannel: 'Text',
      summary: 'Cadence: closed client, keep a 30-day relationship touch until a closing date is added.',
    }
  }

  if (daysSinceClosing <= 3) {
    return {
      nextTouchDays: 3,
      reason: 'Newly closed client needs a congratulations message, review request, and WOW follow-up.',
      recommendedAction: 'Send closing congratulations and start the post-closing WOW process.',
      recommendedChannel: 'Text',
      summary: 'Cadence: newly closed client, follow up within 3 days of closing.',
    }
  }

  if (daysSinceClosing <= 30) {
    return {
      nextTouchDays: Math.max(1, 30 - daysSinceClosing),
      reason: 'First payment and post-closing check-in are coming up.',
      recommendedAction: 'Send first payment reminder and ask how settling in is going.',
      recommendedChannel: 'Text',
      summary: 'Cadence: closed client, complete a first-payment check-in around 30 days after closing.',
    }
  }

  if (daysSinceClosing <= 90) {
    return {
      nextTouchDays: Math.max(1, 90 - daysSinceClosing),
      reason: 'Past client is ready for an early homeowner check-in and possible homestead reminder.',
      recommendedAction: 'Send 60 to 90 day homeowner check-in and ask for feedback.',
      recommendedChannel: 'Email',
      summary: 'Cadence: past client, send a 60 to 90 day homeowner check-in.',
    }
  }

  if (daysSinceClosing <= 180) {
    return {
      nextTouchDays: Math.max(1, 180 - daysSinceClosing),
      reason: 'Past client is ready for a relationship touch and soft referral ask.',
      recommendedAction: 'Send a homeowner value touch and soft referral reminder.',
      recommendedChannel: 'Text',
      summary: 'Cadence: past client, send a six-month relationship touch.',
    }
  }

  if (daysSinceClosing <= 365) {
    return {
      nextTouchDays: Math.max(1, 365 - daysSinceClosing),
      reason: 'Past client is approaching their annual mortgage review.',
      recommendedAction: 'Schedule annual mortgage review and home equity check-in.',
      recommendedChannel: 'Email',
      summary: 'Cadence: past client, prepare for annual mortgage review.',
    }
  }

  return {
    nextTouchDays: 90,
    reason: 'Past client should stay in the database nurture system.',
    recommendedAction: 'Send quarterly homeowner value touch and stay top of mind for referrals.',
    recommendedChannel: 'Email',
    summary: 'Cadence: past client, send a quarterly value touch.',
  }
}

export function getLeadFollowUpPlan(lead) {
  const leadType = normalizeLeadType(lead)
  const stage = normalizeStage(lead)
  const status = lead.status || stage
  const touchAge = getLeadTouchAge(lead)
  const daysUntilClosing = getDaysUntil(lead.closingDate)
  const hasClosingDatePassed = daysUntilClosing !== null && daysUntilClosing <= 0
  const manualTaskDaysUntil = getDaysUntil(lead.nextActionDate)

  if (lead.manualTaskActive && lead.nextActionDate) {
    const isOverdue = manualTaskDaysUntil !== null && manualTaskDaysUntil < 0
    const isDueToday = manualTaskDaysUntil === 0

    return {
      priority: isOverdue ? 'Urgent' : isDueToday ? 'Due Today' : 'Upcoming',
      reason: 'Manual task is active and overrides the standard follow-up cadence.',
      recommendedAction: lead.nextAction || 'Complete the manual task.',
      recommendedChannel: lead.manualTaskChannel || 'Task',
      nextTouchDate: lead.nextActionDate,
      summary: 'Manual task active; cadence resumes after the task is completed or replaced.',
    }
  }

  if (hasClosingDatePassed && hasMissingClosingDetails(lead)) {
    return {
      priority: 'Urgent',
      reason: 'Closing date has arrived and final loan details are missing.',
      recommendedAction: 'Add final loan amount, loan type, interest rate, first payment date, and second lien details if applicable.',
      recommendedChannel: 'CRM Update',
      nextTouchDate: addDaysFromToday(0),
      summary: 'Cadence: closing reached, complete final loan details today.',
    }
  }

  if (leadType === 'Agent Prospect') {
    if (stage === 'Target Identified') {
      return {
        priority: touchAge === null || touchAge >= 1 ? 'Due Today' : 'On Track',
        reason: 'New agent target needs fast first outreach.',
        recommendedAction: 'Call or text with a simple value-based reason to connect.',
        recommendedChannel: 'Call',
        nextTouchDate: addDaysFromToday(1),
        summary: 'Cadence: new agent target, touch again tomorrow.',
      }
    }

    if (stage === 'First Outreach Sent' || stage === 'Conversation Started') {
      return {
        priority: touchAge !== null && touchAge >= 3 ? 'Due Today' : 'Upcoming',
        reason: 'Agent prospect needs follow-up while the conversation is still warm.',
        recommendedAction: 'Follow up with a useful idea, market insight, or invitation to meet.',
        recommendedChannel: 'Text',
        nextTouchDate: addDaysFromToday(3),
        summary: 'Cadence: agent prospect, follow up in 3 days.',
      }
    }

    if (stage === 'Meeting Scheduled') {
      return {
        priority: 'Upcoming',
        reason: 'Meeting should be confirmed before it happens.',
        recommendedAction: 'Confirm the meeting and send a simple agenda.',
        recommendedChannel: 'Text',
        nextTouchDate: addDaysFromToday(1),
        summary: 'Cadence: meeting scheduled, confirm the day before.',
      }
    }

    if (stage === 'Met') {
      return {
        priority: touchAge === null || touchAge >= 1 ? 'Due Today' : 'On Track',
        reason: 'Agent meeting needs quick follow-up to create momentum.',
        recommendedAction: 'Send thank-you note and one specific next step.',
        recommendedChannel: 'Email',
        nextTouchDate: addDaysFromToday(1),
        summary: 'Cadence: meeting completed, follow up within 24 hours.',
      }
    }

    return {
      priority: touchAge !== null && touchAge >= 30 ? 'Due Today' : 'Upcoming',
      reason: 'Agent relationship needs consistent value touches.',
      recommendedAction: 'Send a useful market update, client strategy idea, or lunch invitation.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(30),
      summary: 'Cadence: agent relationship, keep a monthly value touch.',
    }
  }

  if (leadType === 'Referral Partner' || leadType === 'Listing Agent Relationship') {
    return {
      priority: touchAge !== null && touchAge >= 30 ? 'Due Today' : 'Upcoming',
      reason: 'Referral relationship needs consistent relationship maintenance.',
      recommendedAction: 'Send a value touch, market note, or invite them to coffee or lunch.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(30),
      summary: 'Cadence: referral partner, keep a monthly relationship touch.',
    }
  }

  if (leadType === 'Past Client' || stage === 'Closed' || stage === 'Post Closing') {
    const milestone = getPostClosingMilestone(lead)
    return {
      priority: touchAge !== null && touchAge >= milestone.nextTouchDays ? 'Due Today' : 'Upcoming',
      reason: milestone.reason,
      recommendedAction: milestone.recommendedAction,
      recommendedChannel: milestone.recommendedChannel,
      nextTouchDate: addDaysFromToday(milestone.nextTouchDays),
      summary: milestone.summary,
    }
  }

  if (stage === 'New Lead' || stage === 'New Referral') {
    return {
      priority: touchAge === null || touchAge >= 1 ? 'Urgent' : 'On Track',
      reason: 'New lead needs immediate contact while the referral is fresh.',
      recommendedAction: 'Call first, then send intro text and update the referral partner.',
      recommendedChannel: 'Call',
      nextTouchDate: addDaysFromToday(1),
      summary: 'Cadence: new buyer lead, call today and touch again tomorrow if needed.',
    }
  }

  if (stage === 'Attempted to Connect' || stage === 'Contact Attempted') {
    return {
      priority: touchAge !== null && touchAge >= 1 ? 'Due Today' : 'On Track',
      reason: 'No connection yet. Early attempts should stay tight and consistent.',
      recommendedAction: 'Call again, send a short text, and let the referral partner know you are trying to connect.',
      recommendedChannel: 'Call + Text',
      nextTouchDate: addDaysFromToday(1),
      summary: 'Cadence: no connection yet, follow up tomorrow.',
    }
  }

  if (stage === 'Connected' || stage === 'Connected, Needs Application' || status === 'Needs Application') {
    return {
      priority: touchAge !== null && touchAge >= 2 ? 'Due Today' : 'Upcoming',
      reason: 'Connected borrower needs to complete the application before momentum fades.',
      recommendedAction: 'Check on the application, remove friction, and explain the next step.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(2),
      summary: 'Cadence: connected buyer lead, follow up in 2 days.',
    }
  }

  if (stage === 'Application Started') {
    return {
      priority: touchAge !== null && touchAge >= 2 ? 'Due Today' : 'Upcoming',
      reason: 'Started application needs completion support.',
      recommendedAction: 'Help them finish the application and answer any questions.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(2),
      summary: 'Cadence: application started, follow up in 2 days.',
    }
  }

  if (stage === 'Docs Submitted' || stage === 'Documentation' || stage === 'Waiting on Docs') {
    return {
      priority: touchAge !== null && touchAge >= 2 ? 'Due Today' : 'Upcoming',
      reason: 'Documentation stage is a high-friction point and needs close follow-up.',
      recommendedAction: 'Send a clear missing-docs reminder and explain why the items matter.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(2),
      summary: 'Cadence: waiting on docs, follow up in 2 days.',
    }
  }

  if (stage === 'Financing Strategy') {
    return {
      priority: touchAge !== null && touchAge >= 3 ? 'Due Today' : 'Upcoming',
      reason: 'Borrower needs clarity before moving forward.',
      recommendedAction: 'Send or review the strategy options and schedule a quick call if needed.',
      recommendedChannel: 'Email',
      nextTouchDate: addDaysFromToday(3),
      summary: 'Cadence: strategy conversation in progress, follow up in 3 days.',
    }
  }

  if (stage === 'Pre-Approved') {
    return {
      priority: touchAge !== null && touchAge >= 7 ? 'Due Today' : 'Upcoming',
      reason: 'Pre-approved buyers need weekly coaching so they do not drift or get surprised by payment changes.',
      recommendedAction: 'Send shopping check-in and offer to review payment and cash to close on any homes they like.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(7),
      summary: 'Cadence: pre-approved buyer, follow up weekly.',
    }
  }

  if (stage === 'Shopping' || stage === 'Home Shopping') {
    return {
      priority: touchAge !== null && touchAge >= 7 ? 'Due Today' : 'Upcoming',
      reason: 'Active shopper needs weekly payment strategy and offer support.',
      recommendedAction: 'Ask if any homes caught their eye and offer to run numbers before they write an offer.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(7),
      summary: 'Cadence: active shopper, follow up weekly.',
    }
  }

  if (stage === 'Under Contract' || stage === 'Contract to Close') {
    const nextTouchDays = daysUntilClosing !== null && daysUntilClosing <= 10 ? 2 : 3

    return {
      priority: touchAge !== null && touchAge >= nextTouchDays ? 'Due Today' : 'Upcoming',
      reason: daysUntilClosing !== null && daysUntilClosing <= 10 ? 'Closing is within 10 days and the file needs tight communication.' : 'Under contract files need proactive status updates.',
      recommendedAction: 'Send transaction status update and confirm the next milestone.',
      recommendedChannel: 'Email',
      nextTouchDate: addDaysFromToday(nextTouchDays),
      summary: daysUntilClosing !== null && daysUntilClosing <= 10 ? 'Cadence: closing soon, follow up every 2 days.' : 'Cadence: under contract, follow up every 3 business days.',
    }
  }

  if (stage === 'Conditional Approval') {
    return {
      priority: touchAge !== null && touchAge >= 2 ? 'Due Today' : 'Upcoming',
      reason: 'Conditional approval needs quick condition review and clear ownership of next steps.',
      recommendedAction: 'Review conditions, assign tasks, and update the borrower and agent.',
      recommendedChannel: 'Email',
      nextTouchDate: addDaysFromToday(2),
      summary: 'Cadence: conditional approval, follow up in 2 days.',
    }
  }

  if (stage === 'Clear to Close') {
    return {
      priority: touchAge !== null && touchAge >= 2 ? 'Due Today' : 'Upcoming',
      reason: 'Clear to close needs final closing instructions and cash-to-close confirmation.',
      recommendedAction: 'Confirm closing appointment, CD, cash to close, wire warning, and final expectations.',
      recommendedChannel: 'Text + Email',
      nextTouchDate: addDaysFromToday(2),
      summary: 'Cadence: clear to close, stay tight until closing.',
    }
  }

  if (status === 'Credit Plan' || status === 'DNQ' || stage === 'Credit Plan' || stage === 'DNQ') {
    return {
      priority: touchAge !== null && touchAge >= 30 ? 'Due Today' : 'Upcoming',
      reason: 'Credit plan lead needs encouragement and a realistic next checkpoint.',
      recommendedAction: 'Check progress, reinforce the plan, and ask what has changed since the last review.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(30),
      summary: 'Cadence: credit plan, check in every 30 days.',
    }
  }

  if (status === 'Other Lender' || status === 'Not Interested' || status === 'Dormant' || stage === 'Other Lender' || stage === 'Builder Lender' || stage === 'Not Interested' || stage === 'Dormant') {
    return {
      priority: touchAge !== null && touchAge >= 30 ? 'Due Today' : 'Upcoming',
      reason: 'Low-intent or dormant lead should stay in light nurture.',
      recommendedAction: 'Send a low-pressure value touch and keep the door open.',
      recommendedChannel: 'Text',
      nextTouchDate: addDaysFromToday(30),
      summary: 'Cadence: low-intent lead, re-engage in 30 days.',
    }
  }

  return {
    priority: touchAge !== null && touchAge >= 7 ? 'Due Today' : 'Upcoming',
    reason: 'Lead needs a standard relationship follow-up.',
    recommendedAction: 'Send a helpful check-in and clarify the next step.',
    recommendedChannel: 'Text',
    nextTouchDate: addDaysFromToday(7),
    summary: 'Cadence: standard follow-up, touch again within 7 days.',
  }
}

export function getRecommendedNextTouchDate(lead) {
  return getLeadFollowUpPlan(lead).nextTouchDate
}

export function getCadenceSummary(lead) {
  return getLeadFollowUpPlan(lead).summary
}
