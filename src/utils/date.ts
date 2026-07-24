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

/**
 * 現在時刻を、DB の `copied_at`/`first_copied_at`（UTC、`formatCopyTimestamp` が
 * パースできる形式）と同じ書式の文字列にして返す。再コピー時のローカル楽観更新
 * （サーバーの再取得を待たずに一覧表示へ即時反映する）に使う。
 */
export function nowAsCopiedAtString(): string {
  const now = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ` +
    `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.${pad(now.getUTCMilliseconds(), 3)}`
  )
}
