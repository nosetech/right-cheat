import { getCurrentWindow } from '@tauri-apps/api/window'

import { FOCUS_FALLBACK_ID } from '@/constants/focus'

// setSize/setResizable は macOS の NSWindow 状態を変更するため WKWebView が
// first responder を失うことがある。
// 1. native イベント（styleMask 変更通知など）が処理されるまで 50ms 待機する
// 2. setFocus() でウィンドウのキーステータスを復元する
// 3. blur() → focus() で WKWebView の native first responder を強制的に再取得する
//    focus() 単独では document.activeElement がすでに対象要素の場合 no-op になり
//    WKWebView の native first responder が復元されないため blur() が必要
// 4. document.activeElement は 50ms 待機後に読む。
//    呼び出し側が事前に取得した値を渡すと、その後の DOM 変化（dropdown input
//    アンマウントなど）で body に戻り target=null になる race condition が生じる。
//    50ms 待機中に SheetSwitchButton の restoreFocusAfterClose（setTimeout=0）が
//    先に完了してトリガーボタンにフォーカスを移すため、その後に読めば正しい要素が得られる。
export const restoreFocusAfterWindowOp = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 50))
  await getCurrentWindow().setFocus()

  const currentActive = document.activeElement as HTMLElement | null
  const target =
    currentActive &&
    currentActive !== document.body &&
    document.body.contains(currentActive)
      ? currentActive
      : null

  if (target) {
    target.blur()
    target.focus()
  } else {
    // フォーカス可能な要素が無い場合（通常表示や編集モード突入直後は
    // activeElement が body に戻る）でも、ルートに常設したフォールバック要素へ
    // フォーカスして WKWebView の native first responder を取り戻す。
    // setFocus() 単独では first responder が復元されず、以降のキーイベント
    // （Esc など）が document に届かずネイティブのビープ音だけ鳴るため。
    const fallback = document.getElementById(FOCUS_FALLBACK_ID)
    fallback?.focus()
  }
}
