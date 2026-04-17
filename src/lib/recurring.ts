export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

const MAX_INSTANCES = 365
// Sentinel: when no end date is given, cap generation at this many years ahead
const INDEFINITE_YEARS_AHEAD = 10

/**
 * Generate all occurrence dates for a recurring series.
 * If endDate is null/undefined, generates up to MAX_INSTANCES occurrences
 * starting from startDate (series continues indefinitely).
 */
export function generateOccurrenceDates(
  startDate: Date,
  endDate: Date | null | undefined,
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = []
): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  // Use far-future sentinel when no end date
  const effectiveEnd = endDate
    ? new Date(endDate)
    : new Date(startDate.getFullYear() + INDEFINITE_YEARS_AHEAD, startDate.getMonth(), startDate.getDate())
  effectiveEnd.setHours(23, 59, 59, 999)

  while (current <= effectiveEnd && dates.length < MAX_INSTANCES) {
    if (frequency === 'WEEKLY' && daysOfWeek.length > 0) {
      const weekStart = new Date(current)
      for (let d = 0; d < 7 && dates.length < MAX_INSTANCES; d++) {
        const candidate = new Date(weekStart)
        candidate.setDate(weekStart.getDate() + d)
        if (candidate > effectiveEnd) break
        if (daysOfWeek.includes(candidate.getDay())) {
          dates.push(new Date(candidate))
        }
      }
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
 * Returns the next occurrence date after `referenceDate`.
 * When recurringEndDate is null, the series is indefinite — compute next
 * occurrence directly from the frequency rather than scanning a full list.
 */
export function getNextOccurrenceDate(
  seriesStartDate: Date,
  recurringEndDate: Date | null | undefined,
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = [],
  referenceDate: Date
): Date | null {
  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)

  // Check series expiry
  if (recurringEndDate) {
    const end = new Date(recurringEndDate)
    end.setHours(23, 59, 59, 999)

    const allDates = generateOccurrenceDates(
      seriesStartDate, recurringEndDate, frequency, interval, daysOfWeek
    )
    const currentIndex = allDates.findIndex(d => d.getTime() === ref.getTime())
    if (currentIndex === -1 || currentIndex === allDates.length - 1) return null
    // Also check the next date is within end
    const next = allDates[currentIndex + 1]
    return next && next <= end ? next : null
  }

  // Indefinite series — compute next occurrence directly
  if (frequency === 'WEEKLY' && daysOfWeek.length > 0) {
    // Find the next matching day-of-week after ref
    const candidate = new Date(ref)
    candidate.setDate(candidate.getDate() + 1)
    for (let i = 0; i < 7 * interval + 7; i++) {
      if (daysOfWeek.includes(candidate.getDay())) {
        // Make sure we are at least `interval` weeks ahead if this is not the
        // immediate next matching day within the current week cycle
        return new Date(candidate)
      }
      candidate.setDate(candidate.getDate() + 1)
    }
    return null
  }

  const next = new Date(ref)
  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + interval)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7 * interval)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval)
      break
  }
  return next
}

/**
 * Build an RRULE string for Google Calendar compatibility.
 */
export function buildRRuleString(
  frequency: RecurringFrequency,
  interval: number = 1,
  daysOfWeek: number[] = [],
  endDate?: Date | null
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
 * Human-readable description, e.g. "Daily" or "Every 2 weeks on Mon, Fri until Apr 15, 2026"
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
  } else {
    desc += ' (no end date)'
  }

  return desc
}
