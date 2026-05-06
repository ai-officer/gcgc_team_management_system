export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'globalofficium.com',
  'globalcomfortgroup.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
] as const

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain)
}

export const ALLOWED_EMAIL_MESSAGE = `Email must be from an allowed domain: ${ALLOWED_EMAIL_DOMAINS.map(d => `@${d}`).join(', ')}`
