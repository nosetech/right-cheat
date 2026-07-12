import { useCallback, useEffect, useRef, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import {
  CheatSheetAPI,
  CheatSheetSummary,
  CommandLayout,
  SheetType,
} from '@/types/api/CheatSheet'

import { nextLocalId } from './constants'
import { RowData } from './types'
import { validateRows } from './validation'

/**
 * 編集画面の行データ（rows）と、その CRUD・並べ替え・バリデーション結果を管理するフック。
 * ウィンドウの保存やドラッグ操作の入力処理は別フック（useSaveCheatsheets /
 * useRowDragAndDrop）が担当する。
 */
export function useEditableRows() {
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const summaries = await invoke<CheatSheetSummary[]>(
          CheatSheetAPI.LIST_CHEAT_SHEET_SUMMARIES,
        )
        debug(`[edit-cheatsheets] loaded ${summaries.length} summaries`)
        setRows(
          summaries.map((s) => ({
            localId: nextLocalId(),
            dbId: s.id,
            title: s.title,
            sheetType: (s.sheet_type as SheetType) ?? 'command',
            layout: (s.layout as CommandLayout) ?? 'inline',
            commandCount: s.command_count,
          })),
        )
      } catch (e) {
        logError(`[edit-cheatsheets] load error: ${e}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const updateTitle = useCallback((localId: string, value: string) => {
    setRows((rs) =>
      rs.map((r) => (r.localId === localId ? { ...r, title: value } : r)),
    )
    setDirty(true)
  }, [])

  const updateType = useCallback((localId: string, value: SheetType) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.localId !== localId) return r
        const layout = value === 'shortcut' ? 'inline' : r.layout
        return { ...r, sheetType: value, layout }
      }),
    )
    setDirty(true)
  }, [])

  const updateLayout = useCallback((localId: string, value: CommandLayout) => {
    setRows((rs) =>
      rs.map((r) => (r.localId === localId ? { ...r, layout: value } : r)),
    )
    setDirty(true)
  }, [])

  const removeRow = useCallback((localId: string) => {
    setRows((rs) => rs.filter((r) => r.localId !== localId))
    setDirty(true)
  }, [])

  const addRow = useCallback(() => {
    const localId = nextLocalId()
    setRows((rs) => [
      ...rs,
      {
        localId,
        dbId: null,
        title: '',
        sheetType: 'command',
        layout: 'inline',
        commandCount: 0,
      },
    ])
    setEditingId(localId)
    setDirty(true)
    setTimeout(
      () => listEndRef.current?.scrollIntoView({ block: 'nearest' }),
      0,
    )
  }, [])

  // Arrow キーによる1つ上／下への移動
  const moveRow = useCallback((localId: string, direction: 'up' | 'down') => {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.localId === localId)
      if (idx === -1) return rs
      const next = rs.slice()
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= next.length) return rs
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
    setDirty(true)
  }, [])

  // ドラッグ＆ドロップによる並べ替え（fromLocalId を targetId の前後へ移動）
  const reorderRows = useCallback(
    (fromLocalId: string, targetId: string, position: 'before' | 'after') => {
      setRows((prevRows) => {
        const from = prevRows.findIndex((r) => r.localId === fromLocalId)
        let to = prevRows.findIndex((r) => r.localId === targetId)
        if (from === -1 || to === -1) return prevRows
        const next = prevRows.slice()
        const [moved] = next.splice(from, 1)
        if (from < to) to -= 1
        if (position === 'after') to += 1
        next.splice(to, 0, moved)
        return next
      })
      setDirty(true)
    },
    [],
  )

  const errors = validateRows(rows)
  const errorCt = errors.filter(
    (e) => e.empty || e.tooLong || e.duplicate,
  ).length

  return {
    rows,
    loading,
    dirty,
    editingId,
    setEditingId,
    listEndRef,
    errors,
    errorCt,
    addRow,
    removeRow,
    updateTitle,
    updateType,
    updateLayout,
    moveRow,
    reorderRows,
  }
}
