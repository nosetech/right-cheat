import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react'

import { listen } from '@tauri-apps/api/event'
import { debug } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { CheatSheetData, isCommandGroupData } from '@/types/api/CheatSheet'

type Params = {
  cheatSheetData?: CheatSheetData
  selectCheatSheet: string
  setCheatSheet: Dispatch<SetStateAction<string>>
  editModeRef: RefObject<boolean>
  commandFieldRefs: RefObject<Array<HTMLDivElement | null>>
}

/**
 * 検索ウィンドウからの `OPEN_CHEAT_SHEET` を受けて、指定コマンドへ
 * スクロール／フォーカスする副作用フック。
 * 対象シートが未表示ならデータロード完了後に消化し、表示済みなら即座に実行する。
 */
export function useScrollToCommand({
  cheatSheetData,
  selectCheatSheet,
  setCheatSheet,
  editModeRef,
  commandFieldRefs,
}: Params) {
  // 保留中のスクロール対象コマンドID。データロード後の useEffect で消化する。
  const pendingScrollCommandIdRef = useRef<number | null>(null)
  // イベントリスナー内（クロージャが mount 時で固定される）から最新値を参照するための ref。
  const cheatSheetDataRef = useRef<CheatSheetData | undefined>(undefined)
  const selectCheatSheetRef = useRef<string>('')

  // イベントリスナーから最新の state を参照できるよう ref に同期する。
  useEffect(() => {
    cheatSheetDataRef.current = cheatSheetData
  }, [cheatSheetData])
  useEffect(() => {
    selectCheatSheetRef.current = selectCheatSheet
  }, [selectCheatSheet])

  // 指定されたコマンドID（DBのコマンドID）の CommandField を画面中央へ
  // スクロールし、フォーカスする。command / application タイプのみ対応。
  const scrollToCommandById = useCallback(
    (commandId: number) => {
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
    },
    [commandFieldRefs],
  )

  // チートシートデータ確定後、保留中のスクロール対象があれば消化する。
  useEffect(() => {
    if (!cheatSheetData) return
    const pending = pendingScrollCommandIdRef.current
    if (pending == null) return
    pendingScrollCommandIdRef.current = null
    scrollToCommandById(pending)
  }, [cheatSheetData, scrollToCommandById])

  // 検索ウィンドウからのチートシート切り替え。
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
  }, [scrollToCommandById, editModeRef, setCheatSheet])
}
