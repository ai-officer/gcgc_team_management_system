import { describe, it, expect } from 'vitest'
import { isAuthorizedCronRequest } from './cron-auth'

describe('isAuthorizedCronRequest', () => {
  it('fails closed when no secret is configured', () => {
    expect(isAuthorizedCronRequest('anything', undefined)).toBe(false)
    expect(isAuthorizedCronRequest(null, '')).toBe(false)
  })

  it('accepts a request whose secret matches the configured one', () => {
    expect(isAuthorizedCronRequest('s3cret', 's3cret')).toBe(true)
  })

  it('rejects a mismatched or missing provided secret', () => {
    expect(isAuthorizedCronRequest('wrong', 's3cret')).toBe(false)
    expect(isAuthorizedCronRequest(null, 's3cret')).toBe(false)
    expect(isAuthorizedCronRequest('', 's3cret')).toBe(false)
  })
})
