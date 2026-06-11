'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PushPin from '@mui/icons-material/PushPin'
import PushPinOutlined from '@mui/icons-material/PushPinOutlined'
import { Alert, Box, Grid, IconButton, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import {
  CommandDialogSaveData,
  CommandEditDialog,
} from '@/components/molecules/CommandEditDialog'
import { CommandField } from '@/components/molecules/CommandField'
import { CommandFieldGroup } from '@/components/molecules/CommandFieldGroup'
import { DeleteConfirmDialog } from '@/components/molecules/DeleteConfirmDialog'
import { EditableCommandRow } from '@/components/molecules/EditableCommandRow'
import { EditableGroupBox } from '@/components/molecules/EditableGroupBox'
import { EditableShortcutRow } from '@/components/molecules/EditableShortcutRow'
import { EditModeFooter } from '@/components/molecules/EditModeFooter'
import { GroupEditDialog } from '@/components/molecules/GroupEditDialog'
import {
  SheetSwitchButton,
  SheetSwitchButtonHandle,
} from '@/components/molecules/SheetSwitchButton'
import { ShortcutField } from '@/components/molecules/ShortcutField'
import { ShortcutGroup } from '@/components/molecules/ShortcutGroup'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { useNotificationContext } from '@/context/NotificationContext'
import { useCheatSheetLoader } from '@/hooks/useCheatSheetLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useWindowSize } from '@/hooks/useWindowSize'
import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetTitleData,
  CommandLayout,
  CommandListItem,
  isCommandGroupData,
} from '@/types/api/CheatSheet'
import {
  EditBlock,
  EditCommandData,
  EditGroupData,
  fromEditBlocks,
  getGroupOptions,
  isEditGroup,
  toEditBlocks,
} from '@/types/edit/EditBlock'

// ─── DnD 型定義 ───────────────────────────────────────────────
type DragInfo = {
  type: 'item' | 'group'
  blockIndex: number
  itemIndex?: number
}

type DropMark =
  | { kind: 'between-blocks'; afterBlockIndex: number }
  | { kind: 'into-group'; groupBlockIndex: number }
  | { kind: 'between-items'; groupBlockIndex: number; afterItemIndex: number }

// ─── ダイアログ型定義 ─────────────────────────────────────────
type CmdDialogState = {
  item: EditCommandData | null
  initialGroupEditId: string | null
  isNew: boolean
}

type GroupDialogState = {
  group: EditGroupData | null
  isNew: boolean
}

type ConfirmState = {
  title: string
  message: string
  onConfirm: () => void
}

