export type MentionCandidate = { id: string; name: string | null }

/**
 * Find which candidates are @mentioned in a block of comment text.
 *
 * Matching is deliberately strict because a match now triggers a real
 * notification (email + push):
 *  - the `@` must start the text or follow whitespace, so emails like
 *    `foo@bar.com` never match a candidate named "Bar"
 *  - the candidate name must be followed by a word boundary (end of text or a
 *    non-alphanumeric char), so "@Bobby" does not match "Bob"
 *  - the longest matching candidate wins per `@`, so "@John Smith" matches
 *    "John Smith" and not also "John"
 *
 * Pure: returns the de-duplicated list of matched candidate ids in first-seen
 * order. Author-exclusion is the caller's responsibility.
 */
export function parseMentions(text: string, candidates: MentionCandidate[]): string[] {
  const sorted = candidates
    .filter((c): c is { id: string; name: string } => !!c.name && c.name.trim().length > 0)
    .sort((a, b) => b.name.length - a.name.length)

  const lower = text.toLowerCase()
  const matched: string[] = []
  const seen = new Set<string>()

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '@') continue
    // `@` must be at the start or follow whitespace (skips emails, handles@word)
    if (i > 0 && !/\s/.test(text[i - 1])) continue

    const after = lower.slice(i + 1)
    for (const c of sorted) {
      const name = c.name.toLowerCase()
      if (!after.startsWith(name)) continue
      const nextChar = after[name.length]
      // Boundary: end of text, or a non-alphanumeric char (space, punctuation).
      if (nextChar === undefined || !/[a-z0-9]/.test(nextChar)) {
        if (!seen.has(c.id)) {
          seen.add(c.id)
          matched.push(c.id)
        }
        break // longest candidate wins for this `@`
      }
    }
  }

  return matched
}
