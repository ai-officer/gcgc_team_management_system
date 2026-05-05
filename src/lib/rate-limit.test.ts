import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, clearRateLimit, getClientIp } from './rate-limit'

// rate-limit.ts uses a module-level Map. To keep tests independent we generate
// a fresh key per test instead of trying to reach into the module.

describe('rateLimit', () => {
  const opts = { windowMs: 1000, max: 3 }

  beforeEach(() => {
    vi.useRealTimers()
  })

  it('allows the first call and decrements remaining', () => {
    const key = `t:${Math.random()}`
    const r = rateLimit(key, opts)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
    expect(r.retryAfterSeconds).toBe(0)
  })

  it('allows up to `max` calls within a window', () => {
    const key = `t:${Math.random()}`
    expect(rateLimit(key, opts).allowed).toBe(true)
    expect(rateLimit(key, opts).allowed).toBe(true)
    expect(rateLimit(key, opts).allowed).toBe(true)
    const blocked = rateLimit(key, opts)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.remaining).toBe(0)
  })

  it('resets after the window elapses', () => {
    const key = `t:${Math.random()}`
    vi.useFakeTimers()
    vi.setSystemTime(0)
    rateLimit(key, opts)
    rateLimit(key, opts)
    rateLimit(key, opts)
    expect(rateLimit(key, opts).allowed).toBe(false)

    vi.setSystemTime(opts.windowMs + 1)
    expect(rateLimit(key, opts).allowed).toBe(true)
    vi.useRealTimers()
  })

  it('isolates buckets per key', () => {
    const a = `a:${Math.random()}`
    const b = `b:${Math.random()}`
    rateLimit(a, opts)
    rateLimit(a, opts)
    rateLimit(a, opts)
    expect(rateLimit(a, opts).allowed).toBe(false)
    expect(rateLimit(b, opts).allowed).toBe(true) // separate bucket
  })

  it('clearRateLimit drops the bucket so the user is not locked out after success', () => {
    const key = `t:${Math.random()}`
    rateLimit(key, opts)
    rateLimit(key, opts)
    rateLimit(key, opts)
    expect(rateLimit(key, opts).allowed).toBe(false)
    clearRateLimit(key)
    expect(rateLimit(key, opts).allowed).toBe(true)
  })
})

describe('getClientIp', () => {
  function makeReq(headers: Record<string, string>): { headers: Headers } {
    return { headers: new Headers(headers) }
  }

  it('returns the first IP in x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.10, 70.41.3.18, 150.172.238.178' })
    expect(getClientIp(req as unknown as Parameters<typeof getClientIp>[0])).toBe('203.0.113.10')
  })

  it('falls back to x-real-ip', () => {
    const req = makeReq({ 'x-real-ip': '203.0.113.20' })
    expect(getClientIp(req as unknown as Parameters<typeof getClientIp>[0])).toBe('203.0.113.20')
  })

  it("returns 'unknown' when no proxy headers are present", () => {
    const req = makeReq({})
    expect(getClientIp(req as unknown as Parameters<typeof getClientIp>[0])).toBe('unknown')
  })

  it('trims whitespace from the first IP', () => {
    const req = makeReq({ 'x-forwarded-for': '   203.0.113.30   , extra' })
    expect(getClientIp(req as unknown as Parameters<typeof getClientIp>[0])).toBe('203.0.113.30')
  })
})
