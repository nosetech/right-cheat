import { useCallback, useEffect, useRef, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { MAX_COPY_COUNT } from '@/constants/heatPalette'
import { useNotificationContext } from '@/context/NotificationContext'
import {
  CLIPBOARD_HISTORY_LIST_LIMIT,
  ClipboardHistoryAPI,
  ClipboardHistoryItem,
} from '@/types/api/ClipboardHistory'
import { nowAsCopiedAtString } from '@/utils/date'

/**
 * クリップボード履歴ウィンドウの状態を管理するフック。
 * - 履歴一覧の取得（マウント時・ウィンドウフォーカス時に再取得）
 * - 編集モード（スナップショット方式: Delete はローカル削除、Save で確定、
 *   Cancel / Esc キーでロールバック）
 * - 全クリア（確認ダイアログ経由）
 *
 * Clipboard History は独立ウィンドウのため、常時アクティブとして扱い、
 * 再取得は自ウィンドウの `onFocusChanged` で行う。
 */
export function useClipboardHistory() {
  const [items, setItems] = useState<ClipboardHistoryItem[]>([])
  const [editMode, setEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
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

  // マウント時に一覧を取得する
  useEffect(() => {
    void reload()
  }, [reload])

  // ウィンドウフォーカス時に一覧を再取得する（編集モード中はスナップショットを
  // 壊さないようスキップ）
  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | null = null
    ;(async () => {
      unlisten = await getCurrentWebviewWindow().onFocusChanged(
        ({ payload: focused }) => {
          if (!focused) return
          if (editModeRef.current) return
          void reload()
        },
      )
      if (cancelled) {
        unlisten()
        unlisten = null
      }
    })()
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [reload])

  // ─── 再コピー（copy_count のカウントアップ） ───────────────────
  // Clipboard History ウィンドウ内での再コピーは自前マーカー付きで
  // NSPasteboard へ書き込まれ ClipboardMonitor に検知されないため、専用コマンドで
  // copy_count のインクリメントを明示的に記録する。DB への反映を待たずに一覧へ
  // 即時反映するため、まずローカル state を楽観的に更新する（失敗してもログのみで
  // ロールバックはしない。次回リロードで DB の実状態に自然と同期される）。
  // バックエンド（insert_clipboard_history の MIN(copy_count + 1, MAX_COPY_COUNT)）と
  // 同じ上限でカウントアップを止めないと、同一セッション内で連続再コピーした際に
  // 表示上のカウントだけ上限を超えて増え続けてしまう。
  const recordRecopy = useCallback((id: number, text: string) => {
    const copiedAt = nowAsCopiedAtString()
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              copy_count: Math.min(item.copy_count + 1, MAX_COPY_COUNT),
              copied_at: copiedAt,
            }
          : item,
      ),
    )
    invoke(ClipboardHistoryAPI.RECORD_CLIPBOARD_HISTORY_RECOPY, { text }).catch(
      (err) => {
        logError(
          `[useClipboardHistory] Failed to record recopy: ${String(err)}`,
        )
      },
    )
  }, [])

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

  // Esc キーで編集モードをキャンセル（確認ダイアログ表示中は除く）
  useEffect(() => {
    if (!editMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmClearOpen) return
      cancelEditMode()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editMode, confirmClearOpen, cancelEditMode])

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
    recordRecopy,
    clearAll,
    confirmClearOpen,
    setConfirmClearOpen,
    reload,
  }
}

export type ClipboardHistoryState = ReturnType<typeof useClipboardHistory>
