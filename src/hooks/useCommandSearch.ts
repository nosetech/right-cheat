import { invoke } from '@tauri-apps/api/core'
import { debug, error as logError } from '@tauri-apps/plugin-log'
import { useEffect, useState } from 'react'

import { CheatSheetAPI, CommandSearchResult } from '@/types/api/CheatSheet'

const DEBOUNCE_MS = 150

type UseCommandSearchResult = {
  query: string
  setQuery: (value: string) => void
  debouncedQuery: string
  results: CommandSearchResult[]
  loading: boolean
}

// 入力を 150ms debounce してバックエンドの search_commands を呼び出すフック。
// 検索範囲は全チートシート横断。ハイライトは呼び出し側で行う。
export const useCommandSearch = (initialQuery = ''): UseCommandSearchResult => {
  const [query, setQuery] = useState<string>(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState<string>(
    initialQuery.trim(),
  )
  const [results, setResults] = useState<CommandSearchResult[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // 150ms debounce
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  // debounce 後にバックエンドを呼び出す
  useEffect(() => {
    let cancelled = false

    if (!debouncedQuery) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const response = await invoke<CommandSearchResult[]>(
          CheatSheetAPI.SEARCH_COMMANDS,
          { query: debouncedQuery },
        )
        if (cancelled) return
        debug(
          `[useCommandSearch] search_commands query='${debouncedQuery}' hits=${response.length}`,
        )
        setResults(response)
      } catch (e) {
        if (cancelled) return
        logError(`[useCommandSearch] search_commands error: ${String(e)}`)
        setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  return { query, setQuery, debouncedQuery, results, loading }
}
