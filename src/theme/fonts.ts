// アプリ全体で使用するフォントファミリー定義を一元管理する。
// UI テキスト（説明文・ラベル等）とコード（コマンド・ショートカット等）で使い分ける。

// UI 用フォント: 英字は Inter、日本語は Noto Sans JP にフォールバックする。
export const FONT_UI =
  '"Inter", "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'

// コード用フォント: 等幅フォント。
export const FONT_CODE = '"JetBrains Mono", "Fira Code", monospace'
