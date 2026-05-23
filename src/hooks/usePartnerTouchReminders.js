import { useMemo } from 'react'

function usePartnerTouchReminders(partnerProfiles) {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingCutoff = new Date(today)
    upcomingCutoff.setDate(upcomingCutoff.getDate() + 14)

    const reminders = Object.entries(partnerProfiles)
      .flatMap(([partnerName, profile]) => {
        const touchHistory = profile.touchHistory || []

        return touchHistory
          .filter((touch) => touch.nextTouchDate)
          .map((touch) => {
            const dueDate = new Date(touch.nextTouchDate)
            if (Number.isNaN(dueDate.getTime())) return null
            dueDate.setHours(0, 0, 0, 0)

            return {
              partnerName,
              touchId: touch.id,
              dueDate: touch.nextTouchDate,
              dueTime: dueDate.getTime(),
              isDue: dueDate <= today,
              isUpcoming: dueDate > today && dueDate <= upcomingCutoff,
              nextAction: touch.nextAction || 'Follow up with partner',
              previousTouchType: touch.type,
              previousTouchNote: touch.note,
            }
          })
          .filter(Boolean)
      })
      .sort((a, b) => a.dueTime - b.dueTime)

    return {
      due: reminders.filter((reminder) => reminder.isDue),
      upcoming: reminders.filter((reminder) => reminder.isUpcoming),
    }
  }, [partnerProfiles])
}

export default usePartnerTouchReminders
