'use client'
import { EditableCommandRow } from '@/components/molecules/EditableCommandRow'
import { EditableShortcutRow } from '@/components/molecules/EditableShortcutRow'
import { CommandLayout } from '@/types/api/CheatSheet'
import { EditCommandData } from '@/types/edit/EditBlock'

type Props = {
  isShortcuts: boolean
  index: number
  item: EditCommandData
  /** command タイプのときの解決済みレイアウト（shortcut では未使用）。 */
  layout: CommandLayout
  isDragging: boolean
  isDropTarget: boolean
  onEdit: () => void
  onDelete: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  rowRef: (el: HTMLDivElement | null) => void
}

/**
 * 編集モードの 1 行。シート種別に応じて
 * {@link EditableShortcutRow} / {@link EditableCommandRow} を出し分ける。
 */
export function EditableItemRow({ isShortcuts, layout, ...rest }: Props) {
  if (isShortcuts) {
    return <EditableShortcutRow {...rest} />
  }
  return <EditableCommandRow layout={layout} {...rest} />
}
