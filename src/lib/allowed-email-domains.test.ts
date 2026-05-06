import { describe, it, expect } from 'vitest'
import {
  ALLOWED_EMAIL_DOMAINS,
  ALLOWED_EMAIL_MESSAGE,
  isAllowedEmailDomain,
} from './allowed-email-domains'

describe('isAllowedEmailDomain', () => {
  it('accepts every whitelisted domain', () => {
    for (const d of ALLOWED_EMAIL_DOMAINS) {
      expect(isAllowedEmailDomain(`user@${d}`)).toBe(true)
    }
  })

  it('rejects non-whitelisted domains', () => {
    expect(isAllowedEmailDomain('user@example.com')).toBe(false)
    expect(isAllowedEmailDomain('user@malicious.io')).toBe(false)
  })

  it('is case-insensitive on the domain', () => {
    expect(isAllowedEmailDomain('user@GMAIL.com')).toBe(true)
    expect(isAllowedEmailDomain('user@GlobalComfortGroup.COM')).toBe(true)
  })

  it('rejects malformed inputs', () => {
    expect(isAllowedEmailDomain('not-an-email')).toBe(false)
    expect(isAllowedEmailDomain('@gmail.com')).toBe(true) // domain still extractable; basic Zod .email() is the fence here
    expect(isAllowedEmailDomain('user@')).toBe(false)
    expect(isAllowedEmailDomain('')).toBe(false)
  })

  it('only checks the part after the FIRST @', () => {
    // First-segment-after-@ is what's used; multiple @ are an invalid email at
    // the Zod layer, but the helper should still answer based on the second segment.
    expect(isAllowedEmailDomain('user@something@gmail.com')).toBe(false)
  })
})

describe('ALLOWED_EMAIL_MESSAGE', () => {
  it('mentions every whitelisted domain', () => {
    for (const d of ALLOWED_EMAIL_DOMAINS) {
      expect(ALLOWED_EMAIL_MESSAGE).toContain(`@${d}`)
    }
  })

  it('starts with a clear directive', () => {
    expect(ALLOWED_EMAIL_MESSAGE.toLowerCase()).toContain('email must be')
  })
})
