import { invoke } from '@tauri-apps/api/core'
import { debug, error as logError } from '@tauri-apps/plugin-log'
import { useCallback } from 'react'

import {
  CheatSheetAPI,
  CheatSheetData,
  CheatSheetTitleData,
} from '@/types/api/CheatSheet'

interface UseCheatSheetLoaderProps {
  setCheatSheetTitles: (titles: CheatSheetTitleData | undefined) => void
  setErrorMessage: (message: string | undefined) => void
}

export const useCheatSheetLoader = ({
  setCheatSheetTitles,
  setErrorMessage,
}: UseCheatSheetLoaderProps) => {
  const loadCheatSheetTitles = useCallback(async (): Promise<
    CheatSheetTitleData | undefined
  > => {
    try {
      setErrorMessage(undefined)
      const response = await invoke<string>(CheatSheetAPI.GET_CHEAT_TITLES)
      debug(
        `[useCheatSheetLoader] Fetched cheat sheet titles: '${CheatSheetAPI.GET_CHEAT_TITLES}' response=${response}`,
      )

      const parsedResponse = JSON.parse(response)

      if (parsedResponse.success === false && parsedResponse.error) {
        setErrorMessage(parsedResponse.error)
        setCheatSheetTitles(undefined)
        return undefined
      } else {
        const titles: CheatSheetTitleData = parsedResponse
        setCheatSheetTitles(titles)
        setErrorMessage(undefined)
        return titles
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load cheat sheets'
      logError(
        `[useCheatSheetLoader] Error loading cheat sheet titles: ${errorMessage}`,
      )
      setErrorMessage(errorMessage)
      setCheatSheetTitles(undefined)
      return undefined
    }
  }, [setCheatSheetTitles, setErrorMessage])

  const loadCheatSheetData = useCallback(
    async (title: string) => {
      try {
        setErrorMessage(undefined)
        const response = await invoke<string>(CheatSheetAPI.GET_CHEAT_SHEET, {
          title: title,
        })
        debug(
          `[useCheatSheetLoader] Fetched cheat sheet data: '${CheatSheetAPI.GET_CHEAT_SHEET}' response=${response}`,
        )

        const parsedResponse = JSON.parse(response)

        if (parsedResponse.success === false && parsedResponse.error) {
          setErrorMessage(parsedResponse.error)
          return undefined
        } else {
          const data: CheatSheetData = parsedResponse
          setErrorMessage(undefined)
          return data
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to load cheat sheet data'
        logError(
          `[useCheatSheetLoader] Error loading cheat sheet data: ${errorMessage}`,
        )
        setErrorMessage(errorMessage)
        return undefined
      }
    },
    [setErrorMessage],
  )

  return {
    loadCheatSheetTitles,
    loadCheatSheetData,
  }
}
