export class CheatSheetAPI {
  static readonly GET_CHEAT_TITLES = 'get_cheat_titles'
  static readonly GET_CHEAT_SHEET = 'get_cheat_sheet'
  static readonly RELOAD_CHEAT_SHEET = 'reload_cheat_sheet'
  static readonly RUN_APPLICATION = 'run_application'
}

export type CheatSheetTitleData = {
  title: string[]
}

export type CheatSheetData = {
  type?: 'command' | 'shortcut' | 'application'
  title: string
  commandlist: CommandData[]
}

export type CommandData = {
  description: string
  command: string
}
