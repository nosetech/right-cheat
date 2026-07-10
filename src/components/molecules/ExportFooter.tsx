'use client'
import { scaledPx } from '@/utils/css'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { FileIcon } from '@/components/atoms/icons'
import { WindowActionFooter } from '@/components/molecules/WindowActionFooter'

type Props = {
  selectedCount: number
  noneOn: boolean
  exporting: boolean
  onCancel: () => void
  onExport: () => void
}

/**
 * Export Cheatsheets 画面のフッター。
 * 左側に選択件数のサマリーを表示し、右側に Cancel / Export を配置する。
 */
export function ExportFooter({
  selectedCount,
  noneOn,
  exporting,
  onCancel,
  onExport,
}: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const divider = theme.palette.divider

  const summary = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minHeight: '18px',
      }}
    >
      <FileIcon
        size={12}
        style={{
          color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: scaledPx(theme.custom.fontSize.captionSm),
          color: theme.palette.text.secondary,
        }}
      >
        {noneOn ? (
          <Box
            component='span'
            sx={{
              color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
            }}
          >
            Select at least one cheatsheet
          </Box>
        ) : (
          <>
            <Box
              component='strong'
              sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
            >
              {selectedCount}
            </Box>
            {selectedCount === 1 ? ' cheatsheet' : ' cheatsheets'}
          </>
        )}
      </Typography>
    </Box>
  )

  return (
    <WindowActionFooter
      onCancel={onCancel}
      onSave={onExport}
      canSave={!noneOn && !exporting}
      saveLabel='Export'
      leading={summary}
      sx={{
        position: 'static',
        height: 'auto',
        flexShrink: 0,
        alignItems: 'center',
        p: '10px 16px 14px',
        borderTop: `0.5px solid ${divider}`,
      }}
    />
  )
}
