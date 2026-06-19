// 検索キーワードのハイライト用ユーティリティ。
// RightCheat Mockup v16 の buildHighlights / snippetSpans を踏襲し、
// FTS5 の highlight() / snippet() に相当する強調表示を UI 側で行う。
// クエリは空白区切りの複数キーワード（AND 検索）に対応する。

export type HighlightSpan = {
  text: string
  match: boolean
}

// 正規表現で特別な意味を持つ文字をエスケープする。
const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// クエリを空白で分割して検索語の一覧を得る（空要素は除外）。
const splitTerms = (query: string): string[] =>
  query.split(/\s+/).filter(Boolean)

// 複数キーワードにマッチする正規表現を生成する。
// 長い語を優先してマッチさせるため、語の長さ降順で連結する。
const buildTermRegExp = (terms: string[]): RegExp => {
  const alts = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
  return new RegExp(`(${alts.join('|')})`, 'gi')
}

// テキストとクエリからハイライト span 配列を生成する。
// 大文字小文字を無視して、いずれかの検索語にマッチする部分を
// { text, match: true } として切り出す。
export const buildHighlights = (
  text: string,
  query: string,
): HighlightSpan[] => {
  const terms = splitTerms(query)
  if (terms.length === 0) return [{ text, match: false }]
  const re = buildTermRegExp(terms)
  const out: HighlightSpan[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last)
      out.push({ text: text.slice(last, m.index), match: false })
    out.push({ text: m[0], match: true })
    last = m.index + m[0].length
    // ゼロ幅マッチによる無限ループを防止
    if (m.index === re.lastIndex) re.lastIndex++
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false })
  return out
}

// コマンド本文を最初のマッチ周辺で切り出してハイライト span を返す（FTS5 snippet() 相当）。
// 複数行は 1 行に畳み込み、改行は ⏎ で表現する。複数キーワードに対応する。
export const snippetSpans = (
  text: string,
  query: string,
  ctx = 48,
): HighlightSpan[] => {
  // 複数行はプレビュー用に 1 行へ畳み込む
  const oneLine = text.replace(/\s*\n\s*/g, ' ⏎ ')
  const terms = splitTerms(query)
  const truncate = (s: string) => (s.length > 140 ? s.slice(0, 140) + '…' : s)
  if (terms.length === 0) {
    return [{ text: truncate(oneLine), match: false }]
  }
  // 最も先頭側に現れる検索語のマッチ位置を起点にスニペットを切り出す。
  const lower = oneLine.toLowerCase()
  let idx = -1
  let matchLen = 0
  for (const t of terms) {
    const p = lower.indexOf(t.toLowerCase())
    if (p !== -1 && (idx === -1 || p < idx)) {
      idx = p
      matchLen = t.length
    }
  }
  if (idx === -1) {
    return buildHighlights(truncate(oneLine), query)
  }
  const start = Math.max(0, idx - ctx)
  const end = Math.min(oneLine.length, idx + matchLen + ctx)
  const trimmed = oneLine.slice(start, end)
  const head = start > 0 ? '…' : ''
  const tail = end < oneLine.length ? '…' : ''
  // 省略記号はハイライト対象にしないため plain span として前後に付与する
  const spans = buildHighlights(trimmed, query)
  if (head) spans.unshift({ text: head, match: false })
  if (tail) spans.push({ text: tail, match: false })
  return spans
}
