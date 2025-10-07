export class FontSizeAPI {
  static readonly GET_FONT_SIZE_SETTINGS = 'get_font_size_settings'
  static readonly SET_FONT_SIZE_SETTINGS = 'set_font_size_settings'
  static readonly INCREASE_FONT_SIZE = 'increase_font_size'
  static readonly DECREASE_FONT_SIZE = 'decrease_font_size'
  static readonly RESET_FONT_SIZE = 'reset_font_size'
}

export class FontSizeEvent {
  static readonly FONT_SIZE_CHANGED = 'font_size_changed'
}

export type FontSizeSettings = {
  level: number
  scale: number
}
