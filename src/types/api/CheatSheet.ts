export class CheatSheetAPI {
  static readonly GET_CHEAT_TITLES = 'get_cheat_titles'
  static readonly GET_CHEAT_SHEET = 'get_cheat_sheet'
  static readonly RELOAD_CHEAT_SHEET = 'reload_cheat_sheet'
  static readonly RUN_APPLICATION = 'run_application'
  static readonly IMPORT_FROM_JSON = 'import_from_json'
  static readonly EXPORT_TO_JSON = 'export_to_json'
  static readonly SEARCH_COMMANDS = 'search_commands'
  static readonly LIST_CHEAT_SHEET_SUMMARIES = 'list_cheat_sheet_summaries'
  static readonly UPDATE_CHEAT_SHEETS = 'update_cheat_sheets'
  static readonly ADD_COMMAND = 'add_command'
  static readonly UPDATE_COMMAND = 'update_command'
  static readonly DELETE_COMMAND = 'delete_command'
  static readonly ADD_GROUP = 'add_group'
  static readonly UPDATE_GROUP = 'update_group'
  static readonly DELETE_GROUP = 'delete_group'
  static readonly SAVE_CHEAT_SHEET_COMMANDLIST = 'save_cheat_sheet_commandlist'
}

export type CheatSheetSummary = {
  id: number
  title: string
  sort_order: number
  sheet_type: 'command' | 'application' | 'shortcut' | null
  layout: 'inline' | 'stacked' | 'command_only' | null
  command_count: number
}

export type CheatSheetUpdate = {
  id: number | null
  title: string
  sort_order: number
  sheet_type: 'command' | 'application' | 'shortcut' | null
  layout: 'inline' | 'stacked' | 'command_only' | null
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
  id?: number
  description?: string
  command: string
  layout?: CommandLayout
}

export type CommandGroupData = {
  id?: number
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
