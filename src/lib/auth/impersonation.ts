/**
 * Helpers for admin impersonation: NextAuth cookie naming, marker cookie, and
 * the constants shared between the start/end route handlers and the banner.
 */

export const IMPERSONATION_MARKER_COOKIE = 'impersonating-user'
export const IMPERSONATION_MAX_AGE_SECONDS = 30 * 60 // 30 minutes

export function getNextAuthSessionCookieName(): string {
  // NextAuth uses the __Secure- prefix when NEXTAUTH_URL is https. Mirror that
  // logic so we set/clear the same cookie NextAuth's getToken() reads from.
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false
  return useSecureCookies
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
}
