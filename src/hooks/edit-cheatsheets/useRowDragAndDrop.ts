import { useCallback, useRef, useState } from 'react'

type DropTarget = { id: string; position: 'before' | 'after' }

type UseRowDragAndDropParams = {
  // ドロップ確定時に呼ばれる並べ替えコールバック（useEditableRows.reorderRows）
  reorderRows: (
    fromLocalId: string,
    targetId: string,
    position: 'before' | 'after',
  ) => void
}

/**
 * 行の並べ替えを Pointer Events で実装するフック（HTML5 DnD の代替 — WKWebView 互換）。
 * 各行のドラッグハンドルに束ねるハンドラ群と、ドロップ位置インジケータ用の状態を返す。
 */
export function useRowDragAndDrop({ reorderRows }: UseRowDragAndDropParams) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const rowRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  // Pointer Events の onPointerUp 内で最新の dropTarget を読めるよう ref で保持
  const dropTargetRef = useRef<DropTarget | null>(null)

  const registerRow = useCallback(
    (localId: string, el: HTMLDivElement | null) => {
      if (el) rowRefsMap.current.set(localId, el)
      else rowRefsMap.current.delete(localId)
    },
    [],
  )

  const onPointerDown = useCallback(
    (localId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      dropTargetRef.current = null
      setDragId(localId)
      setDropTarget(null)
    },
    [],
  )

  // ポインターキャプチャにより、常にドラッグ中の行ハンドルでこのハンドラが発火する
  const onPointerMove = useCallback(
    (localId: string) => (e: React.PointerEvent) => {
      if (!dragId) return
      let found: DropTarget | null = null
      for (const [rowId, el] of rowRefsMap.current.entries()) {
        if (rowId === localId) continue
        const rect = el.getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = {
            id: rowId,
            position:
              e.clientY > rect.top + rect.height / 2 ? 'after' : 'before',
          }
          break
        }
      }
      dropTargetRef.current = found
      setDropTarget(found)
    },
    [dragId],
  )

  const onPointerUp = useCallback(
    (localId: string) => () => {
      const target = dropTargetRef.current
      dropTargetRef.current = null
      if (target) reorderRows(localId, target.id, target.position)
      setDragId(null)
      setDropTarget(null)
    },
    [reorderRows],
  )

  const onPointerCancel = useCallback(() => {
    dropTargetRef.current = null
    setDragId(null)
    setDropTarget(null)
  }, [])

  return {
    dragId,
    dropTarget,
    registerRow,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  }
}
