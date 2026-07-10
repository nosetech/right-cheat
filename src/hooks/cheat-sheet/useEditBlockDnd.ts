import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { EditBlock, EditCommandData, isEditGroup } from '@/types/edit/EditBlock'
import { DragInfo, DropMark } from '@/types/edit/dnd'

type Params = {
  editBlocks: EditBlock[]
  setEditBlocks: Dispatch<SetStateAction<EditBlock[]>>
}

/**
 * 編集モードのブロック並べ替え（Pointer Events ベースの DnD）を管理するフック。
 * ドラッグ状態・ドロップ位置の算出・オートスクロール・並べ替え適用をまとめて提供する。
 */
export function useEditBlockDnd({ editBlocks, setEditBlocks }: Params) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)
  const [dropMark, setDropMark] = useState<DropMark | null>(null)

  const blockRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const groupBodyRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const itemRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const editBlocksRef = useRef<EditBlock[]>([])
  const dragInfoRef = useRef<DragInfo | null>(null)
  const dropMarkRef = useRef<DropMark | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollSpeedRef = useRef(0)
  const autoScrollRafRef = useRef<number | null>(null)

  useEffect(() => {
    editBlocksRef.current = editBlocks
  }, [editBlocks])

  const performDropWith = useCallback(
    (info: DragInfo, mark: DropMark) => {
      setEditBlocks((prev) => {
        const next = [...prev]

        // ドラッグ中のアイテムを取り出す
        let dragged: EditBlock | undefined

        if (info.type === 'group') {
          dragged = next[info.blockIndex]
          next.splice(info.blockIndex, 1)
        } else if (info.itemIndex !== undefined) {
          const group = next[info.blockIndex]
          if (isEditGroup(group)) {
            dragged = group.commandlist[info.itemIndex]
            const newItems = [...group.commandlist]
            newItems.splice(info.itemIndex, 1)
            next[info.blockIndex] = { ...group, commandlist: newItems }
          }
        } else {
          dragged = next[info.blockIndex]
          next.splice(info.blockIndex, 1)
        }

        if (!dragged) return prev

        // ドロップ先に挿入
        if (mark.kind === 'into-group') {
          let groupIdx = mark.groupBlockIndex
          if (
            info.type !== 'group' &&
            info.itemIndex === undefined &&
            info.blockIndex < mark.groupBlockIndex
          ) {
            groupIdx -= 1
          }
          const group = next[groupIdx]
          if (isEditGroup(group) && !isEditGroup(dragged)) {
            next[groupIdx] = {
              ...group,
              commandlist: [...group.commandlist, dragged as EditCommandData],
            }
          }
          return next
        }

        if (mark.kind === 'between-items') {
          let groupIdx = mark.groupBlockIndex
          if (
            info.type !== 'group' &&
            info.itemIndex === undefined &&
            info.blockIndex < mark.groupBlockIndex
          ) {
            groupIdx -= 1
          }
          const group = next[groupIdx]
          if (isEditGroup(group) && !isEditGroup(dragged)) {
            const newItems = [...group.commandlist]
            const insertAt = mark.afterItemIndex + 1
            newItems.splice(insertAt, 0, dragged as EditCommandData)
            next[groupIdx] = { ...group, commandlist: newItems }
          }
          return next
        }

        // between-blocks
        let insertAt = mark.afterBlockIndex + 1
        if (
          (info.type === 'group' || info.itemIndex === undefined) &&
          info.blockIndex < mark.afterBlockIndex
        ) {
          insertAt -= 1
        }
        next.splice(Math.max(0, insertAt), 0, dragged)
        return next
      })
    },
    [setEditBlocks],
  )

  const computeDropMark = useCallback((clientY: number): DropMark | null => {
    const blocks = editBlocksRef.current
    const dragging = dragInfoRef.current
    const isDraggingGroup = dragging?.type === 'group'

    // グループ内アイテムを先にチェック（グループをドラッグ中はスキップ: グループはグループ内に入れられない）
    if (!isDraggingGroup) {
      for (const [editId, el] of itemRefsMap.current.entries()) {
        const rect = el.getBoundingClientRect()
        if (clientY < rect.top || clientY > rect.bottom) continue

        for (let bi = 0; bi < blocks.length; bi++) {
          const block = blocks[bi]
          if (!isEditGroup(block)) continue
          const itemIdx = block.commandlist.findIndex(
            (it) => it._editId === editId,
          )
          if (itemIdx === -1) continue

          if (dragging?.blockIndex === bi && dragging.itemIndex === itemIdx)
            continue

          const isAfter = clientY > rect.top + rect.height / 2
          return {
            kind: 'between-items',
            groupBlockIndex: bi,
            afterItemIndex: isAfter ? itemIdx : itemIdx - 1,
          }
        }
      }
    }

    // ブロックをチェック
    for (const [editId, el] of blockRefsMap.current.entries()) {
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top || clientY > rect.bottom) continue

      const bi = blocks.findIndex((b) => b._editId === editId)
      if (bi === -1) continue

      if (
        dragging &&
        dragging.blockIndex === bi &&
        dragging.itemIndex === undefined
      )
        continue

      const block = blocks[bi]
      if (isEditGroup(block)) {
        const bodyEl = groupBodyRefsMap.current.get(editId)
        if (bodyEl) {
          const bodyRect = bodyEl.getBoundingClientRect()
          if (clientY >= bodyRect.top && clientY <= bodyRect.bottom) {
            if (!isDraggingGroup) {
              return { kind: 'into-group', groupBlockIndex: bi }
            }
          }
        }
      }

      const isAfter = clientY > rect.top + rect.height / 2
      return {
        kind: 'between-blocks',
        afterBlockIndex: isAfter ? bi : bi - 1,
      }
    }

    return null
  }, [])

  const autoScrollLoop = useCallback(() => {
    if (autoScrollSpeedRef.current === 0) {
      autoScrollRafRef.current = null
      return
    }
    const scrollEl = scrollContainerRef.current
    if (scrollEl) {
      scrollEl.scrollTop += autoScrollSpeedRef.current
    }
    autoScrollRafRef.current = requestAnimationFrame(autoScrollLoop)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = null
    }
    autoScrollSpeedRef.current = 0
  }, [])

  useEffect(() => {
    return () => {
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, blockIndex: number, itemIndex?: number) => {
      const info: DragInfo = {
        type: itemIndex !== undefined ? 'item' : 'group',
        blockIndex,
        itemIndex,
      }
      dragInfoRef.current = info
      setDragInfo(info)
      dropMarkRef.current = null
      setDropMark(null)
      autoScrollSpeedRef.current = 0
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragInfoRef.current) return
      const mark = computeDropMark(e.clientY)
      dropMarkRef.current = mark
      setDropMark(mark)

      const autoScrollThreshold = 60
      const maxSpeed = 12
      const scrollEl = scrollContainerRef.current
      if (scrollEl) {
        const { top, bottom } = scrollEl.getBoundingClientRect()
        const distFromTop = e.clientY - top
        const distFromBottom = bottom - e.clientY
        let speed = 0
        if (distFromTop < autoScrollThreshold) {
          speed = -maxSpeed * (1 - distFromTop / autoScrollThreshold)
        } else if (distFromBottom < autoScrollThreshold) {
          speed = maxSpeed * (1 - distFromBottom / autoScrollThreshold)
        }
        autoScrollSpeedRef.current = speed
        if (speed !== 0 && autoScrollRafRef.current === null) {
          autoScrollRafRef.current = requestAnimationFrame(autoScrollLoop)
        }
      }
    },
    [computeDropMark, autoScrollLoop],
  )

  const handlePointerUp = useCallback(() => {
    const info = dragInfoRef.current
    const mark = dropMarkRef.current
    dragInfoRef.current = null
    dropMarkRef.current = null
    setDragInfo(null)
    setDropMark(null)
    stopAutoScroll()
    if (info && mark) performDropWith(info, mark)
  }, [performDropWith, stopAutoScroll])

  const handlePointerCancel = useCallback(() => {
    dragInfoRef.current = null
    dropMarkRef.current = null
    setDragInfo(null)
    setDropMark(null)
    stopAutoScroll()
  }, [stopAutoScroll])

  // 編集モード終了時などにドラッグ状態をリセットする。
  const resetDrag = useCallback(() => {
    dragInfoRef.current = null
    dropMarkRef.current = null
    setDragInfo(null)
    setDropMark(null)
  }, [])

  return {
    dragInfo,
    dropMark,
    scrollContainerRef,
    blockRefsMap,
    groupBodyRefsMap,
    itemRefsMap,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    resetDrag,
  }
}
