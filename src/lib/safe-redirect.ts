/**
 * Origins permitted as external SSO callback targets.
 * Mirrors the trusted TMS Chat hosts (see cors.ts ALLOWED_ORIGINS).
 */
export const ALLOWED_REDIRECT_ORIGINS = [
  'https://tms-chat-staging.hotelsogo-ai.com',
  'https://tms-chat.hotelsogo-ai.com',
  'http://localhost:3000',
  'http://localhost:3001',
]

/**
 * Resolve a user-supplied callbackUrl to a safe redirect target.
 * Returns the parsed URL only if its origin is on the allowlist; otherwise null.
 */
export function resolveSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  allowedOrigins: string[] = ALLOWED_REDIRECT_ORIGINS
): URL | null {
  if (!callbackUrl) return null
  let url: URL
  try {
    url = new URL(callbackUrl)
  } catch {
    return null
  }
  return allowedOrigins.includes(url.origin) ? url : null
}
