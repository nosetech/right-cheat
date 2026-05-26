export class CheatSheetAPI {
  static readonly GET_CHEAT_TITLES = 'get_cheat_titles'
  static readonly GET_CHEAT_SHEET = 'get_cheat_sheet'
  static readonly RELOAD_CHEAT_SHEET = 'reload_cheat_sheet'
  static readonly RUN_APPLICATION = 'run_application'
  static readonly IMPORT_FROM_JSON = 'import_from_json'
  static readonly EXPORT_TO_JSON = 'export_to_json'
  static readonly SEARCH_COMMANDS = 'search_commands'
}

export type ImportSummary = {
  added: number
  updated: number
  skipped: number
}

export type CommandSearchResult = {
  id: number
  cheatsheet_id: number
  cheatsheet_title: string
  description: string
  command_text: string
}

export type CheatSheetTitleData = {
  title: string[]
}

export type CommandLayout = 'inline' | 'stacked' | 'command_only'

export type CommandData = {
  description?: string
  command: string
  layout?: CommandLayout
}

export type CommandGroupData = {
  group: string
  commandlist: CommandData[]
}

export type CommandListItem = CommandData | CommandGroupData

export const isCommandGroupData = (
  item: CommandListItem,
): item is CommandGroupData => 'group' in item

export type CheatSheetData = {
  type?: 'command' | 'shortcut' | 'application'
  title: string
  layout?: CommandLayout
  commandlist: CommandListItem[]
}
