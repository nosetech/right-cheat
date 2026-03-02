'use client'
import { TruncatedText } from '@/components/atoms/TruncatedText'
import { CommandDisplay } from '@/components/molecules/CommandDisplay'
import { useNotificationContext } from '@/context/NotificationContext'
import { useClipboard } from '@/hooks/useClipboard'
import { CheatSheetAPI } from '@/types/api/CheatSheet'
import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { forwardRef, useState } from 'react'

export type CommandFieldProps = StackProps & {
  description: string
  command: string
  numberHint?: string
  mode?: 'copy' | 'execute'
}

export const CommandField = forwardRef<HTMLDivElement, CommandFieldProps>(
  (props, ref) => {
    const {
      description,
      command,
      numberHint,
      mode = 'copy',
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

    return (
      <Stack direction='row' spacing={1} alignItems='baseline' {...remainProps}>
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
        <TruncatedText text={description} color='text.secondary' />
      </Stack>
    )
  },
)

CommandField.displayName = 'CommandField'
