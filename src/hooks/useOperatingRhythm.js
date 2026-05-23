

import { useMemo } from 'react'

const DAILY_OPERATING_PRINCIPLES = [
  'Win the follow-up before you chase the next lead. The business grows when the right relationships feel consistently cared for.',
  'Clarity compounds. One clear next step for every client and every partner is how momentum stays alive.',
  'Protect the relationships that already trust you. New opportunities are easier to create when current ones are handled with excellence.',
  'The best loan officers do not just react to the pipeline. They direct it, prioritize it, and communicate before people have to ask.',
  'Every touch is a trust deposit. Make the next one useful, specific, and easy to respond to.',
  'Today is not about doing everything. It is about doing the highest-leverage things before they become urgent.',
  'Referral partners remember how you make them feel during small moments. Be consistent before you need something.',
  'A strong business is built through simple actions repeated with discipline: follow up, add value, document, and move the ball forward.',
  'Speed matters, but clarity wins. The goal is not just to respond fast, it is to make the next step obvious.',
  'Do not let warm relationships go cold. A thoughtful value touch today can create tomorrow’s opportunity.',
]

const WEEKLY_OPERATING_RHYTHM = {
  1: {
    day: 'Monday',
    theme: 'Referral Partner Follow-Up',
    action: 'Reconnect with referral partners, review active relationships, and make sure no key partner goes cold.',
  },
  2: {
    day: 'Tuesday',
    theme: 'Status Updates',
    action: 'Send current loan file updates to buyers, agents, listing agents, and key transaction parties.',
  },
  3: {
    day: 'Wednesday',
    theme: 'Lead Follow-Ups',
    action: 'Work new leads, stale leads, application-started clients, and anyone needing a clear next step.',
  },
  4: {
    day: 'Thursday',
    theme: 'Database Day',
    action: 'Review past clients, closed clients, annual reviews, refinance opportunities, and long-term nurture.',
  },
  5: {
    day: 'Friday',
    theme: 'Pre-Approval Updates',
    action: 'Review active pre-approvals, update numbers if needed, check search status, and create weekend readiness.',
  },
}

function useOperatingRhythm() {
  const dailyOperatingPrinciple = useMemo(() => {
    const today = new Date()
    const dayKey = Math.floor(today.getTime() / 86400000)
    return DAILY_OPERATING_PRINCIPLES[dayKey % DAILY_OPERATING_PRINCIPLES.length]
  }, [])

  const weeklyOperatingRhythm = useMemo(() => {
    const today = new Date()
    const weekday = today.getDay()

    return WEEKLY_OPERATING_RHYTHM[weekday] || {
      day: 'Weekend',
      theme: 'Reset + Review',
      action: 'Review the week, note loose ends, and prepare your highest-leverage priorities for Monday.',
    }
  }, [])

  return {
    dailyOperatingPrinciple,
    weeklyOperatingRhythm,
  }
}

export default useOperatingRhythm