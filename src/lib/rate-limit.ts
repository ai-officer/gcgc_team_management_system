import type { NextRequest } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets: Map<string, Bucket> | undefined
}

const buckets =
  globalForRateLimit.rateLimitBuckets ?? new Map<string, Bucket>()

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.rateLimitBuckets = buckets
}

export interface RateLimitOptions {
  windowMs: number
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
}

export function rateLimit(
  key: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, retryAfterSeconds: 0, remaining: opts.max - 1 }
  }

  bucket.count += 1

  if (bucket.count > opts.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    }
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, opts.max - bucket.count),
  }
}

export function clearRateLimit(key: string): void {
  buckets.delete(key)
}

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
