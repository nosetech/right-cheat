import { RefObject, useEffect, useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { debug } from '@tauri-apps/plugin-log'

import { Event } from '@/common'
import { useCheatSheetLoader } from '@/hooks/useCheatSheetLoader'
import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetTitleData,
} from '@/types/api/CheatSheet'

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
