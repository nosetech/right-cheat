export class ClipboardHistoryAPI {
  static readonly LIST_CLIPBOARD_HISTORY = 'list_clipboard_history'
  static readonly DELETE_CLIPBOARD_HISTORY_ITEM =
    'delete_clipboard_history_item'
  static readonly CLEAR_CLIPBOARD_HISTORY = 'clear_clipboard_history'
  static readonly RECORD_CLIPBOARD_HISTORY_RECOPY =
    'record_clipboard_history_recopy'
}

export type ClipboardHistoryItem = {
  id: number
  text: string
  char_count: number
  copied_at: string
  copy_count: number
  first_copied_at: string
  truncated: boolean
  original_char_count: number | null
}

// 一覧取得時の上限件数。設定の「Max history entries」上限（1000）に合わせる。
export const CLIPBOARD_HISTORY_LIST_LIMIT = 1000
