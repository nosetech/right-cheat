'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Alert, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from '@tauri-apps/api/webviewWindow'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { EditModeFooter } from '@/components/molecules/EditModeFooter'
import { SheetSwitchButtonHandle } from '@/components/molecules/SheetSwitchButton'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import {
  CheatSheetToolbar,
  EditBlockList,
  NormalCommandList,
} from '@/components/organisms/cheat-sheet'
import { RcDialog } from '@/components/organisms/RcDialog'
import { FOCUS_FALLBACK_ID } from '@/constants/focus'
import { useNotificationContext } from '@/context/NotificationContext'
import { useCheatSheetLoader } from '@/hooks/useCheatSheetLoader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useWindowCloseShortcuts } from '@/hooks/useWindowCloseShortcuts'
import { useWindowSize } from '@/hooks/useWindowSize'
import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetTitleData,
  CommandLayout,
  isCommandGroupData,
} from '@/types/api/CheatSheet'
import { DragInfo, DropMark } from '@/types/edit/dnd'
import {
  EditBlock,
  EditCommandData,
  EditGroupData,
  fromEditBlocks,
  getGroupOptions,
  isEditGroup,
  toEditBlocks,
} from '@/types/edit/EditBlock'
import {
  EditCommandInitPayload,
  EditCommandSavePayload,
  EditGroupInitPayload,
  EditGroupSavePayload,
} from '@/types/edit/EditWindow'

