import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  IMPERSONATION_MARKER_COOKIE,
  IMPERSONATION_MAX_AGE_SECONDS,
  getNextAuthSessionCookieName,
} from './impersonation'

describe('impersonation constants', () => {
  it('uses the documented marker cookie name', () => {
    expect(IMPERSONATION_MARKER_COOKIE).toBe('impersonating-user')
  })

  it('caps impersonation at 30 minutes', () => {
    expect(IMPERSONATION_MAX_AGE_SECONDS).toBe(30 * 60)
  })
})

describe('getNextAuthSessionCookieName', () => {
  const original = process.env.NEXTAUTH_URL

  afterEach(() => {
    if (original === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = original
  })

  it('uses the __Secure- prefix when NEXTAUTH_URL is https', () => {
    process.env.NEXTAUTH_URL = 'https://example.com'
    expect(getNextAuthSessionCookieName()).toBe('__Secure-next-auth.session-token')
  })

  it('omits the prefix when NEXTAUTH_URL is http', () => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    expect(getNextAuthSessionCookieName()).toBe('next-auth.session-token')
  })

  it('omits the prefix when NEXTAUTH_URL is unset', () => {
    delete process.env.NEXTAUTH_URL
    expect(getNextAuthSessionCookieName()).toBe('next-auth.session-token')
  })
})
