'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Alert, Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { debug } from '@tauri-apps/plugin-log'

import { EditModeFooter } from '@/components/molecules/EditModeFooter'
import { SheetSwitchButtonHandle } from '@/components/molecules/SheetSwitchButton'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import {
  CheatSheetToolbar,
  EditBlockList,
  NormalCommandList,
} from '@/components/organisms/cheat-sheet'
import { ClipboardHistorySheet } from '@/components/organisms/clipboard-history'
import { RcDialog } from '@/components/organisms/RcDialog'
import { FOCUS_FALLBACK_ID } from '@/constants/focus'
import { useNotificationContext } from '@/context/NotificationContext'
import { useCheatSheetData } from '@/hooks/cheat-sheet/useCheatSheetData'
import { useCheatSheetEditMode } from '@/hooks/cheat-sheet/useCheatSheetEditMode'
import { useEditBlockActions } from '@/hooks/cheat-sheet/useEditBlockActions'
import { useEditBlockDnd } from '@/hooks/cheat-sheet/useEditBlockDnd'
import { useEditWindows } from '@/hooks/cheat-sheet/useEditWindows'
import { useScrollToCommand } from '@/hooks/cheat-sheet/useScrollToCommand'
import { useClipboardHistory } from '@/hooks/useClipboardHistory'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { usePreferencesStore } from '@/hooks/usePreferencesStore'
import { useWindowSize } from '@/hooks/useWindowSize'
import { isCommandGroupData } from '@/types/api/CheatSheet'
import { CLIPBOARD_HISTORY_SHEET_TITLE } from '@/types/api/ClipboardHistory'
import { EditBlock, getGroupOptions, isEditGroup } from '@/types/edit/EditBlock'

// ─── メインコンポーネント ─────────────────────────────────────
export const CheatSheet = () => {
  // ─── 編集モード state ─────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const editModeRef = useRef(false)
  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])

  // ─── チートシートデータ ───────────────────────────────────
  const {
    cheatSheetTitles,
    selectCheatSheet,
    setCheatSheet,
    cheatSheetData,
    setCheatSheetData,
    errorMessage,
    reloading,
    loadCheatSheetData,
  } = useCheatSheetData({ editModeRef })

  // ─── クリップボード履歴（擬似シート） ─────────────────────
  const isHistorySheet = selectCheatSheet === CLIPBOARD_HISTORY_SHEET_TITLE
  const history = useClipboardHistory({ active: isHistorySheet })

  // 履歴シートから離れたら編集モードを解除する（インポート等による
  // シート再読み込みで選択が切り替わるケース）
  useEffect(() => {
    if (!isHistorySheet && history.editMode) {
      history.cancelEditMode()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHistorySheet, history.editMode])

  const theme = useTheme()
  // 編集モード中はピン留めでもウィンドウサイズを変更できるようにする
  // 履歴シートは DB 上のチートシートではないためピン留め（サイズ保存）非対応
  const { isPinned, togglePin } = useWindowSize(
    isHistorySheet ? '' : selectCheatSheet,
    editMode,
  )
  const { showError } = useNotificationContext() ?? {}
  const { getConfirmActions } = usePreferencesStore()

  const commandFieldRefs = useRef<Array<HTMLDivElement | null>>([])
  const pinButtonRef = useRef<HTMLButtonElement>(null)
  const sheetSwitchRef = useRef<SheetSwitchButtonHandle>(null)

  const [editBlocks, setEditBlocks] = useState<EditBlock[]>([])

  const {
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
  } = useEditBlockDnd({ editBlocks, setEditBlocks })

  const isShortcuts = cheatSheetData?.type === 'shortcut'

  const groupOptions = useMemo(() => getGroupOptions(editBlocks), [editBlocks])

  // ─── 検索ウィンドウからのスクロール／フォーカス ─────────────
  useScrollToCommand({
    cheatSheetData,
    selectCheatSheet,
    setCheatSheet,
    editModeRef,
    commandFieldRefs,
  })

  // ─── コマンド/グループ操作 ────────────────────────────────
  const { upsertCommand, upsertGroup, deleteCommand, deleteGroup } =
    useEditBlockActions({ isShortcuts, setEditBlocks })

  // ─── 別ウィンドウ編集 ──────────────────────────────────────
  const {
    isEditWindowOpen,
    openCmdEditWindow,
    openGroupEditWindow,
    closeEditWindows,
  } = useEditWindows({
    editMode,
    cheatSheetType: cheatSheetData?.type,
    isShortcuts,
    groupOptions,
    onUpsertCommand: upsertCommand,
    onUpsertGroup: upsertGroup,
  })

  // ─── 編集モード操作 ───────────────────────────────────────
  const {
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
  } = useCheatSheetEditMode({
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
  })

  // ─── 通常モード計算 ───────────────────────────────────────
  const isKeyboardShortcutEnabled =
    !editMode && !history.editMode && cheatSheetData?.type !== 'shortcut'

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

  const numberKeyTargetCount = isHistorySheet
    ? history.items.length
    : flatCommandCount

  useKeyboardShortcuts(
    {
      onPKey: async () => {
        if (selectCheatSheet && !isHistorySheet) {
          await togglePin()
          pinButtonRef.current?.focus()
        }
      },
      onEKey: () => {
        if (isHistorySheet) {
          history.enterEditMode()
        } else if (selectCheatSheet) {
          void enterEditMode()
        }
      },
      onNumberKey: (index) => {
        if (isKeyboardShortcutEnabled && index < numberKeyTargetCount) {
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
    { enabled: !editMode && !history.editMode && !isEditWindowOpen },
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
            titles={[
              ...(cheatSheetTitles?.title ?? []),
              CLIPBOARD_HISTORY_SHEET_TITLE,
            ]}
            selected={selectCheatSheet}
            onSelect={(value) => setCheatSheet(value)}
            editMode={isHistorySheet ? history.editMode : editMode}
            onToggleEdit={
              isHistorySheet
                ? history.editMode
                  ? history.cancelEditMode
                  : history.enterEditMode
                : editMode
                  ? cancelEditMode
                  : enterEditMode
            }
            isPinned={isPinned}
            onTogglePin={togglePin}
            pinDisabled={isHistorySheet}
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
        {isHistorySheet ? (
          // ─── クリップボード履歴シート ─────────────────────────
          <ClipboardHistorySheet
            history={history}
            itemRefs={commandFieldRefs}
          />
        ) : (
          <>
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
          </>
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
