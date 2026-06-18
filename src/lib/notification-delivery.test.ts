import { describe, it, expect } from 'vitest'
import { plannedDeliveries } from './notification-delivery'

describe('plannedDeliveries', () => {
  it('returns the enabled channels only', () => {
    expect(plannedDeliveries({ emailNotifications: true, pushNotifications: true })).toEqual(['email', 'push'])
    expect(plannedDeliveries({ emailNotifications: true, pushNotifications: false })).toEqual(['email'])
    expect(plannedDeliveries({ emailNotifications: false, pushNotifications: false })).toEqual([])
  })
})
