

function parseLocalDate(dateValue) {
  if (!dateValue) return null

  const date = new Date(`${dateValue}T12:00:00`)
  date.setHours(0, 0, 0, 0)
  return date
}

function todayDate() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function isFollowUpDue(lead) {
  const nextActionDate = parseLocalDate(lead.nextActionDate)
  if (!nextActionDate) return false

  return nextActionDate <= todayDate()
}

export function getDueLabel(lead) {
  const nextActionDate = parseLocalDate(lead.nextActionDate)
  if (!nextActionDate) return 'No date set'

  const today = todayDate()
  const differenceMs = today.getTime() - nextActionDate.getTime()
  const differenceDays = Math.round(differenceMs / (1000 * 60 * 60 * 24))

  if (differenceDays <= 0) return 'Due today'
  if (differenceDays === 1) return '1 day overdue'
  return `${differenceDays} days overdue`
}

export function getRecommendedTouchType(lead) {
  const leadType = lead.leadType || 'Buyer Lead'
  const stage = lead.stage || 'New Referral'

  if (leadType === 'Agent Prospect') {
    if (stage === 'Target Identified') return 'Text or DM'
    if (stage === 'First Outreach Sent') return 'Text + Call'
    if (stage === 'Conversation Started') return 'Call or Text'
    if (stage === 'Meeting Scheduled') return 'Confirmation Text'
    if (stage === 'Met') return 'Follow-Up Text'
    if (stage === 'Value Follow-Up Sent') return 'Email + Text'
    if (stage === 'Active Relationship') return 'Value Touch'
    if (stage === 'Referral Partner') return 'Relationship Touch'
    if (stage === 'Dormant') return 'Reconnect Text'
    return 'Text or Email'
  }

  if (leadType === 'Referral Partner' || leadType === 'Listing Agent Relationship') {
    if (stage === 'Dormant') return 'Reconnect Text'
    return 'Value Touch'
  }

  if (leadType === 'Past Client') {
    return 'Nurture Text or Email'
  }

  if (stage === 'New Referral') return 'Call + Text'
  if (stage === 'Contact Attempted') return 'Text + Call'
  if (stage === 'Connected, Needs Application') return 'Text'
  if (stage === 'Application Started') return 'Text'
  if (stage === 'Waiting on Docs') return 'Text + Email'
  if (stage === 'Pre-Approved') return 'Text'
  if (stage === 'Home Shopping') return 'Text'
  if (stage === 'Under Contract') return 'Email Update'
  if (stage === 'Conditional Approval') return 'Text + Email'
  if (stage === 'Clear to Close') return 'Text'
  if (stage === 'Credit Plan' || stage === 'DNQ') return 'Encouragement Text'
  if (stage === 'Long-Term Nurture') return 'Nurture Text or Email'
  if (stage === 'Builder Lender' || stage === 'Other Lender') return 'Soft Check-In'

  return 'Text'
}

export function getSuggestedMessage(lead) {
  const firstName = (lead.client || 'there').split(' ')[0]
  const leadType = lead.leadType || 'Buyer Lead'
  const stage = lead.stage || 'New Referral'

  if (leadType === 'Agent Prospect') {
    if (stage === 'Target Identified') {
      return `Hey ${firstName}, I wanted to introduce myself. I work with buyers in the Upstate and focus heavily on clarity, strategy, and communication throughout the mortgage process. I would love to connect sometime soon.`
    }

    if (stage === 'First Outreach Sent') {
      return `Hey ${firstName}, I wanted to follow up from my note the other day. I would love to grab coffee sometime and show you the strategy updates I send clients and agents during the process. I think you would appreciate how much clarity it gives everyone involved.`
    }

    if (stage === 'Meeting Scheduled') {
      return `Hey ${firstName}, just confirming we are still good for our meeting. Looking forward to connecting.`
    }

    if (stage === 'Met') {
      return `Hey ${firstName}, I really enjoyed connecting. I appreciate your time and would love to stay in touch. I will send over a quick example of the strategy communication I was talking about.`
    }

    if (stage === 'Dormant') {
      return `Hey ${firstName}, I know it has been a little while. I wanted to reconnect and see how things are going in your business. Would love to catch up soon.`
    }

    return `Hey ${firstName}, I wanted to follow up and keep the conversation going. I think there could be a good opportunity for us to connect and share value.`
  }

  if (leadType === 'Referral Partner' || leadType === 'Listing Agent Relationship') {
    return `Hey ${firstName}, I wanted to send a quick value touch and check in. Anything you are seeing with buyers right now that would be helpful for me to know?`
  }

  if (leadType === 'Past Client') {
    return `Hey ${firstName}, just checking in. Hope you are doing well. If anything has changed with your home, finances, or long-term plans, I am always happy to be a resource.`
  }

  if (stage === 'New Referral') {
    return `Hey ${firstName}, this is Brian McIntosh. I was given your information as someone who may be looking into financing options. I wanted to introduce myself and see how I can help give you some clarity.`
  }

  if (stage === 'Contact Attempted') {
    return `Hey ${firstName}, I wanted to follow up and make sure you saw my note. No pressure at all. My goal is just to help you understand what is possible and what the numbers could look like.`
  }

  if (stage === 'Connected, Needs Application') {
    return `Hey ${firstName}, good connecting with you. The next best step is getting the application started so I can give you real clarity on payment, cash to close, and your options.`
  }

  if (stage === 'Application Started') {
    return `Hey ${firstName}, I saw the application is started. Let me know if you hit any questions. Once it is submitted, I can start reviewing everything and give you a clearer picture.`
  }

  if (stage === 'Waiting on Docs') {
    return `Hey ${firstName}, just checking in on the remaining documents. Once I have those, I can keep the file moving and give you a cleaner update on where things stand.`
  }

  if (stage === 'Pre-Approved' || stage === 'Home Shopping') {
    return `Hey ${firstName}, just checking in on the home search. If you find something you like, send it my way and I can help you look at payment, cash to close, and strategy before you write an offer.`
  }

  if (stage === 'Under Contract' || stage === 'Conditional Approval') {
    return `Hey ${firstName}, quick check-in on the file. I am keeping an eye on the next milestone and will let you know if I need anything from you.`
  }

  if (stage === 'Credit Plan' || stage === 'DNQ') {
    return `Hey ${firstName}, just checking in. I know this process can feel frustrating, but the goal is progress. Let me know if anything has changed or if you want to revisit the plan.`
  }

  if (stage === 'Long-Term Nurture') {
    return `Hey ${firstName}, just wanted to check in. Timing changes, markets change, and life changes. If buying is still something you want to revisit at some point, I am happy to help you think through the next step.`
  }

  if (stage === 'Builder Lender') {
    return `Hey ${firstName}, I know the builder lender may be part of the equation. I am still happy to be a second set of eyes if you want help comparing options or understanding the numbers.`
  }

  return `Hey ${firstName}, just wanted to check in and see how things are going. Let me know how I can help from here.`
}

export function getTodaysFollowUps(leads) {
  return leads
    .filter((lead) => !lead.archived)
    .filter(isFollowUpDue)
    .map((lead) => ({
      ...lead,
      dueLabel: getDueLabel(lead),
      recommendedTouchType: getRecommendedTouchType(lead),
      suggestedMessage: getSuggestedMessage(lead),
    }))
}