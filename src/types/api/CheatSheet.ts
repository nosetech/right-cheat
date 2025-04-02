export type CheatSheetTitleData = {
  title: string[]
}

export type CheatSheetData = {
  title: string
  commandlist: CommandData[]
}

export type CommandData = {
  description: string
  command: string
}
