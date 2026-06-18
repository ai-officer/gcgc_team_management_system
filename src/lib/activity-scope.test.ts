import { describe, it, expect } from 'vitest'
import { activityScopeUserIds } from './activity-scope'

describe('activityScopeUserIds', () => {
  it('returns null (all) for admins', () => {
    expect(activityScopeUserIds({ id: 'a', role: 'ADMIN' }, ['x'])).toBeNull()
  })
  it('returns self + direct reports for a leader', () => {
    expect(activityScopeUserIds({ id: 'L', role: 'LEADER' }, ['m1', 'm2'])).toEqual(['L', 'm1', 'm2'])
  })
  it('returns just self for a member, deduped', () => {
    expect(activityScopeUserIds({ id: 'u', role: 'MEMBER' }, ['u'])).toEqual(['u'])
  })
})
