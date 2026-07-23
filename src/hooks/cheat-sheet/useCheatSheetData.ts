import { RefObject, useEffect, useRef, useState } from 'react'

import { listen } from '@tauri-apps/api/event'

import { Event } from '@/common'
import { useCheatSheetLoader } from '@/hooks/useCheatSheetLoader'
import { CheatSheetData, CheatSheetTitleData } from '@/types/api/CheatSheet'

type Params = {
  editModeRef: RefObject<boolean>
}

const firstTitleOf = (titles: CheatSheetTitleData): string =>
  titles.title.length > 0 ? titles.title[0] : ''

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

  // RELOAD_CHEAT_SHEET リスナーはマウント時に一度だけ登録されるため、
  // 内部のクロージャが selectCheatSheet の古い値を参照しないよう ref で保持する
  const selectCheatSheetRef = useRef<string>('')
  useEffect(() => {
    selectCheatSheetRef.current = selectCheatSheet
  }, [selectCheatSheet])

  const { loadCheatSheetTitles, loadCheatSheetData } = useCheatSheetLoader({
    setCheatSheetTitles,
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
          const currentTitle = selectCheatSheetRef.current
          const titles = await loadCheatSheetTitles()
          if (titles) {
            if (currentTitle !== '' && titles.title.includes(currentTitle)) {
              // 表示中のチートシートを維持したまま、コマンドデータのみ再取得する
              // （selectCheatSheet 自体は変化しないため、下の useEffect には
              // 任せられず明示的に呼び出す必要がある）。
              // この await 中にユーザーが手動でシートを切り替える可能性があるため、
              // 完了後に selectCheatSheetRef が currentTitle のままかを再確認してから
              // 反映する（切り替え後のシートを古いデータで上書きしないためのガード）。
              const data = await loadCheatSheetData(currentTitle)
              if (selectCheatSheetRef.current === currentTitle) {
                setCheatSheetData(data)
              }
            } else {
              // 表示中のチートシートがリロード後の一覧に存在しない場合のみ
              // 先頭のチートシートへフォールバックする
              setCheatSheet(firstTitleOf(titles))
            }
          }
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
      const titles = await loadCheatSheetTitles()
      if (titles) {
        setCheatSheet(firstTitleOf(titles))
      }
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
