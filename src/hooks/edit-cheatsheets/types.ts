import { CommandLayout, SheetType } from '@/types/api/CheatSheet'

// 編集画面の1行ぶんの状態。localId は React key / ドラッグ識別に使うクライアント側 ID。
export type RowData = {
  localId: string
  dbId: number | null
  title: string
  sheetType: SheetType
  layout: CommandLayout
  commandCount: number
}

export type RowError = {
  empty: boolean
  tooLong: boolean
  duplicate: boolean
}
