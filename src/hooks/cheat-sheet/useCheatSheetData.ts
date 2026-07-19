import { RefObject, useEffect, useState } from 'react'

import { listen } from '@tauri-apps/api/event'

import { Event } from '@/common'
import { useCheatSheetLoader } from '@/hooks/useCheatSheetLoader'
import { CheatSheetData, CheatSheetTitleData } from '@/types/api/CheatSheet'

type Params = {
  editModeRef: RefObject<boolean>
}

/**
 * チートシートのタイトル一覧・選択中シートのデータのロードを管理するフック。
 * 起動時のリロード、`RELOAD_CHEAT_SHEET` イベントの購読、選択変更時のデータ取得を担う。
 */
export function useCheatSheetData({ editModeRef }: Params) {
  const [cheatSheetTitles, setCheatSheetTitles] = useState<
    CheatSheetTitleData | undefined
  >()
  const [selectCheatSheet, setCheatSheet] = useState<string>('')
  const [cheatSheetData, setCheatSheetData] = useState<CheatSheetData>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [reloading, setReloading] = useState<boolean>(false)

  const { loadCheatSheetTitles, loadCheatSheetData } = useCheatSheetLoader({
    setCheatSheetTitles,
    setCheatSheet,
    setErrorMessage,
  })

  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined
    ;(async () => {
      unlisten = await listen<{}>(Event.RELOAD_CHEAT_SHEET, () => {
        // 編集モード中はリロードしない（リロードすると選択が先頭シートへ
        // 切り替わり編集セッションが破棄されてしまう）
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
      // mount 時は自ウィンドウのタイトル一覧を読み込むだけにする。
      // 以前はここで reload_cheat_sheet を invoke していたが、これは
      // RELOAD_CHEAT_SHEET を全ウィンドウへブロードキャストするため、
      // 新規チートシートウィンドウを開くたびに既存の全ウィンドウが
      // 先頭シートへリセットされてしまう（複数ウィンドウ対応で顕在化）。
      // Cmd+R メニューや編集後の同期ブロードキャストは別経路で継続する。
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

  return {
    cheatSheetTitles,
    selectCheatSheet,
    setCheatSheet,
    cheatSheetData,
    setCheatSheetData,
    errorMessage,
    reloading,
    loadCheatSheetData,
  }
}
