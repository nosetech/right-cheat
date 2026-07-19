'use client'
import { scaledPx } from '@/utils/css'
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { emitTo, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { debug, error as logError } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { SearchBar } from '@/components/molecules/SearchBar'
import { WindowHeader } from '@/components/molecules/WindowHeader'
import { SearchResults } from '@/components/organisms/SearchResults'
import { TITLEBAR_HEIGHT } from '@/constants/layout'
import { useCommandSearch } from '@/hooks/useCommandSearch'
import { FONT_UI } from '@/theme/fonts'
import { CommandSearchResult } from '@/types/api/CheatSheet'
import { WindowAPI } from '@/types/api/Window'

// 新規チートシートウィンドウの READY を待つ最大時間（ミリ秒）。
// READY が届かなくても取りこぼさないためのフォールバック。
const CHEAT_SHEET_READY_TIMEOUT_MS = 5000

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

  // 指定ラベルのチートシートウィンドウへ OPEN_CHEAT_SHEET を emit し、表示・フォーカスする。
  const emitAndReveal = async (label: string, hit: CommandSearchResult) => {
    await emitTo(label, Event.OPEN_CHEAT_SHEET, {
      title: hit.cheatsheet_title,
      commandId: hit.id,
    })
    const win = await WebviewWindow.getByLabel(label)
    if (win) {
      await win.show()
      await win.setFocus()
    }
  }

  // チートシートウィンドウが 1 つも無い場合に新規ウィンドウを開き、
  // OPEN_CHEAT_SHEET を受信できる状態（READY）になってから emit する。
  const openInNewWindowAndReveal = async (hit: CommandSearchResult) => {
    let readyResolve: () => void = () => {}
    const readyPromise = new Promise<void>((resolve) => {
      readyResolve = resolve
    })
    // 生成したウィンドウのラベル。READY 受信時の照合に使う。
    let targetLabel = ''
    // READY の取りこぼしを防ぐため、ウィンドウを開く前にリスナーを登録する。
    const unlisten = await listen<{ label: string }>(
      Event.CHEAT_SHEET_READY,
      (e) => {
        if (e.payload?.label && e.payload.label === targetLabel) {
          readyResolve()
        }
      },
    )
    try {
      targetLabel = await invoke<string>(WindowAPI.OPEN_CHEAT_SHEET_WINDOW)
      debug(`[search] opened new cheatsheet window '${targetLabel}'`)
      await Promise.race([
        readyPromise,
        new Promise<void>((resolve) =>
          setTimeout(resolve, CHEAT_SHEET_READY_TIMEOUT_MS),
        ),
      ])
      await emitAndReveal(targetLabel, hit)
    } finally {
      unlisten()
    }
  }

  // 選択したコマンドの属するチートシートを、最後にフォーカスされたチートシート
  // ウィンドウに表示して閉じる。該当ウィンドウが無ければ新規ウィンドウで開く。
  // 失敗時はウィンドウを閉じず、エラーをログ出力するに留める。
  const openCheatSheet = async (hit: CommandSearchResult) => {
    try {
      const target = await invoke<string | null>(
        WindowAPI.GET_LAST_FOCUSED_CHEAT_SHEET_WINDOW,
      )
      if (target) {
        await emitAndReveal(target, hit)
      } else {
        await openInNewWindowAndReveal(hit)
      }
      debug(
        `[search] open_cheat_sheet title='${hit.cheatsheet_title}' commandId=${hit.id}`,
      )
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
      <WindowHeader title='Search' />

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
