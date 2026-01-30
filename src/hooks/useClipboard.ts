import { getCopyCommand } from '@/utils/parseCommand'
import { useState } from 'react'

export const useClipboard = (value: string) => {
  const [hasCopied, setHasCopied] = useState<boolean>(false)
  const [error, setError] = useState<Error>()

  const copy = async () => {
    // パース処理後の文字列をクリップボードにコピー
    const copyValue = getCopyCommand(value)
    navigator.clipboard
      .writeText(copyValue)
      .then(() => {
        setHasCopied(true)
        setTimeout(() => {
          setHasCopied(false)
        }, 1000)
      })
      .catch((error) => {
        setError(error)
      })
  }

  return {
    copy,
    hasCopied,
    error,
  }
}
