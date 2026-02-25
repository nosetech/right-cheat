export class WindowSizeAPI {
  static readonly GET_CHEAT_SHEET_WINDOW_SIZE = 'get_cheat_sheet_window_size'
  static readonly SAVE_CHEAT_SHEET_WINDOW_SIZE = 'save_cheat_sheet_window_size'
}

export type WindowSizeSettings = {
  width: number
  height: number
}
