export interface CsvColumn<T> {
  key: string
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

function escapeCsvField(input: unknown): string {
  if (input === null || input === undefined) return ''
  const str = String(input)
  // RFC 4180: quote if value contains comma, quote, newline, or carriage return.
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map(c => escapeCsvField(c.header)).join(',')
  const body = rows
    .map(row => columns.map(c => escapeCsvField(c.value(row))).join(','))
    .join('\r\n')
  return body ? `${header}\r\n${body}\r\n` : `${header}\r\n`
}

export function csvFilename(base: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${base}-${stamp}.csv`
}
