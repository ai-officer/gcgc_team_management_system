import { describe, it, expect } from 'vitest'
import { splitScheduled, groupByAssignee } from './timeline'

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
