import { MAX_TITLE } from './constants'
import { RowData, RowError } from './types'

export function validateRows(rows: RowData[]): RowError[] {
  const norm = rows.map((r) => r.title.trim().toLowerCase())
  const counts: Record<string, number> = {}
  norm.forEach((n) => {
    if (n) counts[n] = (counts[n] ?? 0) + 1
  })
  return rows.map((r, i) => {
    const t = r.title.trim()
    return {
      empty: t.length === 0,
      tooLong: r.title.length > MAX_TITLE,
      duplicate: t.length > 0 && (counts[norm[i]] ?? 0) > 1,
    }
  })
}
