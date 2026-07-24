'use client'
import { useCallback, useEffect, useRef } from 'react'

import { Box } from '@mui/material'
import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from '@tauri-apps/api/webviewWindow'

import { Event } from '@/common'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import {
  ClipboardHistorySheet,
  ClipboardHistoryToolbar,
} from '@/components/organisms/clipboard-history'
import { FOCUS_FALLBACK_ID } from '@/constants/focus'
import { useNotificationContext } from '@/context/NotificationContext'
import { useClipboardHistory } from '@/hooks/useClipboardHistory'
import { useClipboardHistoryWindowSize } from '@/hooks/useClipboardHistoryWindowSize'
import { useHeatBarColor } from '@/hooks/useHeatBarColor'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ClipboardHistoryItem } from '@/types/api/ClipboardHistory'

const ADD_WINDOW_LABEL = 'add_to_cheatsheet'

/**
 * Clipboard History ウィンドウ（独立ウィンドウ）。
 * 履歴一覧・再コピー・編集モード・ピン留め・Add to Cheat Sheet（別ウィンドウ）を提供する。
 */
export default function ClipboardHistoryPage() {
  const history = useClipboardHistory()
  const { editMode } = history
  const { isPinned, togglePin } = useClipboardHistoryWindowSize(editMode)
  const heatBarColor = useHeatBarColor()
  const { showSuccess } = useNotificationContext() ?? {}

  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const pinButtonRef = useRef<HTMLButtonElement>(null)

  // Add to Cheat Sheet ウィンドウを開く（多重起動時は既存へフォーカス）
  const openAddToCheatSheetWindow = useCallback(
    async (item: ClipboardHistoryItem) => {
      const existing = await WebviewWindow.getByLabel(ADD_WINDOW_LABEL)
      if (existing) {
        await existing.setFocus()
        return
      }

      const win = getCurrentWebviewWindow()
      await win.once(Event.ADD_TO_CHEATSHEET_READY, async () => {
        await win.emitTo(ADD_WINDOW_LABEL, Event.ADD_TO_CHEATSHEET_INIT, {
          text: item.text,
        })
      })

      new WebviewWindow(ADD_WINDOW_LABEL, {
        url: '/add-to-cheatsheet',
        title: 'Add to Cheat Sheet',
        width: 460,
        height: 620,
        resizable: false,
        titleBarStyle: 'overlay',
        hiddenTitle: true,
        alwaysOnTop: true,
      })
    },
    [],
  )

  // Add to Cheat Sheet ウィンドウからの登録完了通知で成功トーストを表示する
  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | null = null
    ;(async () => {
      unlisten = await getCurrentWebviewWindow().listen<{ sheetTitle: string }>(
        Event.ADD_TO_CHEATSHEET_ADDED,
        (event) => {
          showSuccess?.(`Added to "${event.payload.sheetTitle}"`)
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
  }, [showSuccess])

  // キーボード操作（編集モード中は無効。Esc は useClipboardHistory 側で処理）
  useKeyboardShortcuts(
    {
      onPKey: async () => {
        await togglePin()
        pinButtonRef.current?.focus()
      },
      onEKey: () => {
        history.enterEditMode()
      },
      onNumberKey: (index) => {
        if (index < history.items.length) {
          const targetElement = itemRefs.current[index]
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
    },
    { enabled: !editMode },
  )

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingX: '4px',
      }}
    >
      {/* ウィンドウ操作後に WKWebView の native first responder を取り戻すための
          フォールバックフォーカス要素（useClipboardHistoryWindowSize が使用）。 */}
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

      <WindowHeader
        title='Clipboard History'
        rightControls={
          <ClipboardHistoryToolbar
            editMode={editMode}
            onToggleEdit={
              editMode ? history.cancelEditMode : history.enterEditMode
            }
            isPinned={isPinned}
            onTogglePin={togglePin}
            pinButtonRef={pinButtonRef}
          />
        }
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <ClipboardHistorySheet
          history={history}
          itemRefs={itemRefs}
          onAddToSheet={openAddToCheatSheetWindow}
          heatBarColor={heatBarColor}
        />
      </Box>
    </Box>
  )
}
