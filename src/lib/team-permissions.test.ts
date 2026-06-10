import { describe, it, expect } from 'vitest'
import {
  isTeamLeaderRole,
  canManageTeam,
  wouldLeaveTeamLeaderless,
} from './team-permissions'

describe('isTeamLeaderRole', () => {
  it('is true only for LEADER', () => {
    expect(isTeamLeaderRole('LEADER')).toBe(true)
    expect(isTeamLeaderRole('MEMBER')).toBe(false)
    expect(isTeamLeaderRole(undefined)).toBe(false)
    expect(isTeamLeaderRole(null)).toBe(false)
  })
})

describe('canManageTeam', () => {
  const members = [
    { userId: 'owner', role: 'LEADER' as const },
    { userId: 'colead', role: 'LEADER' as const },
    { userId: 'mem', role: 'MEMBER' as const },
  ]

  it('allows the recorded owner', () => {
    expect(canManageTeam('owner', { ownerId: 'owner', members })).toBe(true)
  })
  it('allows any LEADER member (equal rights), not just the owner', () => {
    expect(canManageTeam('colead', { ownerId: 'owner', members })).toBe(true)
  })
  it('denies plain members', () => {
    expect(canManageTeam('mem', { ownerId: 'owner', members })).toBe(false)
  })
  it('denies non-members', () => {
    expect(canManageTeam('stranger', { ownerId: 'owner', members })).toBe(false)
  })
  it('treats owner as manager even if ownerId is null but they are a LEADER member', () => {
    expect(canManageTeam('colead', { ownerId: null, members })).toBe(true)
  })
})

describe('wouldLeaveTeamLeaderless', () => {
  const twoLeaders = [
    { userId: 'a', role: 'LEADER' as const },
    { userId: 'b', role: 'LEADER' as const },
    { userId: 'c', role: 'MEMBER' as const },
  ]
  const oneLeader = [
    { userId: 'a', role: 'LEADER' as const },
    { userId: 'c', role: 'MEMBER' as const },
  ]

  it('blocks removing the only leader', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'a', action: 'remove' })).toBe(true)
  })
  it('blocks demoting the only leader', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'a', action: 'setRole', role: 'MEMBER' })).toBe(true)
  })
  it('allows removing one of two leaders', () => {
    expect(wouldLeaveTeamLeaderless(twoLeaders, { userId: 'a', action: 'remove' })).toBe(false)
  })
  it('allows demoting one of two leaders', () => {
    expect(wouldLeaveTeamLeaderless(twoLeaders, { userId: 'a', action: 'setRole', role: 'MEMBER' })).toBe(false)
  })
  it('allows removing a plain member when a leader remains', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'c', action: 'remove' })).toBe(false)
  })
  it('allows promoting a member (still has leaders)', () => {
    expect(wouldLeaveTeamLeaderless(oneLeader, { userId: 'c', action: 'setRole', role: 'LEADER' })).toBe(false)
  })
})
