'use client'
import { scaledPx } from '@/utils/css'
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { SearchBar } from '@/components/molecules/SearchBar'
import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { SearchResults } from '@/components/organisms/SearchResults'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { useCommandSearch } from '@/hooks/useCommandSearch'
import { CommandSearchResult } from '@/types/api/CheatSheet'

const FONT_UI =
  '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'

// コマンド全文検索ウィンドウ（RightCheat Mockup v16 / Search 画面に準拠）。
export default function SearchPage() {
  const theme = useTheme()
  const { query, setQuery, debouncedQuery, results } = useCommandSearch('')
  const [focusIdx, setFocusIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // IME 変換中フラグ。macOS の WKWebView では変換確定 Enter の keydown 時に
  // nativeEvent.isComposing が false になることがあるため、compositionstart /
  // compositionend で状態を自前管理する（確定 Enter の keydown は compositionend
  // より前に発火するため、この ref はまだ true のまま）。
  const isComposingRef = useRef(false)
  // compositionend が keydown より先に発火する順序（この場合 isComposingRef は
  // 既に false）に備え、確定直後の Enter をタイムスタンプでもガードする。
  const lastCompositionEndAtRef = useRef(0)

  // ヒットしたチートシート数
  const sheetCount = useMemo(
    () => new Set(results.map((r) => r.cheatsheet_title)).size,
    [results],
  )

  // クエリ変更時はフォーカスを先頭へ
  useEffect(() => {
    setFocusIdx(0)
  }, [debouncedQuery])

  const closeWindow = async () => {
    try {
      await getCurrentWindow().close()
    } catch (e) {
      logError(`[search] close window error: ${String(e)}`)
    }
  }

  // 選択したコマンドの属するチートシートをメインウィンドウに表示して閉じる。
  // 失敗時はウィンドウを閉じず、エラーをログ出力するに留める。
  const openCheatSheet = async (hit: CommandSearchResult) => {
    try {
      await emitTo('main', Event.OPEN_CHEAT_SHEET, {
        title: hit.cheatsheet_title,
        commandId: hit.id,
      })
      debug(
        `[search] open_cheat_sheet title='${hit.cheatsheet_title}' commandId=${hit.id}`,
      )
      const main = await WebviewWindow.getByLabel('main')
      if (main) {
        await main.show()
        await main.setFocus()
      }
      await getCurrentWindow().close()
    } catch (e) {
      logError(`[search] open_cheat_sheet error: ${String(e)}`)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // IME 変換中（日本語入力など）のキー操作は無視する。
    // 変換確定の Enter で検索結果が開いてしまうのを防ぐ。
    if (isComposingRef.current || e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // 変換確定直後（compositionend 直後）の Enter は無視する
      if (Date.now() - lastCompositionEndAtRef.current < 100) return
      const hit = results[focusIdx]
      if (hit) void openCheatSheet(hit)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      void closeWindow()
    }
  }

  return (
    <>
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
      <WindowTitleBar title='Search' />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: `calc(100vh - ${TITLEBAR_HEIGHT}px)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <SearchBar
          value={query}
          onChange={setQuery}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
            lastCompositionEndAtRef.current = Date.now()
          }}
          inputRef={inputRef}
        />

        {/* Status row */}
        <Box
          sx={{
            padding: '0 18px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '18px',
          }}
        >
          <Box
            sx={{
              fontFamily: FONT_UI,
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: theme.palette.text.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {debouncedQuery ? (
              results.length > 0 ? (
                <>
                  <Box
                    component='strong'
                    sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                  >
                    {results.length}
                  </Box>
                  {results.length === 1 ? ' result' : ' results'}
                  <Box
                    component='span'
                    sx={{ color: theme.palette.text.disabled }}
                  >
                    ·
                  </Box>
                  <Box
                    component='strong'
                    sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                  >
                    {sheetCount}
                  </Box>
                  {sheetCount === 1 ? ' cheatsheet' : ' cheatsheets'}
                </>
              ) : (
                <Box
                  component='span'
                  sx={{ color: theme.palette.text.disabled }}
                >
                  No matches
                </Box>
              )
            ) : (
              <Box component='span' sx={{ color: theme.palette.text.disabled }}>
                Type to search across all cheatsheets
              </Box>
            )}
          </Box>
        </Box>

        <SearchResults
          debouncedQuery={debouncedQuery}
          results={results}
          focusIdx={focusIdx}
          onSelect={(hit) => void openCheatSheet(hit)}
          onHover={setFocusIdx}
        />
      </Box>
    </>
  )
}
