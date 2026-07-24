import { useState } from 'react'

import { invoke } from '@tauri-apps/api/core'
import { error as logError } from '@tauri-apps/plugin-log'

import { ClipboardAPI } from '@/types/api/Clipboard'

export const useClipboard = (value: string, onCopied?: () => void) => {
  const [hasCopied, setHasCopied] = useState<boolean>(false)
  const [error, setError] = useState<Error>()

  const copy = async () => {
    // コマンド文字列をクリップボードにコピー（自前マーカー付きでNSPasteboardへ書き込み、
    // ClipboardMonitorが履歴に取り込まないようにする）
    try {
      await invoke(ClipboardAPI.COPY_TEXT_TO_CLIPBOARD, { text: value })
      setHasCopied(true)
      onCopied?.()
      setTimeout(() => {
        setHasCopied(false)
      }, 1000)
    } catch (err) {
      logError(`[useClipboard] Failed to copy text: ${String(err)}`)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  return {
    copy,
    hasCopied,
    error,
  }
}
