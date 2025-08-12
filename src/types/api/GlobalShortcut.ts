export class GlobalShortcutAPI {
  static readonly GET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS =
    'get_toggle_visible_shortcut_settings'
  static readonly SET_TOGGLE_VISIBLE_SHORTCUT_SETTINGS =
    'set_toggle_visible_shortcut_settings'
  static readonly RESTART_APP = 'restart_app'
}

export type ShortcutDef = {
  ctrl: boolean
  option: boolean
  command: boolean
  hotkey: string
}
