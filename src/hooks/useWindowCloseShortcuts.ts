import { useEffect } from 'react'

type UseWindowCloseShortcutsParams = {
  // false の間はリスナーを登録しない（例: 編集モード外・初期化前・確認ダイアログ表示中）
  enabled?: boolean
  // Cmd/Ctrl+S 押下時の処理。省略した画面では Cmd+S を無効化する（Esc のみ）。
  onSave?: () => void
  // Esc 押下時の処理（ウィンドウを閉じる／編集キャンセル等）
  onCancel?: () => void
}

/**
 * ウィンドウレベルの Cmd+S（保存）／ Esc（キャンセル・閉じる）ショートカットを共通化するフック。
 *
 * - Cmd/Ctrl+S: `onSave` を呼ぶ（`preventDefault` 付き）。`onSave` を渡さない画面では無効。
 * - Esc: IME 変換中（`isComposing`）を除き `onCancel` を呼ぶ（`preventDefault` 付き）。
 *
 * `canSave` などの実行可否ガードは呼び出し側の `onSave` / `onCancel` 内で判定する。
 * ドロップダウン等が `document` レベルで `stopPropagation` して Esc を横取りするケースに
 * 対応するため、リスナーは `window` に登録する。
 */
export function useWindowCloseShortcuts({
  enabled = true,
  onSave,
  onCancel,
}: UseWindowCloseShortcutsParams) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (onSave && (e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave()
      } else if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault()
        onCancel?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, onSave, onCancel])
}
