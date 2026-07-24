/**
 * SQLite の `strftime('%Y-%m-%d %H:%M:%f', 'now')` が返す UTC 日時文字列
 * （例: "2026-06-25 08:40:12.345"）をローカル時刻の表示用文字列に変換する。
 * WKWebView でも安定してパースできるよう、明示的に UTC の ISO 8601 表記へ
 * 変換してから Date に渡す。
 */
export function formatCopyTimestamp(raw: string): string {
  const iso = `${raw.replace(' ', 'T')}Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return raw

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
