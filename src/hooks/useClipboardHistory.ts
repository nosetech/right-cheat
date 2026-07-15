import { useCallback, useEffect, useRef, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { useNotificationContext } from '@/context/NotificationContext'
import {
  CLIPBOARD_HISTORY_LIST_LIMIT,
  ClipboardHistoryAPI,
  ClipboardHistoryItem,
} from '@/types/api/ClipboardHistory'

type Params = {
  /** クリップボード履歴シートが選択されているかどうか */
  active: boolean
}

/**
 * クリップボード履歴シートの状態を管理するフック。
 * - 履歴一覧の取得（シート選択時・ウィンドウフォーカス時に再取得）
 * - 編集モード（スナップショット方式: Delete はローカル削除、Save で確定、
 *   Cancel / Esc キーでロールバック）
 * - 全クリア（確認ダイアログ経由）
 */
export function useClipboardHistory({ active }: Params) {
  const [items, setItems] = useState<ClipboardHistoryItem[]>([])
  const [editMode, setEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [addDialogItem, setAddDialogItem] =
    useState<ClipboardHistoryItem | null>(null)
  const snapshotRef = useRef<ClipboardHistoryItem[] | null>(null)
  const pendingDeleteIdsRef = useRef<number[]>([])
  const [dirty, setDirty] = useState(false)
  const { showError } = useNotificationContext() ?? {}

  const editModeRef = useRef(false)
  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  const reload = useCallback(async () => {
    try {
      const rows = await invoke<ClipboardHistoryItem[]>(
        ClipboardHistoryAPI.LIST_CLIPBOARD_HISTORY,
        { limit: CLIPBOARD_HISTORY_LIST_LIMIT },
      )
      setItems(rows)
      debug(`[useClipboardHistory] reload: ${rows.length} item(s)`)
    } catch (err) {
      logError(`[useClipboardHistory] Failed to load history: ${String(err)}`)
      showError?.('Failed to load clipboard history')
    }
  }, [showError])

  // シート選択時に一覧を取得する
  useEffect(() => {
    if (!active) return
    void reload()
  }, [active, reload])

  // ウィンドウフォーカス時に一覧を再取得する（編集モード中はスナップショットを
  // 壊さないようスキップ）
  useEffect(() => {
    if (!active) return
    let cancelled = false
    let unlisten: (() => void) | null = null
    ;(async () => {
      unlisten = await listen<{}>(Event.WINDOW_FOCUSED, () => {
        if (editModeRef.current) return
        void reload()
      })
      if (cancelled) {
        unlisten()
        unlisten = null
      }
    })()
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [active, reload])

  // ─── 編集モード ─────────────────────────────────────────────
  const enterEditMode = useCallback(() => {
    snapshotRef.current = items
    pendingDeleteIdsRef.current = []
    setDirty(false)
    setEditMode(true)
    debug('[useClipboardHistory] entered edit mode')
  }, [items])

  const cancelEditMode = useCallback(() => {
    if (snapshotRef.current) setItems(snapshotRef.current)
    snapshotRef.current = null
    pendingDeleteIdsRef.current = []
    setDirty(false)
    setEditMode(false)
    debug('[useClipboardHistory] canceled edit mode')
  }, [])

  const saveEditMode = useCallback(async () => {
    const ids = pendingDeleteIdsRef.current
    setIsSaving(true)
    try {
      for (const id of ids) {
        await invoke(ClipboardHistoryAPI.DELETE_CLIPBOARD_HISTORY_ITEM, { id })
      }
      debug(
        `[useClipboardHistory] saved edit mode: deleted ${ids.length} item(s)`,
      )
    } catch (err) {
      logError(
        `[useClipboardHistory] Failed to delete history item(s): ${String(err)}`,
      )
      showError?.('Failed to delete clipboard history item')
    } finally {
      // 途中で削除に失敗しても一部は DB 上で削除済みのため、スナップショットを
      // 破棄して編集モードを終了し、reload で DB の実状態に同期する
      snapshotRef.current = null
      pendingDeleteIdsRef.current = []
      setDirty(false)
      setEditMode(false)
      setIsSaving(false)
    }
    await reload()
  }, [reload, showError])

  /** 編集モード中のローカル削除（Save で確定） */
  const deleteItem = useCallback((id: number) => {
    pendingDeleteIdsRef.current = [...pendingDeleteIdsRef.current, id]
    setItems((prev) => prev.filter((item) => item.id !== id))
    setDirty(true)
  }, [])

  // Esc キーで編集モードをキャンセル（ダイアログ表示中は除く）
  useEffect(() => {
    if (!editMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmClearOpen || addDialogItem !== null) return
      cancelEditMode()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editMode, confirmClearOpen, addDialogItem, cancelEditMode])

  // ─── 全クリア ───────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    setConfirmClearOpen(false)
    try {
      await invoke(ClipboardHistoryAPI.CLEAR_CLIPBOARD_HISTORY)
      setItems([])
      debug('[useClipboardHistory] cleared all history')
    } catch (err) {
      logError(`[useClipboardHistory] Failed to clear history: ${String(err)}`)
      showError?.('Failed to clear clipboard history')
    }
  }, [showError])

  return {
    items,
    editMode,
    dirty,
    isSaving,
    enterEditMode,
    cancelEditMode,
    saveEditMode,
    deleteItem,
    clearAll,
    confirmClearOpen,
    setConfirmClearOpen,
    addDialogItem,
    setAddDialogItem,
    reload,
  }
}

export type ClipboardHistoryState = ReturnType<typeof useClipboardHistory>
