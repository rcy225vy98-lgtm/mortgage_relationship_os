import { useMemo } from 'react'

function useLoanTimingOverview({
  activeLeads,
  calendarMonthOffset,
  parseDateValue,
  toDateKey,
  getUsFederalHolidays,
  countBusinessDaysBetween,
}) {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const visibleMonthDate = new Date(today.getFullYear(), today.getMonth() + calendarMonthOffset, 1)
    const currentYear = visibleMonthDate.getFullYear()
    const currentMonth = visibleMonthDate.getMonth()
    const monthLabel = visibleMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const holidays = getUsFederalHolidays(currentYear)
    const holidayKeys = new Set(holidays.map((holiday) => toDateKey(holiday.date)))

    const closingStages = ['Refi', 'Under Contract', 'Conditional Approval', 'Clear to Close', 'Closed']
    const activeClosingLeads = activeLeads.filter((lead) => lead.leadType !== 'Agent Prospect' && closingStages.includes(lead.stage))

    const holidaysThisMonth = holidays
      .filter((holiday) => holiday.date.getMonth() === currentMonth)
      .map((holiday) => ({
        name: holiday.name,
        date: toDateKey(holiday.date),
      }))

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

    const upcomingClosingsThisMonth = activeClosingLeads
      .filter((lead) => {
        if (!lead.closingDate) return false
        const closingDate = parseDateValue(lead.closingDate)
        if (!closingDate) return false
        return closingDate.getFullYear() === currentYear && closingDate.getMonth() === currentMonth
      })
      .sort((a, b) => new Date(a.closingDate) - new Date(b.closingDate))

    const missingClosingDates = activeClosingLeads.filter((lead) => !lead.closingDate)

    const closingsWithBusinessDayCountdown = activeClosingLeads
      .filter((lead) => lead.closingDate)
      .map((lead) => ({
        ...lead,
        businessDaysToClosing: countBusinessDaysBetween(today, lead.closingDate, holidayKeys),
      }))
      .filter((lead) => lead.businessDaysToClosing !== null)

    const tridAlerts = closingsWithBusinessDayCountdown.filter((lead) => {
      const clearedClosingDates = lead.tridClearedClosingDates || []
      const clearedForThisClosingDate = clearedClosingDates.includes(lead.closingDate) || lead.tridReviewedForClosingDate === lead.closingDate

      return lead.businessDaysToClosing <= 5 && lead.businessDaysToClosing >= 0 && !clearedForThisClosingDate
    })

    const appraisalAlerts = activeClosingLeads
      .map((lead) => {
        const contractDateValue = lead.contractDate || lead.underContractDate || lead.processStartDate || ''
        const contractDate = parseDateValue(contractDateValue)

        if (!contractDate || lead.appraisalOrdered || lead.appraisalReceived) return null

        const businessDaysSinceContract = countBusinessDaysBetween(contractDate, today, holidayKeys)
        if (businessDaysSinceContract === null || businessDaysSinceContract < 5) return null

        return {
          leadId: lead.id,
          client: lead.client,
          type: 'appraisal-not-ordered',
          severity: businessDaysSinceContract >= 7 ? 'danger' : 'warning',
          message: 'Appraisal not confirmed ordered.',
          detail: `${businessDaysSinceContract} business day${businessDaysSinceContract === 1 ? '' : 's'} since contract/file start date.`,
          businessDaysSinceContract,
          contractDate: contractDateValue,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.businessDaysSinceContract - a.businessDaysSinceContract)
    const tenBusinessDayClosings = closingsWithBusinessDayCountdown
      .filter((lead) => lead.businessDaysToClosing <= 10 && lead.businessDaysToClosing >= 0)
      .sort((a, b) => a.businessDaysToClosing - b.businessDaysToClosing)

    const monthCalendarDays = [
      ...Array.from({ length: firstDayOfMonth }, (_, index) => ({
        key: `blank-${index}`,
        isBlank: true,
      })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const dayNumber = index + 1
        const date = new Date(currentYear, currentMonth, dayNumber)
        const dateKey = toDateKey(date)
        const holiday = holidaysThisMonth.find((item) => item.date === dateKey)
        const closings = activeClosingLeads.filter((lead) => toDateKey(lead.closingDate) === dateKey)
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const isToday = dateKey === toDateKey(today)
        const hasTimingRisk = closings.some((lead) => {
          const closingDate = parseDateValue(lead.closingDate)
          if (!closingDate) return false
          const previousDay = new Date(closingDate)
          previousDay.setDate(closingDate.getDate() - 1)
          const nextDay = new Date(closingDate)
          nextDay.setDate(closingDate.getDate() + 1)

          return isWeekend || holidayKeys.has(dateKey) || holidayKeys.has(toDateKey(previousDay)) || holidayKeys.has(toDateKey(nextDay))
        })

        return {
          key: dateKey,
          date: dateKey,
          dayNumber,
          holiday,
          closings,
          isWeekend,
          isToday,
          hasTimingRisk,
        }
      }),
    ]

    return {
      monthLabel,
      holidaysThisMonth,
      monthCalendarDays,
      upcomingClosingsThisMonth,
      missingClosingDates,
      tridAlerts,
      appraisalAlerts,
      tenBusinessDayClosings,
    }
  }, [
    activeLeads,
    calendarMonthOffset,
    parseDateValue,
    toDateKey,
    getUsFederalHolidays,
    countBusinessDaysBetween,
  ])
}

export default useLoanTimingOverview
