'use client'
import { scaledPx } from '@/utils/css'
import { forwardRef, useState } from 'react'

import { Box, BoxProps, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { error as logError } from '@tauri-apps/plugin-log'

import { CheckIcon, CopyIcon, PlayIcon } from '@/components/atoms/icons'
import { TruncatedText } from '@/components/atoms/TruncatedText'
import {
  getActionIconBoxSx,
  getCommandBoxSx,
  getCommandTextSx,
  getNumberHintTextSx,
  numberHintBoxSx,
} from '@/components/molecules/commandFieldStyles'
import { COMMAND_HINT_WIDTH } from '@/constants/layout'
import { useNotificationContext } from '@/context/NotificationContext'
import { useClipboard } from '@/hooks/useClipboard'
import { CheatSheetAPI, CommandLayout } from '@/types/api/CheatSheet'

const NUMBER_HINT_WIDTH = COMMAND_HINT_WIDTH

export type CommandFieldProps = BoxProps & {
  description?: string
  command: string
  numberHint?: string
  mode?: 'copy' | 'execute'
  layout: CommandLayout
  editMode?: boolean
}

export const CommandField = forwardRef<HTMLDivElement, CommandFieldProps>(
  (props, ref) => {
    const {
      description,
      command,
      numberHint,
      mode = 'copy',
      layout,
      editMode = false,
      tabIndex,
      ...remainProps
    } = props

    const theme = useTheme()
    const { copy, hasCopied, error: copyError } = useClipboard(command)
    const { showError } = useNotificationContext() ?? {}

    const [hasExecuted, setHasExecuted] = useState(false)
    const [executeError, setExecuteError] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const handleExecute = async () => {
      try {
        await invoke(CheatSheetAPI.RUN_APPLICATION, { command })
        setHasExecuted(true)
        setExecuteError(false)
        setTimeout(() => setHasExecuted(false), 1000)
      } catch (e) {
        logError(
          `[CommandField] Failed to run application: command=${command}, error=${String(e)}`,
        )
        setExecuteError(true)
        setTimeout(() => setExecuteError(false), 2000)
        showError?.(
          `Failed to launch application: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }

    const handleAction = editMode
      ? () => {}
      : mode === 'execute'
        ? handleExecute
        : copy

    const hasDone = mode === 'execute' ? hasExecuted : hasCopied
    const hasError = mode === 'execute' ? executeError : copyError

    const isMultiLine = command.includes('\n')

    const numberHintBox = (
      <Box sx={numberHintBoxSx}>
        {numberHint && (
          <Typography sx={getNumberHintTextSx(theme, isFocused)}>
            {numberHint}
          </Typography>
        )}
      </Box>
    )

    const commandBox = (
      <Box
        ref={ref}
        tabIndex={editMode ? -1 : (tabIndex ?? 0)}
        sx={{
          ...getCommandBoxSx(theme, {
            hasError: !!hasError,
            hasDone,
            isFocused,
            isHovered,
          }),
          padding: '5px 8px',
          cursor: editMode ? 'default' : 'pointer',
          transition: 'all 0.14s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1,
          outline: 'none',
          flex: 1,
          minWidth: 0,
        }}
        onClick={handleAction}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleAction()
          }
        }}
      >
        <Typography sx={getCommandTextSx(theme, { isMultiLine, hasDone })}>
          {command}
        </Typography>
        <Box sx={getActionIconBoxSx(theme, { hasDone, isFocused, isHovered })}>
          {hasDone ? (
            <CheckIcon size={11} strokeWidth={2.5} />
          ) : mode === 'execute' ? (
            <PlayIcon size={11} strokeWidth={2} />
          ) : (
            <CopyIcon size={11} strokeWidth={2} />
          )}
        </Box>
      </Box>
    )

    if (layout === 'stacked' && description) {
      return (
        // grid コンテナ内では 1 行分（全列）を占有する。内部は従来どおり縦積み。
        <Stack spacing={0.25} {...remainProps} sx={{ gridColumn: '1 / -1' }}>
          <Stack direction='row' spacing={0.75} alignItems='baseline'>
            {numberHintBox}
            <TruncatedText
              text={description}
              sx={{
                fontSize: scaledPx(theme.custom.fontSize.captionSm),
                color: isFocused
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
                transition: 'color 0.14s',
              }}
            />
          </Stack>
          <Stack direction='row' spacing={0.75} alignItems='flex-start'>
            <Box
              sx={{ width: NUMBER_HINT_WIDTH, minWidth: NUMBER_HINT_WIDTH }}
            />
            {commandBox}
          </Stack>
        </Stack>
      )
    }

    return (
      // 親 grid の列トラック（番号ヒント / コマンド / 説明）を subgrid で継承し、
      // 全行でコマンド列・説明列の幅を揃える。
      <Box
        {...remainProps}
        sx={{
          display: 'grid',
          gridColumn: '1 / -1',
          gridTemplateColumns: 'subgrid',
          alignItems: 'start',
        }}
      >
        {numberHintBox}
        {commandBox}
        {layout !== 'command_only' && description && (
          <TruncatedText
            text={description}
            sx={{
              minWidth: 0,
              fontSize: scaledPx(theme.custom.fontSize.captionSm),
              color: isFocused
                ? theme.palette.text.primary
                : theme.palette.text.secondary,
              transition: 'color 0.14s',
            }}
          />
        )}
      </Box>
    )
  },
)

CommandField.displayName = 'CommandField'
