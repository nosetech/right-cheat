export class Event {
  static readonly WINDOW_VISIABLE_TOGGLE = 'window_visible_toggle'
  static readonly RELOAD_CHEAT_SHEET = 'reload_cheat_sheet'
  static readonly WINDOW_FOCUSED = 'window_focused'
  static readonly OPEN_CHEAT_SHEET = 'open_cheat_sheet'
  // チートシートウィンドウが OPEN_CHEAT_SHEET を受信できる状態になったことを
  // 通知するイベント（payload: { label }）。検索ウィンドウが新規ウィンドウへ
  // emit する際、READY を待ってから emit するために使用する。
  static readonly CHEAT_SHEET_READY = 'cheat_sheet_ready'
  static readonly EDIT_COMMAND_READY = 'edit-command-ready'
  static readonly EDIT_COMMAND_INIT = 'edit-command-init'
  static readonly EDIT_COMMAND_SAVE = 'edit-command-save'
  static readonly EDIT_GROUP_READY = 'edit-group-ready'
  static readonly EDIT_GROUP_INIT = 'edit-group-init'
  static readonly EDIT_GROUP_SAVE = 'edit-group-save'
  static readonly ADD_TO_CHEATSHEET_READY = 'add-to-cheatsheet-ready'
  static readonly ADD_TO_CHEATSHEET_INIT = 'add-to-cheatsheet-init'
  static readonly ADD_TO_CHEATSHEET_ADDED = 'add-to-cheatsheet-added'
  // クリップボード設定（Heat bar color 含む）が変更されたことを全ウィンドウへ
  // 通知するイベント（バックエンドの common::event::CLIPBOARD_SETTINGS_CHANGED と対応）
  static readonly CLIPBOARD_SETTINGS_CHANGED = 'clipboard_settings_changed'
}
