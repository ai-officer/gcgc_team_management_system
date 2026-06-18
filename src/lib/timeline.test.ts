import { describe, it, expect } from 'vitest'
import { splitScheduled } from './timeline'

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
