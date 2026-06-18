// 検索キーワードのハイライト用ユーティリティ。
// RightCheat Mockup v16 の buildHighlights / snippetSpans を踏襲し、
// FTS5 の highlight() / snippet() に相当する強調表示を UI 側で行う。

export type HighlightSpan = {
  text: string
  match: boolean
}

// テキストとクエリからハイライト span 配列を生成する。
// 大文字小文字を無視してマッチ部分を { text, match: true } として切り出す。
export const buildHighlights = (
  text: string,
  query: string,
): HighlightSpan[] => {
  if (!query) return [{ text, match: false }]
  const q = query.toLowerCase()
  const lower = text.toLowerCase()
  const out: HighlightSpan[] = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(q, i)
    if (idx === -1) {
      out.push({ text: text.slice(i), match: false })
      break
    }
    if (idx > i) out.push({ text: text.slice(i, idx), match: false })
    out.push({ text: text.slice(idx, idx + q.length), match: true })
    i = idx + q.length
  }
  return out
}

// コマンド本文を最初のマッチ周辺で切り出してハイライト span を返す（FTS5 snippet() 相当）。
// 複数行は 1 行に畳み込み、改行は ⏎ で表現する。
export const snippetSpans = (
  text: string,
  query: string,
  ctx = 48,
): HighlightSpan[] => {
  // 複数行はプレビュー用に 1 行へ畳み込む
  const oneLine = text.replace(/\s*\n\s*/g, ' ⏎ ')
  if (!query) {
    const truncated =
      oneLine.length > 140 ? oneLine.slice(0, 140) + '…' : oneLine
    return [{ text: truncated, match: false }]
  }
  const idx = oneLine.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) {
    const truncated =
      oneLine.length > 140 ? oneLine.slice(0, 140) + '…' : oneLine
    return buildHighlights(truncated, query)
  }
  const start = Math.max(0, idx - ctx)
  const end = Math.min(oneLine.length, idx + query.length + ctx)
  const trimmed = oneLine.slice(start, end)
  const head = start > 0 ? '…' : ''
  const tail = end < oneLine.length ? '…' : ''
  // 省略記号はハイライト対象にしないため plain span として前後に付与する
  const spans = buildHighlights(trimmed, query)
  if (head) spans.unshift({ text: head, match: false })
  if (tail) spans.push({ text: tail, match: false })
  return spans
}
