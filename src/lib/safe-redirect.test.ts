import { describe, it, expect } from 'vitest'
import { resolveSafeCallbackUrl } from './safe-redirect'

describe('resolveSafeCallbackUrl', () => {
  it('rejects a callbackUrl on a non-allowlisted host (open-redirect guard)', () => {
    expect(resolveSafeCallbackUrl('https://evil.com/steal')).toBeNull()
  })

  it('accepts a callbackUrl on an allowlisted host', () => {
    const result = resolveSafeCallbackUrl('https://tms-chat.hotelsogo-ai.com/auth?x=1')
    expect(result).not.toBeNull()
    expect(result?.origin).toBe('https://tms-chat.hotelsogo-ai.com')
  })

  it('returns null for missing callbackUrl', () => {
    expect(resolveSafeCallbackUrl(null)).toBeNull()
    expect(resolveSafeCallbackUrl(undefined)).toBeNull()
    expect(resolveSafeCallbackUrl('')).toBeNull()
  })

  it('returns null for a malformed / non-absolute URL', () => {
    expect(resolveSafeCallbackUrl('/relative/path')).toBeNull()
    expect(resolveSafeCallbackUrl('not a url')).toBeNull()
  })

  it('rejects a look-alike host that merely embeds an allowlisted host', () => {
    expect(
      resolveSafeCallbackUrl('https://tms-chat.hotelsogo-ai.com.evil.com/x')
    ).toBeNull()
    expect(
      resolveSafeCallbackUrl('https://evil.com/tms-chat.hotelsogo-ai.com')
    ).toBeNull()
  })
})
