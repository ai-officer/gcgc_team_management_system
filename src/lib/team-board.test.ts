import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock of the prisma client used by the SUT.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    kanbanBoard: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { resolveTeamBoardLink } from './team-board'

const findUnique = prisma.kanbanBoard.findUnique as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  findUnique.mockReset()
})

describe('resolveTeamBoardLink', () => {
  it('returns both null when neither is provided', async () => {
    const out = await resolveTeamBoardLink({})
    expect(out).toEqual({ boardId: null, teamId: null })
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('derives teamId from a team board', async () => {
    findUnique.mockResolvedValueOnce({ teamId: 'team-1' }) // lookup by board id
    const out = await resolveTeamBoardLink({ boardId: 'board-1' })
    expect(out).toEqual({ boardId: 'board-1', teamId: 'team-1' })
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'board-1' }, select: { teamId: true } })
  })

  it('leaves teamId null for a personal board (no teamId)', async () => {
    findUnique.mockResolvedValueOnce({ teamId: null })
    const out = await resolveTeamBoardLink({ boardId: 'personal-1' })
    expect(out).toEqual({ boardId: 'personal-1', teamId: null })
  })

  it('derives boardId from a teamId', async () => {
    findUnique.mockResolvedValueOnce({ id: 'board-9' }) // lookup by teamId
    const out = await resolveTeamBoardLink({ teamId: 'team-9' })
    expect(out).toEqual({ boardId: 'board-9', teamId: 'team-9' })
    expect(findUnique).toHaveBeenCalledWith({ where: { teamId: 'team-9' }, select: { id: true } })
  })

  it('prefers boardId when both are passed (boardId is canonical from the UI)', async () => {
    findUnique.mockResolvedValueOnce({ teamId: 'team-from-board' })
    const out = await resolveTeamBoardLink({ boardId: 'board-1', teamId: 'ignored' })
    expect(out).toEqual({ boardId: 'board-1', teamId: 'team-from-board' })
  })
})
