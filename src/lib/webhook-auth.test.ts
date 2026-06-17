import { describe, it, expect } from 'vitest'
import { isValidChannelToken } from './webhook-auth'

describe('isValidChannelToken', () => {
  it('rejects when the stored channel token does not match the received one', () => {
    expect(isValidChannelToken('attacker-guess', 'real-secret')).toBe(false)
  })

  it('fails closed when no token was stored for the channel', () => {
    expect(isValidChannelToken('anything', null)).toBe(false)
    expect(isValidChannelToken('anything', undefined)).toBe(false)
    expect(isValidChannelToken('anything', '')).toBe(false)
  })

  it('accepts when the received token matches the stored secret', () => {
    expect(isValidChannelToken('real-secret', 'real-secret')).toBe(true)
  })

  it('rejects a missing received token even when one is stored', () => {
    expect(isValidChannelToken(null, 'real-secret')).toBe(false)
    expect(isValidChannelToken('', 'real-secret')).toBe(false)
  })
})
