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

export type MentionSegment = { value: string; isMention: boolean }

/**
 * Split comment text into plain and mentioned segments for highlighted
 * rendering. Uses the same strict boundary rules as parseMentions so that the
 * highlighted spans line up exactly with who actually gets notified. Segment
 * `value` preserves the text's original casing (including the leading `@`).
 */
export function splitMentions(text: string, names: string[]): MentionSegment[] {
  const sorted = names
    .filter(n => !!n && n.trim().length > 0)
    .sort((a, b) => b.length - a.length)

  const segments: MentionSegment[] = []
  let buffer = ''
  const flush = () => {
    if (buffer) {
      segments.push({ value: buffer, isMention: false })
      buffer = ''
    }
  }

  let i = 0
  while (i < text.length) {
    const atStart = i === 0 || /\s/.test(text[i - 1])
    if (text[i] === '@' && atStart) {
      const rest = text.slice(i + 1)
      const restLower = rest.toLowerCase()
      const hit = sorted.find(name => {
        if (!restLower.startsWith(name.toLowerCase())) return false
        const nextChar = rest[name.length]
        return nextChar === undefined || !/[a-z0-9]/i.test(nextChar)
      })
      if (hit) {
        flush()
        segments.push({ value: text.slice(i, i + 1 + hit.length), isMention: true })
        i += 1 + hit.length
        continue
      }
    }
    buffer += text[i]
    i++
  }
  flush()
  return segments
}
