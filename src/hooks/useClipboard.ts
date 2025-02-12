import { useState } from 'react'

export const useClipboard = (value: string) => {
  const [hasCopied, setHasCopied] = useState<boolean>(false)
  const [error, setError] = useState<Error>()

  const copy = async () => {
    navigator.clipboard
      .writeText(value)
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
