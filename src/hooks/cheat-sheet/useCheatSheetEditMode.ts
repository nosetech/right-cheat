import { Dispatch, SetStateAction, useCallback, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { useWindowCloseShortcuts } from '@/hooks/useWindowCloseShortcuts'
import { CheatSheetAPI, CheatSheetData } from '@/types/api/CheatSheet'
import { EditBlock, fromEditBlocks, toEditBlocks } from '@/types/edit/EditBlock'

type Params = {
  editMode: boolean
  setEditMode: Dispatch<SetStateAction<boolean>>
  editBlocks: EditBlock[]
  setEditBlocks: Dispatch<SetStateAction<EditBlock[]>>
  cheatSheetData?: CheatSheetData
  selectCheatSheet: string
  getConfirmActions: () => Promise<boolean>
  loadCheatSheetData: (title: string) => Promise<CheatSheetData | undefined>
  setCheatSheetData: Dispatch<SetStateAction<CheatSheetData | undefined>>
  showError?: (message: string) => void
  closeEditWindows: () => Promise<void>
  resetDrag: () => void
}

/**
 * 編集モードのライフサイクル（開始／破棄／保存）と確認ダイアログ、
 * Cmd+S・Esc ショートカットを管理するフック。
 * editMode / editBlocks はオーケストレーター側が保持し、本フックがその遷移を担う。
 */
export function useCheatSheetEditMode({
  editMode,
  setEditMode,
  editBlocks,
  setEditBlocks,
  cheatSheetData,
  selectCheatSheet,
  getConfirmActions,
  loadCheatSheetData,
  setCheatSheetData,
  showError,
  closeEditWindows,
  resetDrag,
}: Params) {
  const [editSnapshot, setEditSnapshot] = useState<EditBlock[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Confirm before actions 設定（Cancel/Save 時の確認ダイアログ表示制御）
  const [confirmActions, setConfirmActions] = useState<boolean>(true)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)

  const editDirty =
    editMode &&
    editSnapshot !== null &&
    JSON.stringify(editBlocks) !== JSON.stringify(editSnapshot)

  const enterEditMode = useCallback(async () => {
    if (!cheatSheetData) return
    try {
      setConfirmActions(await getConfirmActions())
    } catch (e) {
      logError(`[CheatSheet] enterEditMode load confirm_actions error: ${e}`)
    }
    const blocks = toEditBlocks(cheatSheetData.commandlist)
    const snapshot = JSON.parse(JSON.stringify(blocks)) as EditBlock[]
    setEditBlocks(blocks)
    setEditSnapshot(snapshot)
    setEditMode(true)
  }, [cheatSheetData, getConfirmActions, setEditBlocks, setEditMode])

  // 編集を破棄して編集モードを終了する（確認後の実処理）
  const doCancel = useCallback(async () => {
    setConfirmCancelOpen(false)
    await closeEditWindows()
    if (editSnapshot) setEditBlocks(JSON.parse(JSON.stringify(editSnapshot)))
    setEditSnapshot(null)
    setEditMode(false)
    resetDrag()
  }, [editSnapshot, resetDrag, closeEditWindows, setEditBlocks, setEditMode])

  // Cancel ボタン/Esc のエントリ。Confirm before actions が有効かつ
  // 変更がある場合のみ確認ダイアログを表示する。
  const cancelEditMode = useCallback(() => {
    if (confirmActions && editDirty) {
      setConfirmCancelOpen(true)
    } else {
      void doCancel()
    }
  }, [confirmActions, editDirty, doCancel])

  // 編集内容を保存して編集モードを終了する（確認後の実処理）
  const doSave = useCallback(async () => {
    setConfirmSaveOpen(false)
    if (!selectCheatSheet) return
    try {
      setIsSaving(true)
      const commandlist = fromEditBlocks(editBlocks)
      await invoke(CheatSheetAPI.SAVE_CHEAT_SHEET_COMMANDLIST, {
        title: selectCheatSheet,
        commandlist,
      })
      debug(
        `[CheatSheet] saveEditMode: saved commandlist for '${selectCheatSheet}'`,
      )
      setEditSnapshot(null)
      setEditMode(false)
      // フレッシュなIDで再ロード
      const data = await loadCheatSheetData(selectCheatSheet)
      setCheatSheetData(data)
    } catch (e) {
      logError(`[CheatSheet] saveEditMode error: ${String(e)}`)
      showError?.(
        `Failed to save: ${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      setIsSaving(false)
    }
  }, [
    selectCheatSheet,
    editBlocks,
    loadCheatSheetData,
    setCheatSheetData,
    showError,
    setEditMode,
  ])

  // Save ボタンのエントリ。Confirm before actions が有効な場合のみ
  // 確認ダイアログを表示する。
  const saveEditMode = useCallback(() => {
    if (confirmActions) {
      setConfirmSaveOpen(true)
    } else {
      void doSave()
    }
  }, [confirmActions, doSave])

  // Cmd+S = Save / Esc = Cancel（確認ダイアログが開いていない場合のみ）
  useWindowCloseShortcuts({
    enabled: editMode && !confirmCancelOpen && !confirmSaveOpen,
    // Cmd+S は Save ボタンと同じ条件のときのみ実行
    onSave: () => {
      if (editDirty && !isSaving) saveEditMode()
    },
    onCancel: cancelEditMode,
  })

  return {
    editDirty,
    isSaving,
    enterEditMode,
    cancelEditMode,
    saveEditMode,
    doCancel,
    doSave,
    confirmCancelOpen,
    setConfirmCancelOpen,
    confirmSaveOpen,
    setConfirmSaveOpen,
  }
}
