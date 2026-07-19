import { useCallback, useEffect, useRef, useState } from 'react'

import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from '@tauri-apps/api/webviewWindow'

import { Event } from '@/common'
import { CheatSheetData } from '@/types/api/CheatSheet'
import {
  EditCommandData,
  EditGroupData,
  GroupOption,
} from '@/types/edit/EditBlock'
import {
  EditCommandInitPayload,
  EditCommandSavePayload,
  EditGroupInitPayload,
  EditGroupSavePayload,
} from '@/types/edit/EditWindow'

type Params = {
  editMode: boolean
  cheatSheetType?: CheatSheetData['type']
  isShortcuts: boolean
  groupOptions: GroupOption[]
  onUpsertCommand: (payload: EditCommandSavePayload) => void
  onUpsertGroup: (payload: EditGroupSavePayload) => void
}

// 複数チートシートウィンドウ対応: 編集ウィンドウのラベルは呼び出し元ウィンドウ
// ごとに `edit_command-<親ラベル>` / `edit_group-<親ラベル>` とし、別のチート
// シートウィンドウの編集ウィンドウと衝突しないようにする。
// ラベル規則はバックエンド（cheatsheet_window.rs の edit_window_labels）と
// 揃えること。親ウィンドウ破棄時のオーファン掃除がこの規則に依存している。
const editCommandLabel = (parentLabel: string) => `edit_command-${parentLabel}`
const editGroupLabel = (parentLabel: string) => `edit_group-${parentLabel}`

/**
 * コマンド/グループ編集用の別ウィンドウ（edit_command / edit_group）の
 * 開閉と、保存イベント（EDIT_COMMAND_SAVE / EDIT_GROUP_SAVE）の受信を管理するフック。
 */
export function useEditWindows({
  editMode,
  cheatSheetType,
  isShortcuts,
  groupOptions,
  onUpsertCommand,
  onUpsertGroup,
}: Params) {
  // 編集ウィンドウの開閉カウント（オーバーレイ表示制御に使用）
  const [editWindowOpenCount, setEditWindowOpenCount] = useState(0)
  const isEditWindowOpen = editWindowOpenCount > 0

  // リスナー内（mount 時にクロージャが固定される）から最新のハンドラを参照するための ref。
  const upsertCommandRef = useRef(onUpsertCommand)
  useEffect(() => {
    upsertCommandRef.current = onUpsertCommand
  }, [onUpsertCommand])

  const upsertGroupRef = useRef(onUpsertGroup)
  useEffect(() => {
    upsertGroupRef.current = onUpsertGroup
  }, [onUpsertGroup])

  useEffect(() => {
    if (!editMode) return
    let unlistenCmd: (() => void) | null = null
    let unlistenGroup: (() => void) | null = null

    const setup = async () => {
      const win = getCurrentWebviewWindow()
      unlistenCmd = await win.listen<EditCommandSavePayload>(
        Event.EDIT_COMMAND_SAVE,
        (event) => {
          upsertCommandRef.current(event.payload)
        },
      )
      unlistenGroup = await win.listen<EditGroupSavePayload>(
        Event.EDIT_GROUP_SAVE,
        (event) => {
          upsertGroupRef.current(event.payload)
        },
      )
    }

    setup()

    return () => {
      unlistenCmd?.()
      unlistenGroup?.()
    }
  }, [editMode])

  const openCmdEditWindow = useCallback(
    async (
      item: EditCommandData | null,
      initialGroupEditId: string | null,
      isNew: boolean,
    ) => {
      const win = getCurrentWebviewWindow()
      // 編集ウィンドウが READY / SAVE を正しい呼び出し元へ emit できるよう、
      // 自ウィンドウのラベルを引き継ぐ。
      const parentLabel = win.label
      const editLabel = editCommandLabel(parentLabel)

      // 自ウィンドウの編集ウィンドウが既に開いていればフォーカスのみ移す。
      const existing = await WebviewWindow.getByLabel(editLabel)
      if (existing) {
        await existing.setFocus()
        return
      }

      const initData: EditCommandInitPayload = {
        // 実際のシート種別（command / application / shortcut）を渡す。
        // command と application は編集画面で現状同じ扱いだが、将来分岐できるようにする
        kind: cheatSheetType ?? 'command',
        item,
        groups: groupOptions,
        initialGroupEditId,
        isNew,
      }
      const windowHeight = isShortcuts ? 390 : 570

      await win.once(Event.EDIT_COMMAND_READY, async () => {
        await win.emitTo(editLabel, Event.EDIT_COMMAND_INIT, initData)
      })

      const editWin = new WebviewWindow(editLabel, {
        url: `/edit-command?parent=${encodeURIComponent(parentLabel)}`,
        title: isNew
          ? isShortcuts
            ? 'Add Shortcut'
            : 'Add Command'
          : isShortcuts
            ? 'Edit Shortcut'
            : 'Edit Command',
        width: 520,
        height: windowHeight,
        resizable: false,
        titleBarStyle: 'overlay',
        hiddenTitle: true,
        alwaysOnTop: true,
      })
      setEditWindowOpenCount((prev) => prev + 1)
      editWin.once('tauri://destroyed', () => {
        setEditWindowOpenCount((prev) => Math.max(0, prev - 1))
      })
    },
    [isShortcuts, cheatSheetType, groupOptions],
  )

  const openGroupEditWindow = useCallback(
    async (group: EditGroupData | null, isNew: boolean) => {
      const win = getCurrentWebviewWindow()
      // 呼び出し元ラベルを引き継ぐ。
      const parentLabel = win.label
      const editLabel = editGroupLabel(parentLabel)

      // 自ウィンドウの編集ウィンドウが既に開いていればフォーカスのみ移す。
      const existing = await WebviewWindow.getByLabel(editLabel)
      if (existing) {
        await existing.setFocus()
        return
      }

      const initData: EditGroupInitPayload = {
        group,
        isNew,
      }

      await win.once(Event.EDIT_GROUP_READY, async () => {
        await win.emitTo(editLabel, Event.EDIT_GROUP_INIT, initData)
      })

      const editWin = new WebviewWindow(editLabel, {
        url: `/edit-group?parent=${encodeURIComponent(parentLabel)}`,
        title: isNew ? 'Add Group' : 'Rename Group',
        width: 460,
        height: 220,
        resizable: false,
        titleBarStyle: 'overlay',
        hiddenTitle: true,
        alwaysOnTop: true,
      })
      setEditWindowOpenCount((prev) => prev + 1)
      editWin.once('tauri://destroyed', () => {
        setEditWindowOpenCount((prev) => Math.max(0, prev - 1))
      })
    },
    [],
  )

  // 自ウィンドウが開いている編集ウィンドウをすべて閉じてカウントをリセットする。
  const closeEditWindows = useCallback(async () => {
    const parentLabel = getCurrentWebviewWindow().label
    await WebviewWindow.getByLabel(editCommandLabel(parentLabel)).then((w) =>
      w?.destroy(),
    )
    await WebviewWindow.getByLabel(editGroupLabel(parentLabel)).then((w) =>
      w?.destroy(),
    )
    setEditWindowOpenCount(0)
  }, [])

  return {
    isEditWindowOpen,
    openCmdEditWindow,
    openGroupEditWindow,
    closeEditWindows,
  }
}
