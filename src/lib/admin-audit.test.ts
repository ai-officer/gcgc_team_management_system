import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdminActionType, AdminActionStatus } from '@prisma/client'

// Mock the prisma module BEFORE importing the SUT — vitest hoists vi.mock calls,
// so the mock state has to live inside vi.hoisted() to be available at hoist time.
const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { adminActivity: { create } },
}))

import { logAdminAction } from './admin-audit'

function makeReq(headers: Record<string, string>): { headers: Headers } {
  return { headers: new Headers(headers) }
}

describe('logAdminAction', () => {
  beforeEach(() => {
    create.mockReset()
    create.mockResolvedValue({ id: 'fake' })
  })

  it('writes a record with the provided action and description', async () => {
    await logAdminAction({
      request: makeReq({ 'user-agent': 'jest', 'x-forwarded-for': '1.2.3.4' }) as unknown as Parameters<typeof logAdminAction>[0]['request'],
      action: AdminActionType.ADMIN_LOGIN,
      description: 'admin signed in',
      adminId: 'admin-1',
      adminUsername: 'root',
    })

    expect(create).toHaveBeenCalledTimes(1)
    const arg = create.mock.calls[0][0]
    expect(arg.data.action).toBe(AdminActionType.ADMIN_LOGIN)
    expect(arg.data.description).toBe('admin signed in')
    expect(arg.data.adminId).toBe('admin-1')
    expect(arg.data.adminUsername).toBe('root')
  })

  it('captures IP from x-forwarded-for and user-agent header', async () => {
    await logAdminAction({
      request: makeReq({ 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '203.0.113.5' }) as unknown as Parameters<typeof logAdminAction>[0]['request'],
      action: AdminActionType.USER_DEACTIVATED,
      description: 'deactivated user',
    })
    const arg = create.mock.calls[0][0]
    expect(arg.data.ipAddress).toBe('203.0.113.5')
    expect(arg.data.userAgent).toBe('Mozilla/5.0')
  })

  it('defaults status to SUCCESS', async () => {
    await logAdminAction({
      request: makeReq({}) as unknown as Parameters<typeof logAdminAction>[0]['request'],
      action: AdminActionType.ADMIN_LOGIN,
      description: 'x',
    })
    expect(create.mock.calls[0][0].data.status).toBe(AdminActionStatus.SUCCESS)
  })

  it('honours an explicit FAILURE status', async () => {
    await logAdminAction({
      request: makeReq({}) as unknown as Parameters<typeof logAdminAction>[0]['request'],
      action: AdminActionType.ADMIN_LOGIN_FAILED,
      description: 'bad password',
      status: AdminActionStatus.FAILURE,
    })
    expect(create.mock.calls[0][0].data.status).toBe(AdminActionStatus.FAILURE)
  })

  it('swallows DB errors so the user-facing action is not blocked', async () => {
    create.mockRejectedValueOnce(new Error('boom'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      logAdminAction({
        request: makeReq({}) as unknown as Parameters<typeof logAdminAction>[0]['request'],
        action: AdminActionType.ADMIN_LOGIN,
        description: 'x',
      })
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('persists structured metadata as JSON', async () => {
    await logAdminAction({
      request: makeReq({}) as unknown as Parameters<typeof logAdminAction>[0]['request'],
      action: AdminActionType.USER_ROLE_CHANGED,
      description: 'role changed',
      metadata: { from: 'MEMBER', to: 'LEADER' },
    })
    expect(create.mock.calls[0][0].data.metadata).toEqual({ from: 'MEMBER', to: 'LEADER' })
  })
})
