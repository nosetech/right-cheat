import { useCallback, useEffect, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { info, error as logError } from '@tauri-apps/plugin-log'

import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { CheatSheetAPI, CheatSheetUpdate } from '@/types/api/CheatSheet'

import { RowData } from './types'

type UseSaveCheatsheetsParams = {
  rows: RowData[]
  dirty: boolean
  errorCt: number
  showError?: (message: string) => void
}

/**
 * 保存・キャンセルのアクションと確認ダイアログ、Cmd+S / Esc のキーボード操作を管理するフック。
 * confirm_actions 設定の読み込みもここで行い、page からはダイアログ状態と各ハンドラのみを扱う。
 */
export function useSaveCheatsheets({
  rows,
  dirty,
  errorCt,
  showError,
}: UseSaveCheatsheetsParams) {
  const { getConfirmActions } = usePreferencesStore()
  const [confirmActions, setConfirmActions] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  const canSave = dirty && errorCt === 0 && !saving

  useEffect(() => {
    ;(async () => {
      try {
        const value = await getConfirmActions()
        setConfirmActions(value)
      } catch (e) {
        logError(`[edit-cheatsheets] load confirm_actions error: ${e}`)
      }
    })()
    // getConfirmActions は usePreferencesStore から返るメモ化済み関数のため、
    // 初回マウント時の一度きりの読み込みで十分。依存配列から除外している。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doSave = useCallback(async () => {
    setConfirmSaveOpen(false)
    setSaving(true)
    try {
      const updates: CheatSheetUpdate[] = rows.map((r, i) => ({
        id: r.dbId,
        title: r.title.trim(),
        sort_order: i,
        sheet_type: r.sheetType,
        layout: r.sheetType === 'shortcut' ? 'inline' : r.layout,
      }))
      await invoke(CheatSheetAPI.UPDATE_CHEAT_SHEETS, { updates })
      info(`[edit-cheatsheets] saved ${updates.length} cheatsheets`)
      await getCurrentWindow().close()
    } catch (e) {
      logError(`[edit-cheatsheets] save error: ${e}`)
      showError?.('Failed to save the cheatsheets')
    } finally {
      setSaving(false)
    }
  }, [rows, showError])

  const onSave = useCallback(() => {
    if (!canSave) return
    if (confirmActions) {
      setConfirmSaveOpen(true)
    } else {
      doSave()
    }
  }, [canSave, confirmActions, doSave])

  const onCancel = useCallback(() => {
    if (confirmActions && dirty) {
      setConfirmCancelOpen(true)
    } else {
      void getCurrentWindow().close()
    }
  }, [confirmActions, dirty])

  // async/await で close() のエラーを検知する。onClick ハンドラから呼ばれるため
  // 呼び出し元で Promise は await されないが、close() 失敗時のログ等を将来追加できる。
  const doCancel = useCallback(async () => {
    setConfirmCancelOpen(false)
    await getCurrentWindow().close()
  }, [])

  // Cmd+S 保存 / Esc で Cancel と同じ動作
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (canSave) onSave()
      } else if (e.key === 'Escape' && !e.isComposing) {
        // IME 変換中の Esc（変換キャンセル）ではウィンドウを閉じない。
        // ドロップダウン等が開いている場合は document 側で stopPropagation され
        // window まで伝播しないため、ここでは Cancel を実行してよい。
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canSave, onSave, onCancel])

  return {
    saving,
    canSave,
    confirmSaveOpen,
    setConfirmSaveOpen,
    confirmCancelOpen,
    setConfirmCancelOpen,
    onSave,
    doSave,
    onCancel,
    doCancel,
  }
}
