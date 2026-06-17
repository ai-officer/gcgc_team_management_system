import { describe, it, expect } from 'vitest'
import { pickPublicFields, pickPublicFieldsList } from './public-projection'

describe('pickPublicFields', () => {
  it('omits fields not on the allowlist (no email leaks to anonymous callers)', () => {
    const leader = { id: '1', name: 'Alice', email: 'alice@corp.com', role: 'LEADER' }
    const result = pickPublicFields(leader, ['id', 'name'])
    expect(result).toEqual({ id: '1', name: 'Alice' })
    expect('email' in result).toBe(false)
  })

  it('silently ignores allowlisted keys the record does not have', () => {
    const sparse: { id: string; name?: string } = { id: '1' }
    const result = pickPublicFields(sparse, ['id', 'name'])
    expect(result).toEqual({ id: '1' })
  })

  it('projects every record in a list (no PII anywhere in the array)', () => {
    const rows = [
      { id: '1', name: 'Alice', email: 'a@corp.com' },
      { id: '2', name: 'Bob', email: 'b@corp.com' },
    ]
    const result = pickPublicFieldsList(rows, ['id', 'name'])
    expect(result).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])
    expect(result.some((r) => 'email' in r)).toBe(false)
  })
})
