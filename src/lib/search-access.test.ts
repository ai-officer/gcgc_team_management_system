import { describe, it, expect } from 'vitest'
import { taskAccessWhere } from './search-access'

describe('taskAccessWhere', () => {
  it('returns an empty (unrestricted) clause for admins', () => {
    expect(taskAccessWhere({ id: 'a', role: 'ADMIN' })).toEqual({})
  })
  it('returns the involvement OR-clause for non-admins', () => {
    const w = taskAccessWhere({ id: 'u', role: 'MEMBER' }) as { OR: any[] }
    expect(w.OR).toContainEqual({ assigneeId: 'u' })
    expect(w.OR).toContainEqual({ creatorId: 'u' })
    expect(w.OR).toContainEqual({ teamMembers: { some: { userId: 'u' } } })
    expect(w.OR).toContainEqual({ collaborators: { some: { userId: 'u' } } })
    expect(w.OR).toHaveLength(4)
  })
})
