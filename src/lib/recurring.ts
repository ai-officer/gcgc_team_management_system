export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

const MAX_INSTANCES = 365

/**
 * Generate all occurrence dates for a recurring series.
 * Returns at most MAX_INSTANCES dates.
 */
export function generateOccurrenceDates(
  startDate: Date,
  endDate: Date,
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = []
): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)
  // Normalize to midnight
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  while (current <= end && dates.length < MAX_INSTANCES) {
    if (frequency === 'WEEKLY' && daysOfWeek.length > 0) {
      // For weekly with specific days, we advance day by day within the week
      // and emit only matching days, advancing by `interval` weeks
      const weekStart = new Date(current)
      // Advance through the week
      for (let d = 0; d < 7 && dates.length < MAX_INSTANCES; d++) {
        const candidate = new Date(weekStart)
        candidate.setDate(weekStart.getDate() + d)
        if (candidate > end) break
        if (daysOfWeek.includes(candidate.getDay())) {
          dates.push(new Date(candidate))
        }
      }
      // Advance by interval weeks
      current.setDate(current.getDate() + 7 * interval)
    } else {
      dates.push(new Date(current))
      switch (frequency) {
        case 'DAILY':
          current.setDate(current.getDate() + interval)
          break
        case 'WEEKLY':
          current.setDate(current.getDate() + 7 * interval)
          break
        case 'MONTHLY':
          current.setMonth(current.getMonth() + interval)
          break
        case 'YEARLY':
          current.setFullYear(current.getFullYear() + interval)
          break
      }
    }
  }

  return dates
}

/**
 * Returns the next occurrence date after `referenceDate`, or null if none
 * exists within the series. Reuses generateOccurrenceDates for consistency.
 */
export function getNextOccurrenceDate(
  seriesStartDate: Date,
  recurringEndDate: Date,
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = [],
  referenceDate: Date
): Date | null {
  const allDates = generateOccurrenceDates(
    seriesStartDate, recurringEndDate, frequency, interval, daysOfWeek
  )
  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)
  const currentIndex = allDates.findIndex(d => d.getTime() === ref.getTime())
  if (currentIndex === -1 || currentIndex === allDates.length - 1) return null
  return allDates[currentIndex + 1]
}

/**
 * Build an RRULE string for Google Calendar compatibility.
 */
export function buildRRuleString(
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = [],
  endDate?: Date
): string {
  const freqMap: Record<RecurringFrequency, string> = {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
  }

  let rule = `RRULE:FREQ=${freqMap[frequency]}`

  if (interval > 1) {
    rule += `;INTERVAL=${interval}`
  }

  if (frequency === 'WEEKLY' && daysOfWeek.length > 0) {
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
    const byDay = daysOfWeek.map(d => dayNames[d]).join(',')
    rule += `;BYDAY=${byDay}`
  }

  if (endDate) {
    const y = endDate.getFullYear()
    const m = String(endDate.getMonth() + 1).padStart(2, '0')
    const d = String(endDate.getDate()).padStart(2, '0')
    rule += `;UNTIL=${y}${m}${d}T235959Z`
  }

  return rule
}

/**
 * Human-readable description, e.g. "Daily until Mar 5, 2026"
 */
export function describeRecurrence(
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = [],
  endDate?: Date | null
): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const freqLabel =
    interval === 1
      ? frequency.charAt(0) + frequency.slice(1).toLowerCase()
      : `Every ${interval} ${frequency.toLowerCase()}s`

  let desc = freqLabel

  if (frequency === 'WEEKLY' && daysOfWeek.length > 0) {
    desc += ` on ${daysOfWeek.map(d => dayNames[d]).join(', ')}`
  }

  if (endDate) {
    desc += ` until ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return desc
}
