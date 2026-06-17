import { timingSafeEqual } from 'crypto'

/**
 * Authorize a cron request by comparing the provided secret against the
 * configured one. Fails CLOSED: if no secret is configured, every request
 * is rejected (an unset CRON_SECRET must never mean "open to the public").
 */
export function isAuthorizedCronRequest(
  provided: string | null | undefined,
  configured: string | null | undefined
): boolean {
  if (!configured) return false // fail closed: no secret => reject everything
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(configured)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
