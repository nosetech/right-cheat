export class ClipboardHistoryAPI {
  static readonly LIST_CLIPBOARD_HISTORY = 'list_clipboard_history'
  static readonly DELETE_CLIPBOARD_HISTORY_ITEM =
    'delete_clipboard_history_item'
  static readonly CLEAR_CLIPBOARD_HISTORY = 'clear_clipboard_history'
}

export type ClipboardHistoryItem = {
  id: number
  text: string
  char_count: number
  copied_at: string
}

// シート切り替えに表示する擬似シートのタイトル。
// DB 上のチートシートではないため、選択時はチートシートデータの取得や
// ウィンドウサイズのピン留めを行わない。
export const CLIPBOARD_HISTORY_SHEET_TITLE = 'Clipboard History'

// 一覧取得時の上限件数。設定の「Max history entries」上限（1000）に合わせる。
export const CLIPBOARD_HISTORY_LIST_LIMIT = 1000
