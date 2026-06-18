import { describe, it, expect } from 'vitest'
import { splitScheduled, groupByAssignee, buildAxis, barGeometry, axisRangeFor, pxDeltaToDays, shiftDates, resizeStart, resizeEnd, scheduleAtPx } from './timeline'
import { differenceInCalendarDays } from 'date-fns'

const dayOf = (iso: string) => iso.slice(0, 10)

describe('pxDeltaToDays', () => {
  it('rounds a pixel delta to whole days using the axis day width', () => {
    const axis = buildAxis(new Date('2026-06-01'), new Date('2026-06-30'), 'month', 16) // dayWidthPx 16
    expect(pxDeltaToDays(50, axis)).toBe(3)   // 50/16 = 3.125 -> 3
    expect(pxDeltaToDays(-40, axis)).toBe(-3) // -40/16 = -2.5 -> -3 (round half away)
    expect(pxDeltaToDays(7, axis)).toBe(0)
  })
})

describe('shiftDates', () => {
  it('shifts both dates by deltaDays, preserving duration', () => {
    const r = shiftDates('2026-06-03', '2026-06-07', 2)
    expect(dayOf(r.startDate)).toBe('2026-06-05')
    expect(dayOf(r.dueDate)).toBe('2026-06-09')
  })
})

describe('resizeStart', () => {
  it('moves the start date by deltaDays', () => {
    const r = resizeStart('2026-06-03', '2026-06-07', 2)
    expect(dayOf(r.startDate)).toBe('2026-06-05')
    expect(dayOf(r.dueDate)).toBe('2026-06-07')
  })
  it('clamps start to not pass the due date', () => {
    const r = resizeStart('2026-06-03', '2026-06-07', 10)
    expect(dayOf(r.startDate)).toBe('2026-06-07')
    expect(dayOf(r.dueDate)).toBe('2026-06-07')
  })
})

describe('resizeEnd', () => {
  it('moves the due date by deltaDays', () => {
    const r = resizeEnd('2026-06-03', '2026-06-07', 3)
    expect(dayOf(r.startDate)).toBe('2026-06-03')
    expect(dayOf(r.dueDate)).toBe('2026-06-10')
  })
  it('clamps due to not precede the start date', () => {
    const r = resizeEnd('2026-06-03', '2026-06-07', -10)
    expect(dayOf(r.startDate)).toBe('2026-06-03')
    expect(dayOf(r.dueDate)).toBe('2026-06-03')
  })
})

describe('scheduleAtPx', () => {
  it('schedules a 1-day task at the dropped pixel column', () => {
    const axis = buildAxis(new Date('2026-06-01'), new Date('2026-06-30'), 'month', 16) // dayWidth 16
    const r = scheduleAtPx(2 * 16 + 3, axis) // ~day index 2 -> Jun 3
    expect(dayOf(r.startDate)).toBe('2026-06-03')
    expect(dayOf(r.dueDate)).toBe('2026-06-04')
  })
  it('clamps a drop left of the grid to the first day', () => {
    const axis = buildAxis(new Date('2026-06-01'), new Date('2026-06-30'), 'month', 16)
    const r = scheduleAtPx(-50, axis)
    expect(dayOf(r.startDate)).toBe('2026-06-01')
    expect(dayOf(r.dueDate)).toBe('2026-06-02')
  })
})

describe('splitScheduled', () => {
  it('puts tasks with both start and due in scheduled, the rest in unscheduled', () => {
    const tasks = [
      { id: 'a', startDate: '2026-06-01', dueDate: '2026-06-05' },
      { id: 'b', startDate: '2026-06-01', dueDate: null },
      { id: 'c', startDate: null, dueDate: null },
    ]
    const { scheduled, unscheduled } = splitScheduled(tasks)
    expect(scheduled.map(t => t.id)).toEqual(['a'])
    expect(unscheduled.map(t => t.id)).toEqual(['b', 'c'])
  })
})

describe('groupByAssignee', () => {
  it('groups by assignee sorted by name, unassigned last', () => {
    const alice = { id: 'u1', name: 'Alice', email: 'a@x.com' }
    const bob = { id: 'u2', name: 'Bob', email: 'b@x.com' }
    const tasks = [
      { id: 't1', assignee: bob },
      { id: 't2', assignee: alice },
      { id: 't3', assignee: null },
      { id: 't4', assignee: alice },
    ]
    const groups = groupByAssignee(tasks)
    expect(groups.map(g => g.label)).toEqual(['Alice', 'Bob', 'Unassigned'])
    expect(groups[0].tasks.map(t => t.id)).toEqual(['t2', 't4'])
    expect(groups[2].key).toBe('unassigned')
  })
})

describe('buildAxis + barGeometry', () => {
  it('lays out days and positions a bar within the axis', () => {
    const axis = buildAxis(new Date('2026-06-01'), new Date('2026-06-30'), 'month', 16)
    expect(axis.dayWidthPx).toBe(16)
    expect(axis.totalWidthPx).toBe(30 * 16) // 30 inclusive days
    expect(axis.months[0].label).toMatch(/Jun/)

    const bar = barGeometry('2026-06-03', '2026-06-07', axis)
    expect(bar.leftPx).toBe(2 * 16)   // Jun 1 -> Jun 3 = 2 days
    expect(bar.widthPx).toBe(5 * 16)  // Jun 3..7 inclusive = 5 days
  })

  it('exposes a per-day track and honors a day-width override', () => {
    const axis = buildAxis(new Date('2026-06-01'), new Date('2026-06-30'), 'month', 30)
    expect(axis.dayWidthPx).toBe(30)
    expect(axis.totalWidthPx).toBe(30 * 30)
    expect(axis.days).toHaveLength(30)
    expect(axis.days[0].dayNum).toBe(1)
    expect(axis.days[0].leftPx).toBe(0)
    expect(axis.days[1].leftPx).toBe(30)
  })
})

describe('axisRangeFor', () => {
  it('pads around the min start and max due', () => {
    const today = new Date('2026-06-15')
    const { start, end } = axisRangeFor(
      [{ startDate: '2026-06-10', dueDate: '2026-06-20' }], today, { pastDays: 3, futureDays: 7 }
    )
    expect(differenceInCalendarDays(new Date('2026-06-10'), start)).toBe(3) // 3 days pad before
    expect(differenceInCalendarDays(end, new Date('2026-06-20'))).toBe(7)   // 7 days pad after
  })

  it('uses default past/future padding around today when no dates', () => {
    const today = new Date('2026-06-15')
    const { start, end } = axisRangeFor([], today)
    expect(differenceInCalendarDays(today, start)).toBe(7)   // default pastDays
    expect(differenceInCalendarDays(end, today)).toBe(30)    // default futureDays
  })
})
