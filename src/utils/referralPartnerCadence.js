export const newReferralPartnerCadence = [
  {
    day: 0,
    label: 'Confirm Partnership',
    channel: 'Text or Email',
    action: 'Thank them, confirm you are excited to partner, and ask how they prefer client introductions to happen.',
  },
  {
    day: 2,
    label: 'First Value Touch',
    channel: 'Email',
    action: 'Send one useful resource tied to their business: market note, buyer strategy, open-house idea, or loan scenario they can use.',
  },
  {
    day: 7,
    label: 'Referral Process Check-In',
    channel: 'Call or Text',
    action: 'Clarify the best referral handoff: group text, email intro, 15-minute buyer call, and how you will keep them updated.',
  },
  {
    day: 14,
    label: 'Strategy Meeting',
    channel: 'Coffee or Call',
    action: 'Invite them to compare ideal clients, target neighborhoods, and ways you can help them win more buyer conversations.',
  },
  {
    day: 30,
    label: 'Monthly Value Touch',
    channel: 'Text or Email',
    action: 'Send a practical update they can forward or use with clients: payment strategy, rate context, credit tip, or local market insight.',
  },
  {
    day: 60,
    label: 'Support Offer',
    channel: 'Email',
    action: 'Offer compliant support for an open house, listing, buyer workshop, or co-branded resource with clear cost-split boundaries.',
  },
  {
    day: 90,
    label: 'Relationship Review',
    channel: 'Call or Coffee',
    action: 'Review what is working, ask what would make you easier to refer, and set the ongoing monthly or quarterly relationship rhythm.',
  },
]

export function addDaysToDateKey(dateValue, dayCount) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + dayCount)
  return date.toISOString().slice(0, 10)
}

export function getNewReferralPartnerNextStep(completedDay = 0) {
  return newReferralPartnerCadence.find((step) => step.day > completedDay) || newReferralPartnerCadence[4]
}

export function getNewReferralPartnerNextTouch(completedDay = 0, baseDate = new Date().toISOString().slice(0, 10)) {
  const nextStep = getNewReferralPartnerNextStep(completedDay)

  return {
    nextAction: nextStep.action,
    nextActionDate: addDaysToDateKey(baseDate, Math.max(1, nextStep.day - completedDay)),
    nextCadenceLabel: nextStep.label,
  }
}
