export type ClipboardSettings = {
  monitoring_enabled: boolean
  min_chars: number
  max_chars: number
  max_items: number
  clear_on_quit: boolean
}

export const CLIPBOARD_CHARS_LOWER_BOUND = 2
export const CLIPBOARD_CHARS_UPPER_BOUND = 1000
export const CLIPBOARD_ITEMS_LOWER_BOUND = 10
export const CLIPBOARD_ITEMS_UPPER_BOUND = 1000

export const ClipboardSettingsAPI = {
  GET_CLIPBOARD_SETTINGS: 'get_clipboard_settings',
  SET_CLIPBOARD_SETTINGS: 'set_clipboard_settings',
} as const
