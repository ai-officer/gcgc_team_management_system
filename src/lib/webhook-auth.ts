import { timingSafeEqual } from 'crypto'

/**
 * Validate the x-goog-channel-token header of an incoming Google Calendar
 * webhook against the secret stored when the watch channel was created.
 * Fails CLOSED: if no token was stored for the channel, the request is
 * rejected (an unauthenticated channel must never trigger a re-import).
 */
export function isValidChannelToken(
  received: string | null | undefined,
  stored: string | null | undefined
): boolean {
  if (!stored) return false // fail closed: unauthenticated channel
  if (!received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(stored)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