// ─── メインコンポーネント ─────────────────────────────────────
export const CheatSheet = () => {
  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')
  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [reloading, setReloading] = useState<boolean>(false)

  // ─── 編集モード state ─────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const editModeRef = useRef(false)
  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  const theme = useTheme()
  // 編集モード中はピン留めでもウィンドウサイズを変更できるようにする
  const { isPinned, togglePin } = useWindowSize(selectCheatSheet, editMode)
  const { showError } = useNotificationContext() ?? {}
  const { getConfirmActions } = usePreferencesStore()

  const commandFieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const pinButtonRef = useRef<HTMLButtonElement>(null)
  const sheetSwitchRef = useRef<SheetSwitchButtonHandle>(null)

  // 検索ウィンドウから指定されたコマンドへスクロール／フォーカスするための
  // 保留中のコマンドID。データロード後の useEffect で消化する。
  const pendingScrollCommandIdRef = useRef<number | null>(null)
  // イベントリスナー内（クロージャが mount 時で固定される）から最新値を
  // 参照するための ref。
  const cheatSheetDataRef = useRef<CheatSheetData | undefined>(undefined)
  const selectCheatSheetRef = useRef<string>('')

  const { loadCheatSheetTitles, loadCheatSheetData } = useCheatSheetLoader({
    setCheatSheetTitles,
    setCheatSheet,
    setErrorMessage,
  })

  const [editBlocks, setEditBlocks] = useState<EditBlock[]>([])
  const [editSnapshot, setEditSnapshot] = useState<EditBlock[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Confirm before actions 設定（Cancel/Save 時の確認ダイアログ表示制御）
  const [confirmActions, setConfirmActions] = useState<boolean>(true)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)

  // 編集ウィンドウ（edit_command / edit_group）の開閉カウント
  const [editWindowOpenCount, setEditWindowOpenCount] = useState(0)
  const isEditWindowOpen = editWindowOpenCount > 0

  // DnD state
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)
  const [dropMark, setDropMark] = useState<DropMark | null>(null)

  // Pointer Events DnD refs
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

  // イベントリスナーから最新の state を参照できるよう ref に同期する。
  useEffect(() => {
    cheatSheetDataRef.current = cheatSheetData
  }, [cheatSheetData])
  useEffect(() => {
    selectCheatSheetRef.current = selectCheatSheet
  }, [selectCheatSheet])

  // 指定されたコマンドID（DBのコマンドID）の CommandField を画面中央へ
  // スクロールし、フォーカスする。command / application タイプのみ対応。
  const scrollToCommandById = useCallback((commandId: number) => {
    const data = cheatSheetDataRef.current
    if (!data || data.type === 'shortcut') return

    // 通常モードの flatStartIndices と同仕様でフラットインデックスを算出する。
    let flatIndex = -1
    let acc = 0
    for (const item of data.commandlist) {
      if (isCommandGroupData(item)) {
        for (const cmd of item.commandlist) {
          if (cmd.id === commandId) {
            flatIndex = acc
            break
          }
          acc += 1
        }
      } else {
        if (item.id === commandId) {
          flatIndex = acc
        }
        acc += 1
      }
      if (flatIndex !== -1) break
    }
    if (flatIndex === -1) return

    // 新しいデータの描画（ref 設定）が完了してから実行する。
    requestAnimationFrame(() => {
      const el = commandFieldRefs.current[flatIndex]
      if (el) {
        el.scrollIntoView({ block: 'center' })
        el.focus()
        debug(
          `[CheatSheet] scroll/focus to command id=${commandId} index=${flatIndex}`,
        )
      }
    })
  }, [])

  // チートシートデータ確定後、保留中のスクロール対象があれば消化する。
  useEffect(() => {
    if (!cheatSheetData) return
    const pending = pendingScrollCommandIdRef.current
    if (pending == null) return
    pendingScrollCommandIdRef.current = null
    scrollToCommandById(pending)
  }, [cheatSheetData, scrollToCommandById])

  // ─── 検索ウィンドウからのチートシート切り替え ─────────────
  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined
    ;(async () => {
      unlisten = await listen<{ title: string; commandId?: number }>(
        Event.OPEN_CHEAT_SHEET,
        (e) => {
          // 編集中は切り替えない（編集内容の消失を防ぐ）
          if (editModeRef.current) return
          const title = e.payload?.title
          const commandId = e.payload?.commandId
          if (title) {
            debug(
              `[CheatSheet] open_cheat_sheet: switch to '${title}' commandId=${commandId}`,
            )
            if (typeof commandId === 'number') {
              pendingScrollCommandIdRef.current = commandId
            }
            if (title === selectCheatSheetRef.current) {
              // 既に同じシートが表示済み → 再ロードが走らず消化 effect が
              // 発火しないため、その場で直接スクロール／フォーカスする。
              const pending = pendingScrollCommandIdRef.current
              if (pending != null) {
                pendingScrollCommandIdRef.current = null
                scrollToCommandById(pending)
              }
            } else {
              setCheatSheet(title)
            }
          }
        },
      )
      if (cancelled) {
        unlisten()
        unlisten = undefined
      }
    })()
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [scrollToCommandById])

  // ─── 編集モード操作 ───────────────────────────────────────
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
  }, [cheatSheetData, getConfirmActions])

  // 編集を破棄して編集モードを終了する（確認後の実処理）
  const doCancel = useCallback(async () => {
    setConfirmCancelOpen(false)
    await WebviewWindow.getByLabel('edit_command').then((w) => w?.destroy())
    await WebviewWindow.getByLabel('edit_group').then((w) => w?.destroy())
    setEditWindowOpenCount(0)
    if (editSnapshot) setEditBlocks(JSON.parse(JSON.stringify(editSnapshot)))
    setEditSnapshot(null)
    setEditMode(false)
    setDragInfo(null)
    setDropMark(null)
  }, [editSnapshot])

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
  }, [selectCheatSheet, editBlocks, loadCheatSheetData, showError])

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

  // ─── コマンド/グループ操作 ────────────────────────────────
  const upsertCommand = useCallback(
    (payload: EditCommandSavePayload) => {
      const {
        _editId,
        dbId,
        isNew,
        description,
        commandText,
        key,
        layout,
        targetGroupEditId,
      } = payload
      const newItem: EditCommandData = {
        _editId,
        id: dbId,
        description: description.trim() || undefined,
        command: isShortcuts ? key.trim() : commandText,
        layout:
          !isShortcuts && layout && layout !== 'inherit'
            ? (layout as CommandLayout)
            : undefined,
      }

      setEditBlocks((prev) => {
        let next: EditBlock[]
        if (isNew) {
          next = [...prev]
        } else {
          // 既存アイテムを現在の位置から削除
          next = prev
            .map((block) => {
              if (isEditGroup(block)) {
                return {
                  ...block,
                  commandlist: block.commandlist.filter(
                    (it) => it._editId !== _editId,
                  ),
                }
              }
              return block
            })
            .filter(
              (block) => isEditGroup(block) || block._editId !== _editId,
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
    },
    [isShortcuts],
  )

  const upsertGroup = useCallback((payload: EditGroupSavePayload) => {
    const { _editId, isNew, name } = payload
    if (isNew) {
      const newGroup: EditGroupData = {
        _editId,
        group: name,
        commandlist: [],
      }
      setEditBlocks((prev) => [...prev, newGroup])
    } else {
      setEditBlocks((prev) =>
        prev.map((block) => {
          if (isEditGroup(block) && block._editId === _editId) {
            return { ...block, group: name }
          }
          return block
        }),
      )
    }
  }, [])

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
  }, [])

  const deleteGroup = useCallback((editId: string) => {
    setEditBlocks((prev) =>
      prev.filter((block) => !(isEditGroup(block) && block._editId === editId)),
    )
  }, [])

  // ─── 別ウィンドウ編集 ──────────────────────────────────────
  const upsertCommandRef = useRef(upsertCommand)
  useEffect(() => {
    upsertCommandRef.current = upsertCommand
  }, [upsertCommand])

  const upsertGroupRef = useRef(upsertGroup)
  useEffect(() => {
    upsertGroupRef.current = upsertGroup
  }, [upsertGroup])

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
      const existing = await WebviewWindow.getByLabel('edit_command')
      if (existing) {
        await existing.setFocus()
        return
      }

      const win = getCurrentWebviewWindow()
      const initData: EditCommandInitPayload = {
        // 実際のシート種別（command / application / shortcut）を渡す。
        // command と application は編集画面で現状同じ扱いだが、将来分岐できるようにする
        kind: cheatSheetData?.type ?? 'command',
        item,
        groups: groupOptions,
        initialGroupEditId,
        isNew,
      }
      const windowHeight = isShortcuts ? 390 : 570

      await win.once(Event.EDIT_COMMAND_READY, async () => {
        await win.emitTo('edit_command', Event.EDIT_COMMAND_INIT, initData)
      })

      const editWin = new WebviewWindow('edit_command', {
        url: '/edit-command',
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
    [isShortcuts, cheatSheetData?.type, groupOptions],
  )

  const openGroupEditWindow = useCallback(
    async (group: EditGroupData | null, isNew: boolean) => {
      const existing = await WebviewWindow.getByLabel('edit_group')
      if (existing) {
        await existing.setFocus()
        return
      }

      const win = getCurrentWebviewWindow()
      const initData: EditGroupInitPayload = {
        group,
        isNew,
      }

      await win.once(Event.EDIT_GROUP_READY, async () => {
        await win.emitTo('edit_group', Event.EDIT_GROUP_INIT, initData)
      })

      const editWin = new WebviewWindow('edit_group', {
        url: '/edit-group',
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

  // ─── DnD ──────────────────────────────────────────────────
  const performDropWith = useCallback((info: DragInfo, mark: DropMark) => {
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
  }, [])

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

  // 編集モードでもグループに関わらず連番で番号を振るため、各ブロックの
  // 先頭フラットインデックスを計算する（通常モードの flatStartIndices と同仕様）
  const editFlatStartIndices = useMemo(() => {
    let acc = 0
    return editBlocks.map((block) => {
      const start = acc
      acc += isEditGroup(block) ? block.commandlist.length : 1
      return start
    })
  }, [editBlocks])

  useKeyboardShortcuts(
    {
      onPKey: async () => {
        if (selectCheatSheet) {
          await togglePin()
          pinButtonRef.current?.focus()
        }
      },
      onEKey: () => {
        if (selectCheatSheet) {
          void enterEditMode()
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
    { enabled: !editMode && !isEditWindowOpen },
  )

  // ─── レンダリング ─────────────────────────────────────────
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingX: '4px',
      }}
    >
      {/* ウィンドウ操作（setResizable / setSize）後に WKWebView の native
          first responder を取り戻すためのフォールバックフォーカス要素。
          Tab では到達せず、フォーカス可能な要素が無いときの focus 退避先となる。 */}
      <Box
        id={FOCUS_FALLBACK_ID}
        tabIndex={-1}
        aria-hidden
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          outline: 'none',
        }}
      />

      {/* タイトルバー（ドラッグ領域込み） */}
      <WindowHeader
        title={selectCheatSheet || 'RightCheat'}
        rightControls={
          <CheatSheetToolbar
            titles={cheatSheetTitles?.title ?? []}
            selected={selectCheatSheet}
            onSelect={(value) => setCheatSheet(value)}
            editMode={editMode}
            onToggleEdit={editMode ? cancelEditMode : enterEditMode}
            isPinned={isPinned}
            onTogglePin={togglePin}
            sheetSwitchRef={sheetSwitchRef}
            pinButtonRef={pinButtonRef}
          />
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
        <Box
          ref={scrollContainerRef}
          sx={{ flex: 1, overflow: 'auto', px: 1.5, py: 1 }}
        >
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
            <EditBlockList
              editBlocks={editBlocks}
              isShortcuts={isShortcuts}
              cheatSheetLayout={cheatSheetData?.layout}
              dragInfo={dragInfo}
              dropMark={dropMark}
              editFlatStartIndices={editFlatStartIndices}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              blockRefsMap={blockRefsMap}
              groupBodyRefsMap={groupBodyRefsMap}
              itemRefsMap={itemRefsMap}
              onEditCommand={openCmdEditWindow}
              onDeleteCommand={deleteCommand}
              onRenameGroup={(group) => openGroupEditWindow(group, false)}
              onDeleteGroup={deleteGroup}
            />
          ) : (
            // ─── 通常モード ───────────────────────────────────
            <NormalCommandList
              cheatSheetData={cheatSheetData}
              flatStartIndices={flatStartIndices}
              commandFieldRefs={commandFieldRefs}
            />
          )}
        </Box>

        {/* 編集モードフッター */}
        {editMode && (
          <EditModeFooter
            isShortcuts={isShortcuts ?? false}
            editDirty={editDirty}
            isSaving={isSaving}
            onAddCommand={() => openCmdEditWindow(null, null, true)}
            onAddGroup={() => openGroupEditWindow(null, true)}
            onCancel={cancelEditMode}
            onSave={saveEditMode}
          />
        )}
      </Box>

      <RcDialog
        open={confirmSaveOpen}
        variant='confirmation'
        title='Save Changes'
        message='Save changes and close edit mode?'
        onYes={doSave}
        yesLabel='Save'
        onNo={() => setConfirmSaveOpen(false)}
        noLabel='Cancel'
      />
      <RcDialog
        open={confirmCancelOpen}
        variant='confirmation'
        title='Discard Changes'
        message='You have unsaved changes. Discard them?'
        onYes={doCancel}
        yesLabel='Discard'
        onNo={() => setConfirmCancelOpen(false)}
        noLabel='Keep editing'
      />

      {/* 編集ウィンドウが開いている間のインタラクション遮断オーバーレイ */}
      {isEditWindowOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(0, 0, 0, 0.45)'
                : 'rgba(0, 0, 0, 0.18)',
            cursor: 'default',
          }}
        />
      )}
    </Box>
  )
}
