'use client'
import { TruncatedText } from '@/components/atoms/TruncatedText'
import { CommandDisplay } from '@/components/molecules/CommandDisplay'
import { useNotificationContext } from '@/context/NotificationContext'
import { useClipboard } from '@/hooks/useClipboard'
import { CheatSheetAPI, CommandLayout } from '@/types/api/CheatSheet'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { error as logError } from '@tauri-apps/plugin-log'
import { forwardRef, useState } from 'react'

export type CommandFieldProps = StackProps & {
  description?: string
  command: string
  numberHint?: string
  mode?: 'copy' | 'execute'
  layout?: CommandLayout
}

export const CommandField = forwardRef<HTMLDivElement, CommandFieldProps>(
  (props, ref) => {
    const {
      description,
      command,
      numberHint,
      mode = 'copy',
      layout = 'inline',
      tabIndex,
      ...remainProps
    } = props

    const theme = useTheme()
    const { copy, hasCopied, error: copyError } = useClipboard(command)
    const { showError } = useNotificationContext() ?? {}

    const [hasExecuted, setHasExecuted] = useState(false)
    const [executeError, setExecuteError] = useState(false)

    const handleExecute = async () => {
      try {
        await invoke(CheatSheetAPI.RUN_APPLICATION, { command })
        setHasExecuted(true)
        setExecuteError(false)
        setTimeout(() => setHasExecuted(false), 1000)
      } catch (e) {
        // Tauri の invoke が throw する値は Rust の Err(String) がそのまま string として渡される。
        // そのため e instanceof Error は常に false になり、String(e) のパスのみ通る。
        logError(
          `[CommandField] Failed to run application: command=${command}, error=${String(e)}`,
        )
        setExecuteError(true)
        setTimeout(() => setExecuteError(false), 2000)
        showError?.(
          `アプリケーションの起動に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }

    const handleAction = mode === 'execute' ? handleExecute : copy

    const colorScheme = () => {
      const defaultScheme = {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.primary.main,
        border: 2,
        borderColor: 'base.pale',
        '&:hover': {
          borderColor: 'alert.main',
        },
        '&:focus-visible': {
          outlineStyle: 'outset',
          outlineColor: 'alert.main',
          outlineWidth: 2,
        },
      }
      const hasError = mode === 'execute' ? executeError : copyError
      const hasDone = mode === 'execute' ? hasExecuted : hasCopied
      if (hasError) {
        return {
          ...defaultScheme,
          backgroundColor: theme.palette.alert.main,
        }
      } else if (hasDone) {
        return {
          ...defaultScheme,
          backgroundColor: theme.palette.background.default,
        }
      } else {
        return defaultScheme
      }
    }

    const numberHintBox = (
      <Box
        sx={{
          width: '10px',
          minWidth: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {numberHint && (
          <Typography
            variant='caption'
            color='text.disabled'
            sx={{
              textAlign: 'center',
            }}
          >
            {numberHint}
          </Typography>
        )}
      </Box>
    )

    const commandDisplay = (
      <CommandDisplay
        command={command}
        boxProps={{
          ref,
          maxWidth: '100%',
          width: 'fit-content',
          tabIndex: tabIndex ?? 0,
          padding: 0.5,
          sx: colorScheme(),
          onClick: handleAction,
          onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              handleAction()
            }
          },
        }}
      />
    )

    if (layout === 'stacked') {
      return (
        <Stack spacing={0.25} {...remainProps}>
          <Stack direction='row' spacing={1} alignItems='baseline'>
            {numberHintBox}
            {description && (
              <TruncatedText text={description} color='text.secondary' />
            )}
          </Stack>
          <Stack direction='row' spacing={1} alignItems='baseline'>
            <Box sx={{ width: '10px', minWidth: '10px' }} />
            {commandDisplay}
          </Stack>
        </Stack>
      )
    }

    return (
      <Stack direction='row' spacing={1} alignItems='baseline' {...remainProps}>
        {numberHintBox}
        {commandDisplay}
        {layout !== 'command_only' && description && (
          <TruncatedText text={description} color='text.secondary' />
        )}
      </Stack>
    )
  },
)

CommandField.displayName = 'CommandField'
