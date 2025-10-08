import { RefObject, useEffect } from 'react'

export type KeyboardShortcutHandlers = {
  onNumberKey?: (index: number) => void
  onZeroKey?: () => void
}

export type UseKeyboardShortcutsOptions = {
  enabled?: boolean
  targetRef?: RefObject<HTMLElement>
}

export const useKeyboardShortcuts = (
  handlers: KeyboardShortcutHandlers,
  options?: UseKeyboardShortcutsOptions,
) => {
  const { enabled = true, targetRef } = options || {}

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 入力フィールドやテキストエリアではショートカットを無効化
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 修飾キー（Ctrl, Cmd, Alt, Shift）が押されている場合は無効化
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return
      }

      const key = event.key

      // 0キーの処理
      if (key === '0' && handlers.onZeroKey) {
        event.preventDefault()
        handlers.onZeroKey()
        return
      }

      // 1-9キーの処理
      const numberKey = parseInt(key, 10)
      if (
        numberKey >= 1 &&
        numberKey <= 9 &&
        !isNaN(numberKey) &&
        handlers.onNumberKey
      ) {
        event.preventDefault()
        handlers.onNumberKey(numberKey - 1) // 0-indexed
      }
    }

    const element = targetRef?.current || window
    element.addEventListener('keydown', handleKeyDown as EventListener)

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener)
    }
  }, [enabled, handlers, targetRef])
}
