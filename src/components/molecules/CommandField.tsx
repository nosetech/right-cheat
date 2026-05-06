'use client'
import { forwardRef, useState } from 'react'

import { Box, Stack, StackProps, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { invoke } from '@tauri-apps/api/core'
import { error as logError } from '@tauri-apps/plugin-log'

import { TruncatedText } from '@/components/atoms/TruncatedText'
import { useNotificationContext } from '@/context/NotificationContext'
import { useClipboard } from '@/hooks/useClipboard'
import { CheatSheetAPI, CommandLayout } from '@/types/api/CheatSheet'

const NUMBER_HINT_WIDTH = '14px'

export type CommandFieldProps = StackProps & {
  description?: string
  command: string
  numberHint?: string
  mode?: 'copy' | 'execute'
  layout: CommandLayout
}

export const CommandField = forwardRef<HTMLDivElement, CommandFieldProps>(
  (props, ref) => {
    const {
      description,
      command,
      numberHint,
      mode = 'copy',
      layout,
      tabIndex,
      ...remainProps
    } = props

    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
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
          `アプリケーションの起動に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }

    const handleAction = mode === 'execute' ? handleExecute : copy

    const hasDone = mode === 'execute' ? hasExecuted : hasCopied
    const hasError = mode === 'execute' ? executeError : copyError

    const isMultiLine = command.includes('\n')

    const accentColor = theme.palette.accent.main

    const getCommandBoxSx = () => {
      if (hasError) {
        return {
          background: `${theme.palette.alert.main}20`,
          border: `0.5px solid ${theme.palette.alert.main}`,
          borderRadius: 1,
        }
      }
      if (hasDone) {
        return {
          background: isDark
            ? 'rgba(100,180,255,0.09)'
            : 'rgba(0,113,227,0.06)',
          border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.32)' : 'rgba(0,113,227,0.30)'}`,
          borderRadius: 1,
        }
      }
      if (isFocused) {
        return {
          background: isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.78)',
          border: `0.5px solid ${isDark ? 'rgba(100,180,255,0.18)' : 'rgba(0,113,227,0.22)'}`,
          borderLeft: `2.5px solid ${accentColor}`,
          borderRadius: '0 4px 4px 0',
        }
      }
      return {
        background: isHovered
          ? isDark
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255,255,255,0.78)'
          : isDark
            ? 'rgba(255,255,255,0.055)'
            : 'rgba(255,255,255,0.48)',
        border: `0.5px solid ${
          isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
        }`,
        borderRadius: 1,
      }
    }

    const numberHintColor = isFocused
      ? accentColor
      : theme.palette.text.disabled

    const numberHintBox = (
      <Box
        sx={{
          width: NUMBER_HINT_WIDTH,
          minWidth: NUMBER_HINT_WIDTH,
          flexShrink: 0,
          textAlign: 'right',
          paddingTop: '6px',
          userSelect: 'none',
        }}
      >
        {numberHint && (
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '9.5px',
              color: numberHintColor,
              transition: 'color 0.14s',
            }}
          >
            {numberHint}
          </Typography>
        )}
      </Box>
    )

    const commandBox = (
      <Box
        ref={ref}
        tabIndex={tabIndex ?? 0}
        sx={{
          ...getCommandBoxSx(),
          padding: '5px 8px',
          cursor: 'pointer',
          transition: 'all 0.14s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1,
          outline: 'none',
          width: '100%',
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
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: isMultiLine ? '10px' : '11.5px',
            color: hasDone ? accentColor : theme.palette.text.primary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: 1.55,
            flex: 1,
            minWidth: 0,
            transition: 'color 0.14s',
          }}
        >
          {command}
        </Typography>
        <Box
          sx={{
            opacity: hasDone ? 1 : isFocused || isHovered ? 0.55 : 0,
            transition: 'opacity 0.14s',
            color: hasDone ? accentColor : theme.palette.text.disabled,
            flexShrink: 0,
            paddingTop: '2px',
          }}
        >
          {hasDone ? (
            <svg
              width='11'
              height='11'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
            >
              <polyline points='20 6 9 17 4 12' />
            </svg>
          ) : mode === 'execute' ? (
            <svg
              width='11'
              height='11'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <polygon points='5 3 19 12 5 21 5 3' />
            </svg>
          ) : (
            <svg
              width='11'
              height='11'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <rect x='9' y='9' width='13' height='13' rx='2' />
              <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
            </svg>
          )}
        </Box>
      </Box>
    )

    if (layout === 'stacked' && description) {
      return (
        <Stack spacing={0.25} {...remainProps}>
          <Stack direction='row' spacing={0.75} alignItems='baseline'>
            {numberHintBox}
            <TruncatedText
              text={description}
              sx={{
                fontSize: '11px',
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
      <Stack
        direction='row'
        spacing={0.75}
        alignItems='flex-start'
        {...remainProps}
      >
        {numberHintBox}
        {commandBox}
        {layout !== 'command_only' && description && (
          <TruncatedText text={description} color='text.secondary' />
        )}
      </Stack>
    )
  },
)

CommandField.displayName = 'CommandField'
