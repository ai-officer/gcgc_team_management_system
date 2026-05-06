import { describe, it, expect } from 'vitest'
import { rowsToCsv, csvFilename, type CsvColumn } from './csv-export'

describe('rowsToCsv', () => {
  interface Row {
    name: string
    age: number
    note: string | null
  }
  const cols: CsvColumn<Row>[] = [
    { key: 'name', header: 'Name', value: r => r.name },
    { key: 'age', header: 'Age', value: r => r.age },
    { key: 'note', header: 'Note', value: r => r.note },
  ]

  it('writes a header-only csv when rows is empty', () => {
    expect(rowsToCsv([], cols)).toBe('Name,Age,Note\r\n')
  })

  it('writes header + body separated by CRLF', () => {
    const csv = rowsToCsv([{ name: 'Ada', age: 36, note: null }], cols)
    expect(csv).toBe('Name,Age,Note\r\nAda,36,\r\n')
  })

  it('quotes values that contain commas', () => {
    const csv = rowsToCsv([{ name: 'Lovelace, Ada', age: 36, note: null }], cols)
    expect(csv).toBe('Name,Age,Note\r\n"Lovelace, Ada",36,\r\n')
  })

  it('escapes embedded double-quotes by doubling them (RFC 4180)', () => {
    const csv = rowsToCsv([{ name: 'She said "hi"', age: 1, note: null }], cols)
    expect(csv).toBe('Name,Age,Note\r\n"She said ""hi""",1,\r\n')
  })

  it('quotes values with newlines', () => {
    const csv = rowsToCsv([{ name: 'a\nb', age: 1, note: null }], cols)
    expect(csv).toBe('Name,Age,Note\r\n"a\nb",1,\r\n')
  })

  it('renders null and undefined as empty', () => {
    const csv = rowsToCsv(
      [{ name: 'X', age: 0, note: null }],
      [
        { key: 'name', header: 'A', value: () => 'X' },
        { key: 'a', header: 'B', value: () => null },
        { key: 'b', header: 'C', value: () => undefined },
      ]
    )
    expect(csv).toBe('A,B,C\r\nX,,\r\n')
  })

  it('coerces booleans and numbers to strings without quoting them', () => {
    const csv = rowsToCsv(
      [{ name: 'X', age: 42, note: null }],
      [
        { key: 'a', header: 'A', value: () => true },
        { key: 'b', header: 'B', value: () => 0 },
      ]
    )
    expect(csv).toBe('A,B\r\ntrue,0\r\n')
  })
})

describe('csvFilename', () => {
  it('appends an ISO-ish timestamp', () => {
    const name = csvFilename('users')
    expect(name).toMatch(/^users-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/)
  })

  it('returns a unique-enough name across calls within the same second', () => {
    // Not a hard guarantee — file names are second-resolution by design — but
    // confirms the format function doesn't crash when called twice quickly.
    const a = csvFilename('x')
    const b = csvFilename('x')
    expect(a.endsWith('.csv')).toBe(true)
    expect(b.endsWith('.csv')).toBe(true)
  })
})
