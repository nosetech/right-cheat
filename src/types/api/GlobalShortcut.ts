export class GlobalShortcutAPI {
  static readonly GET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS =
    'get_toggle_visible_shortcut_settings'
  static readonly SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS =
    'set_toggle_visible_shortcut_settings'
  static readonly GET_CLIPBOARD_HISTORY_SHORTCUT_SETTINGS =
    'get_clipboard_history_shortcut_settings'
  static readonly SET_CLIPBOARD_HISTORY_SHORTCUT_SETTINGS =
    'set_clipboard_history_shortcut_settings'
  static readonly RESTART_APP = 'restart_app'
}

/** 2つのショートカット定義が同一の組み合わせかどうかを判定する（ホットキーは大文字小文字を区別しない）。 */
export function isSameShortcut(a: ShortcutDef, b: ShortcutDef): boolean {
  return (
    a.ctrl === b.ctrl &&
    a.option === b.option &&
    a.command === b.command &&
    a.hotkey.toLowerCase() === b.hotkey.toLowerCase()
  )
}

export type ShortcutDef = {
  ctrl: boolean
  option: boolean
  command: boolean
  hotkey: string
}