// ─── メインコンポーネント ─────────────────────────────────────
export const CheatSheet = () => {
  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')
  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [reloading, setReloading] = useState<boolean>(false)

  const theme = useTheme()
  const { isPinned, togglePin } = useWindowSize(selectCheatSheet)
  const { showError } = useNotificationContext() ?? {}

  const commandFieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const pinButtonRef = useRef<HTMLButtonElement>(null)
  const sheetSwitchRef = useRef<SheetSwitchButtonHandle>(null)

  const { loadCheatSheetTitles, loadCheatSheetData } = useCheatSheetLoader({
    setCheatSheetTitles,
    setCheatSheet,
    setErrorMessage,
  })

  // ─── 編集モード state ─────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const editModeRef = useRef(false)
  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])
  const [editBlocks, setEditBlocks] = useState<EditBlock[]>([])
  const [editSnapshot, setEditSnapshot] = useState<EditBlock[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [cmdDialog, setCmdDialog] = useState<CmdDialogState | null>(null)
  const [groupDialog, setGroupDialog] = useState<GroupDialogState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null)

  // DnD state
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)
  const [dropMark, setDropMark] = useState<DropMark | null>(null)

  const editDirty =
    editMode &&
    editSnapshot !== null &&
    JSON.stringify(editBlocks) !== JSON.stringify(editSnapshot)

  const isShortcuts = cheatSheetData?.type === 'shortcut'

  const groupOptions = useMemo(() => getGroupOptions(editBlocks), [editBlocks])

  // ─── チートシートロード ───────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined
    ;(async () => {
      unlisten = await listen<{}>(Event.RELOAD_CHEAT_SHEET, () => {
        if (editModeRef.current) return
        ;(async () => {
          setReloading(true)
          setCheatSheet('')
          await loadCheatSheetTitles()
          setReloading(false)
        })()
      })
      if (cancelled) {
        unlisten()
        unlisten = undefined
        return
      }
      await invoke<string>(CheatSheetAPI.RELOAD_CHEAT_SHEET).then(
        (response) => {
          debug(`[CheatSheet] Reload cheat sheet: response=${response}`)
        },
      )
      await loadCheatSheetTitles()
    })()
    return () => {
      cancelled = true
      unlisten?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCheatSheetTitles])

  useEffect(() => {
    ;(async () => {
      if (selectCheatSheet !== '') {
        const data = await loadCheatSheetData(selectCheatSheet)
        setCheatSheetData(data)
      } else {
        setCheatSheetData(undefined)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCheatSheet, loadCheatSheetData])

  // ─── 編集モード操作 ───────────────────────────────────────
  const enterEditMode = useCallback(() => {
    if (!cheatSheetData) return
    const blocks = toEditBlocks(cheatSheetData.commandlist)
    const snapshot = JSON.parse(JSON.stringify(blocks)) as EditBlock[]
    setEditBlocks(blocks)
    setEditSnapshot(snapshot)
    setEditMode(true)
  }, [cheatSheetData])

  const cancelEditMode = useCallback(() => {
    if (editSnapshot) setEditBlocks(JSON.parse(JSON.stringify(editSnapshot)))
    setEditSnapshot(null)
    setEditMode(false)
    setCmdDialog(null)
    setGroupDialog(null)
    setConfirmDialog(null)
    setDragInfo(null)
    setDropMark(null)
  }, [editSnapshot])

  const saveEditMode = useCallback(async () => {
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
  }, [selectCheatSheet, editBlocks, loadCheatSheetData, showError])

  // Esc = Cancel（ダイアログが開いていない場合のみ）
  useEffect(() => {
    if (!editMode) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cmdDialog && !groupDialog && !confirmDialog) {
        cancelEditMode()
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [editMode, cmdDialog, groupDialog, confirmDialog, cancelEditMode])

  // ─── コマンド/グループ操作 ────────────────────────────────
  const upsertCommand = useCallback(
    (data: CommandDialogSaveData) => {
      const { description, commandText, key, layout, targetGroupEditId } = data
      const newItem: EditCommandData = {
        _editId: cmdDialog?.item?._editId ?? crypto.randomUUID(),
        id: cmdDialog?.item?.id,
        description: description.trim() || undefined,
        command: isShortcuts ? key.trim() : commandText,
        layout:
          !isShortcuts && layout && layout !== 'inherit'
            ? (layout as CommandLayout)
            : undefined,
      }

      setEditBlocks((prev) => {
        let next: EditBlock[]
        if (cmdDialog?.isNew) {
          next = [...prev]
        } else {
          // 既存アイテムを現在の位置から削除
          const targetId = cmdDialog!.item!._editId
          next = prev
            .map((block) => {
              if (isEditGroup(block)) {
                return {
                  ...block,
                  commandlist: block.commandlist.filter(
                    (it) => it._editId !== targetId,
                  ),
                }
              }
              return block
            })
            .filter(
              (block) => isEditGroup(block) || block._editId !== targetId,
            ) as EditBlock[]
        }
        // 新しい位置に挿入
        if (targetGroupEditId) {
          return next.map((block) => {
            if (isEditGroup(block) && block._editId === targetGroupEditId) {
              return { ...block, commandlist: [...block.commandlist, newItem] }
            }
            return block
          })
        }
        return [...next, newItem]
      })
      setCmdDialog(null)
    },
    [cmdDialog, isShortcuts],
  )

  const upsertGroup = useCallback(
    (name: string) => {
      if (groupDialog?.isNew) {
        const newGroup: EditGroupData = {
          _editId: crypto.randomUUID(),
          group: name,
          commandlist: [],
        }
        setEditBlocks((prev) => [...prev, newGroup])
      } else {
        const targetId = groupDialog!.group!._editId
        setEditBlocks((prev) =>
          prev.map((block) => {
            if (isEditGroup(block) && block._editId === targetId) {
              return { ...block, group: name }
            }
            return block
          }),
        )
      }
      setGroupDialog(null)
    },
    [groupDialog],
  )

  const deleteCommand = useCallback((editId: string) => {
    setEditBlocks(
      (prev) =>
        prev
          .map((block) => {
            if (isEditGroup(block)) {
              return {
                ...block,
                commandlist: block.commandlist.filter(
                  (it) => it._editId !== editId,
                ),
              }
            }
            return block
          })
          .filter(
            (block) => isEditGroup(block) || block._editId !== editId,
          ) as EditBlock[],
    )
    setConfirmDialog(null)
  }, [])

  const deleteGroup = useCallback((editId: string) => {
    setEditBlocks((prev) =>
      prev.filter((block) => !(isEditGroup(block) && block._editId === editId)),
    )
    setConfirmDialog(null)
  }, [])

  // ─── DnD ──────────────────────────────────────────────────
  const performDrop = useCallback(() => {
    if (!dragInfo || !dropMark) return

    setEditBlocks((prev) => {
      const next = [...prev]

      // ドラッグ中のアイテムを取り出す
      let dragged: EditBlock | undefined

      if (dragInfo.type === 'group') {
        dragged = next[dragInfo.blockIndex]
        next.splice(dragInfo.blockIndex, 1)
      } else if (dragInfo.itemIndex !== undefined) {
        const group = next[dragInfo.blockIndex]
        if (isEditGroup(group)) {
          dragged = group.commandlist[dragInfo.itemIndex]
          const newItems = [...group.commandlist]
          newItems.splice(dragInfo.itemIndex, 1)
          next[dragInfo.blockIndex] = { ...group, commandlist: newItems }
        }
      } else {
        dragged = next[dragInfo.blockIndex]
        next.splice(dragInfo.blockIndex, 1)
      }

      if (!dragged) return prev

      // ドロップ先に挿入
      if (dropMark.kind === 'into-group') {
        // グループのインデックスを再計算（splice後ずれる可能性あり）
        let groupIdx = dropMark.groupBlockIndex
        if (
          dragInfo.type !== 'group' &&
          dragInfo.itemIndex === undefined &&
          dragInfo.blockIndex < dropMark.groupBlockIndex
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

      if (dropMark.kind === 'between-items') {
        let groupIdx = dropMark.groupBlockIndex
        if (
          dragInfo.type !== 'group' &&
          dragInfo.itemIndex === undefined &&
          dragInfo.blockIndex < dropMark.groupBlockIndex
        ) {
          groupIdx -= 1
        }
        const group = next[groupIdx]
        if (isEditGroup(group) && !isEditGroup(dragged)) {
          const newItems = [...group.commandlist]
          const insertAt = dropMark.afterItemIndex + 1
          newItems.splice(insertAt, 0, dragged as EditCommandData)
          next[groupIdx] = { ...group, commandlist: newItems }
        }
        return next
      }

      // between-blocks
      let insertAt = dropMark.afterBlockIndex + 1
      if (
        (dragInfo.type === 'group' || dragInfo.itemIndex === undefined) &&
        dragInfo.blockIndex < dropMark.afterBlockIndex
      ) {
        insertAt -= 1
      }
      next.splice(Math.max(0, insertAt), 0, dragged)
      return next
    })

    setDragInfo(null)
    setDropMark(null)
  }, [dragInfo, dropMark])

  const handleBlockDragOver = useCallback(
    (e: React.DragEvent, blockIndex: number) => {
      e.preventDefault()
      if (!dragInfo) return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const isAfter = e.clientY > rect.top + rect.height / 2
      setDropMark({
        kind: 'between-blocks',
        afterBlockIndex: isAfter ? blockIndex : blockIndex - 1,
      })
    },
    [dragInfo],
  )

  const handleGroupBodyDragOver = useCallback(
    (e: React.DragEvent, groupBlockIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      if (!dragInfo || dragInfo.type === 'group') return
      setDropMark({ kind: 'into-group', groupBlockIndex })
    },
    [dragInfo],
  )

  const handleItemInGroupDragOver = useCallback(
    (e: React.DragEvent, groupBlockIndex: number, itemIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      if (!dragInfo || dragInfo.type === 'group') return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const isAfter = e.clientY > rect.top + rect.height / 2
      setDropMark({
        kind: 'between-items',
        groupBlockIndex,
        afterItemIndex: isAfter ? itemIndex : itemIndex - 1,
      })
    },
    [dragInfo],
  )

  // ─── 通常モード計算 ───────────────────────────────────────
  const isKeyboardShortcutEnabled =
    !editMode && cheatSheetData?.type !== 'shortcut'

  const flatCommandCount = useMemo(() => {
    if (!cheatSheetData || cheatSheetData.type === 'shortcut') return 0
    return cheatSheetData.commandlist.reduce(
      (acc, item) =>
        acc + (isCommandGroupData(item) ? item.commandlist.length : 1),
      0,
    )
  }, [cheatSheetData])

  const flatStartIndices = useMemo(() => {
    if (!cheatSheetData) return []
    let acc = 0
    return cheatSheetData.commandlist.map((item) => {
      const start = acc
      acc += isCommandGroupData(item) ? item.commandlist.length : 1
      return start
    })
  }, [cheatSheetData])

  useKeyboardShortcuts(
    {
      onPKey: async () => {
        if (selectCheatSheet) {
          await togglePin()
          pinButtonRef.current?.focus()
        }
      },
      onNumberKey: (index) => {
        if (isKeyboardShortcutEnabled && index < flatCommandCount) {
          const targetElement = commandFieldRefs.current[index]
          if (targetElement) {
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              bubbles: true,
              cancelable: true,
            })
            targetElement.dispatchEvent(enterEvent)
          }
        }
      },
      onZeroKey: () => {
        sheetSwitchRef.current?.open()
        debug('[CheatSheet] 0 key: opened sheet switch dropdown')
      },
    },
    { enabled: !editMode },
  )

  // ─── レンダリング ─────────────────────────────────────────
  return (
    <>
      {/* ドラッグ領域 */}
      <Box
        data-tauri-drag-region
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${TITLEBAR_HEIGHT}px`,
          zIndex: 999,
        }}
      />

      {/* タイトルバー */}
      <WindowTitleBar
        title={selectCheatSheet || 'RightCheat'}
        rightControls={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* シート切り替え（編集モード中は無効化） */}
            <Box
              sx={{
                opacity: editMode ? 0.35 : 1,
                pointerEvents: editMode ? 'none' : 'auto',
                transition: 'opacity 0.14s',
              }}
            >
              <SheetSwitchButton
                ref={sheetSwitchRef}
                titles={cheatSheetTitles?.title ?? []}
                selected={selectCheatSheet}
                onSelect={(value) => setCheatSheet(value)}
              />
            </Box>

            {/* 編集モードトグル（鉛筆アイコン） */}
            <IconButton
              onClick={editMode ? cancelEditMode : enterEditMode}
              size='small'
              disabled={!selectCheatSheet}
              title={editMode ? 'Cancel edit mode (Esc)' : 'Edit mode'}
              sx={{
                background: editMode
                  ? theme.palette.mode === 'dark'
                    ? 'rgba(100,180,255,0.18)'
                    : 'rgba(0,113,227,0.14)'
                  : 'transparent',
                border: `0.5px solid ${editMode ? theme.palette.accent.main : 'transparent'}`,
                borderRadius: '6px',
                p: '3px',
                color: editMode
                  ? theme.palette.accent.main
                  : theme.palette.text.disabled,
                opacity: !selectCheatSheet ? 0.3 : 1,
                transition: 'all 0.15s',
                ml: '2px',
              }}
            >
              <EditOutlinedIcon sx={{ fontSize: 13 }} />
            </IconButton>

            {/* ピン留めボタン */}
            <IconButton
              ref={pinButtonRef}
              onClick={selectCheatSheet ? togglePin : undefined}
              size='small'
              disabled={!selectCheatSheet}
              title={isPinned ? 'Unpin (p)' : 'Pin (p)'}
              sx={{
                opacity: selectCheatSheet ? 1 : 0.3,
                color: isPinned
                  ? theme.palette.accent.main
                  : theme.palette.text.disabled,
                p: '4px',
              }}
            >
              {isPinned ? (
                <PushPin sx={{ fontSize: 13 }} />
              ) : (
                <PushPinOutlined sx={{ fontSize: 13 }} />
              )}
            </IconButton>
          </Box>
        }
      />

      {/* メインコンテンツ */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {errorMessage ? (
            <Alert
              severity='error'
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {errorMessage}
            </Alert>
          ) : reloading === false &&
            cheatSheetTitles !== undefined &&
            cheatSheetTitles.title.length === 0 ? (
            <Alert severity='info'>
              No cheat sheets registered.
              <br />
              Use [File] - [Import from JSON...] to import a cheat sheet.
            </Alert>
          ) : editMode ? (
            // ─── 編集モード ───────────────────────────────────
            <Stack
              spacing={0}
              onDragOver={(e) => {
                // リスト末尾へのドロップ（最後ブロックの後）
                if (dragInfo && editBlocks.length > 0) {
                  const last = e.currentTarget.lastElementChild
                  if (last) {
                    const rect = last.getBoundingClientRect()
                    if (e.clientY > rect.bottom - 20) {
                      e.preventDefault()
                      setDropMark({
                        kind: 'between-blocks',
                        afterBlockIndex: editBlocks.length - 1,
                      })
                    }
                  }
                }
              }}
              onDrop={performDrop}
              sx={{ py: 1, minHeight: '40px' }}
            >
              {editBlocks.map((block, blockIndex) => {
                const isBlockDragging =
                  dragInfo?.blockIndex === blockIndex &&
                  dragInfo.itemIndex === undefined
                const isBlockDropTarget =
                  dropMark?.kind === 'between-blocks' &&
                  dropMark.afterBlockIndex === blockIndex - 1

                return (
                  <Box key={block._editId}>
                    {/* ドロップインジケーター（上） */}
                    {isBlockDropTarget && (
                      <Box
                        sx={{
                          height: '2px',
                          background: theme.palette.accent.main,
                          borderRadius: '1px',
                          mx: 1,
                          my: '1px',
                        }}
                      />
                    )}

                    {isEditGroup(block) ? (
                      // グループ
                      <EditableGroupBox
                        groupName={block.group}
                        isEmpty={block.commandlist.length === 0}
                        isDragging={isBlockDragging}
                        isDropTarget={
                          dropMark?.kind === 'into-group' &&
                          dropMark.groupBlockIndex === blockIndex
                        }
                        onRename={() =>
                          setGroupDialog({ group: block, isNew: false })
                        }
                        onDelete={() =>
                          setConfirmDialog({
                            title: 'Delete group',
                            message: `Delete the group "${block.group}" and its ${block.commandlist.length} command(s)? This action cannot be undone.`,
                            onConfirm: () => deleteGroup(block._editId),
                          })
                        }
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDragInfo({ type: 'group', blockIndex })
                        }}
                        onDragEnd={() => {
                          setDragInfo(null)
                          setDropMark(null)
                        }}
                        onGroupBodyDragOver={(e) =>
                          handleGroupBodyDragOver(e, blockIndex)
                        }
                      >
                        <Stack spacing={0}>
                          {block.commandlist.map((item, itemIndex) => {
                            const isItemDragging =
                              dragInfo?.blockIndex === blockIndex &&
                              dragInfo.itemIndex === itemIndex
                            const isItemDropTarget =
                              dropMark?.kind === 'between-items' &&
                              dropMark.groupBlockIndex === blockIndex &&
                              dropMark.afterItemIndex === itemIndex - 1

                            return (
                              <Box key={item._editId}>
                                {isItemDropTarget && (
                                  <Box
                                    sx={{
                                      height: '2px',
                                      background: theme.palette.accent.main,
                                      borderRadius: '1px',
                                      mx: '4px',
                                      my: '1px',
                                    }}
                                  />
                                )}
                                {isShortcuts ? (
                                  <EditableShortcutRow
                                    index={itemIndex}
                                    item={item}
                                    isDragging={isItemDragging}
                                    isDropTarget={
                                      dropMark?.kind === 'between-items' &&
                                      dropMark.groupBlockIndex === blockIndex &&
                                      dropMark.afterItemIndex === itemIndex
                                    }
                                    onEdit={() =>
                                      setCmdDialog({
                                        item,
                                        initialGroupEditId: block._editId,
                                        isNew: false,
                                      })
                                    }
                                    onDelete={() =>
                                      setConfirmDialog({
                                        title: 'Delete shortcut',
                                        message: `Delete "${item.description || item.command}"? This action cannot be undone.`,
                                        onConfirm: () =>
                                          deleteCommand(item._editId),
                                      })
                                    }
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = 'move'
                                      setDragInfo({
                                        type: 'item',
                                        blockIndex,
                                        itemIndex,
                                      })
                                    }}
                                    onDragEnd={() => {
                                      setDragInfo(null)
                                      setDropMark(null)
                                    }}
                                    onDragOver={(e) =>
                                      handleItemInGroupDragOver(
                                        e,
                                        blockIndex,
                                        itemIndex,
                                      )
                                    }
                                  />
                                ) : (
                                  <EditableCommandRow
                                    index={itemIndex}
                                    item={item}
                                    isDragging={isItemDragging}
                                    isDropTarget={
                                      dropMark?.kind === 'between-items' &&
                                      dropMark.groupBlockIndex === blockIndex &&
                                      dropMark.afterItemIndex === itemIndex
                                    }
                                    onEdit={() =>
                                      setCmdDialog({
                                        item,
                                        initialGroupEditId: block._editId,
                                        isNew: false,
                                      })
                                    }
                                    onDelete={() =>
                                      setConfirmDialog({
                                        title: 'Delete command',
                                        message: `Delete "${item.description || item.command}"? This action cannot be undone.`,
                                        onConfirm: () =>
                                          deleteCommand(item._editId),
                                      })
                                    }
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = 'move'
                                      setDragInfo({
                                        type: 'item',
                                        blockIndex,
                                        itemIndex,
                                      })
                                    }}
                                    onDragEnd={() => {
                                      setDragInfo(null)
                                      setDropMark(null)
                                    }}
                                    onDragOver={(e) =>
                                      handleItemInGroupDragOver(
                                        e,
                                        blockIndex,
                                        itemIndex,
                                      )
                                    }
                                  />
                                )}
                              </Box>
                            )
                          })}
                          {/* グループ末尾ドロップインジケーター */}
                          {dropMark?.kind === 'between-items' &&
                            dropMark.groupBlockIndex === blockIndex &&
                            dropMark.afterItemIndex ===
                              block.commandlist.length - 1 && (
                              <Box
                                sx={{
                                  height: '2px',
                                  background: theme.palette.accent.main,
                                  borderRadius: '1px',
                                  mx: '4px',
                                  my: '1px',
                                }}
                              />
                            )}
                        </Stack>
                      </EditableGroupBox>
                    ) : (
                      // トップレベルアイテム
                      <>
                        {isShortcuts ? (
                          <EditableShortcutRow
                            index={
                              editBlocks
                                .slice(0, blockIndex)
                                .filter((b) => !isEditGroup(b)).length
                            }
                            item={block as EditCommandData}
                            isDragging={isBlockDragging}
                            isDropTarget={
                              dropMark?.kind === 'between-blocks' &&
                              dropMark.afterBlockIndex === blockIndex
                            }
                            onEdit={() =>
                              setCmdDialog({
                                item: block as EditCommandData,
                                initialGroupEditId: null,
                                isNew: false,
                              })
                            }
                            onDelete={() =>
                              setConfirmDialog({
                                title: 'Delete shortcut',
                                message: `Delete "${(block as EditCommandData).description || (block as EditCommandData).command}"? This action cannot be undone.`,
                                onConfirm: () =>
                                  deleteCommand(
                                    (block as EditCommandData)._editId,
                                  ),
                              })
                            }
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              setDragInfo({ type: 'item', blockIndex })
                            }}
                            onDragEnd={() => {
                              setDragInfo(null)
                              setDropMark(null)
                            }}
                            onDragOver={(e) =>
                              handleBlockDragOver(e, blockIndex)
                            }
                          />
                        ) : (
                          <EditableCommandRow
                            index={
                              editBlocks
                                .slice(0, blockIndex)
                                .filter((b) => !isEditGroup(b)).length
                            }
                            item={block as EditCommandData}
                            isDragging={isBlockDragging}
                            isDropTarget={
                              dropMark?.kind === 'between-blocks' &&
                              dropMark.afterBlockIndex === blockIndex
                            }
                            onEdit={() =>
                              setCmdDialog({
                                item: block as EditCommandData,
                                initialGroupEditId: null,
                                isNew: false,
                              })
                            }
                            onDelete={() =>
                              setConfirmDialog({
                                title: 'Delete command',
                                message: `Delete "${(block as EditCommandData).description || (block as EditCommandData).command}"? This action cannot be undone.`,
                                onConfirm: () =>
                                  deleteCommand(
                                    (block as EditCommandData)._editId,
                                  ),
                              })
                            }
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              setDragInfo({ type: 'item', blockIndex })
                            }}
                            onDragEnd={() => {
                              setDragInfo(null)
                              setDropMark(null)
                            }}
                            onDragOver={(e) =>
                              handleBlockDragOver(e, blockIndex)
                            }
                          />
                        )}
                      </>
                    )}
                  </Box>
                )
              })}

              {/* リスト末尾ドロップインジケーター */}
              {dropMark?.kind === 'between-blocks' &&
                dropMark.afterBlockIndex === editBlocks.length - 1 && (
                  <Box
                    sx={{
                      height: '2px',
                      background: theme.palette.accent.main,
                      borderRadius: '1px',
                      mx: 1,
                      my: '1px',
                    }}
                  />
                )}
            </Stack>
          ) : (
            // ─── 通常モード ───────────────────────────────────
            <>
              {cheatSheetData?.type === 'shortcut' ? (
                <Grid container spacing={1} p={1} width='100%'>
                  {cheatSheetData?.commandlist.map(
                    (item: CommandListItem, index) => {
                      if (isCommandGroupData(item)) {
                        return (
                          <Grid key={index} size={{ xs: 12 }}>
                            <ShortcutGroup
                              group={item.group}
                              commandlist={item.commandlist}
                            />
                          </Grid>
                        )
                      }
                      return (
                        <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                          <ShortcutField
                            m={0.5}
                            description={item.description ?? ''}
                            command={item.command}
                          />
                        </Grid>
                      )
                    },
                  )}
                </Grid>
              ) : (
                <Stack paddingY={1} spacing={1} width='100%'>
                  {cheatSheetData?.commandlist.map(
                    (item: CommandListItem, index) => {
                      const flatIndex = flatStartIndices[index]
                      const mode =
                        cheatSheetData.type === 'application'
                          ? 'execute'
                          : 'copy'
                      if (isCommandGroupData(item)) {
                        return (
                          <Box key={index} pt={1}>
                            <CommandFieldGroup
                              key={index}
                              group={item.group}
                              commandlist={item.commandlist}
                              startIndex={flatIndex}
                              mode={mode}
                              cheatSheetLayout={cheatSheetData.layout}
                              commandFieldRefs={commandFieldRefs}
                            />
                          </Box>
                        )
                      }
                      return (
                        <CommandField
                          key={index}
                          ref={(el) => {
                            commandFieldRefs.current[flatIndex] = el
                          }}
                          description={item.description}
                          command={item.command}
                          numberHint={
                            flatIndex < 9
                              ? (flatIndex + 1).toString()
                              : undefined
                          }
                          mode={mode}
                          layout={
                            item.layout ?? cheatSheetData.layout ?? 'inline'
                          }
                        />
                      )
                    },
                  )}
                </Stack>
              )}
            </>
          )}
        </Box>

        {/* 編集モードフッター */}
        {editMode && (
          <EditModeFooter
            isShortcuts={isShortcuts ?? false}
            editDirty={editDirty}
            isSaving={isSaving}
            onAddCommand={() =>
              setCmdDialog({
                item: null,
                initialGroupEditId: null,
                isNew: true,
              })
            }
            onAddGroup={() => setGroupDialog({ group: null, isNew: true })}
            onCancel={cancelEditMode}
            onSave={saveEditMode}
          />
        )}
      </Box>

      {/* ダイアログ */}
      {cmdDialog && (
        <CommandEditDialog
          kind={isShortcuts ? 'shortcut' : 'command'}
          item={cmdDialog.item}
          initialGroupEditId={cmdDialog.initialGroupEditId}
          groups={groupOptions}
          isNew={cmdDialog.isNew}
          onSave={upsertCommand}
          onCancel={() => setCmdDialog(null)}
        />
      )}
      {groupDialog && (
        <GroupEditDialog
          group={groupDialog.group}
          isNew={groupDialog.isNew}
          onSave={upsertGroup}
          onCancel={() => setGroupDialog(null)}
        />
      )}
      {confirmDialog && (
        <DeleteConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  )
}
