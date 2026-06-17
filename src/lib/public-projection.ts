/**
 * Project a record down to an allowlist of non-sensitive fields, for returning
 * to UNAUTHENTICATED callers (e.g. the public registration form needs id+name
 * but must never receive emails or other PII). Authenticated callers should
 * receive the full record instead.
 */
export function pickPublicFields<T extends Record<string, unknown>>(
  record: T,
  allowedKeys: (keyof T)[]
): Partial<T> {
  const out: Partial<T> = {}
  for (const key of allowedKeys) {
    if (key in record) out[key] = record[key]
  }
  return out
}

export function pickPublicFieldsList<T extends Record<string, unknown>>(
  records: T[],
  allowedKeys: (keyof T)[]
): Partial<T>[] {
  return records.map((r) => pickPublicFields(r, allowedKeys))
}
