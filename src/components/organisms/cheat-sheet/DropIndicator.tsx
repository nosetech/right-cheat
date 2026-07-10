'use client'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'

type Props = {
  /** 'block' = ブロック間（mx: 1）、'item' = グループ内アイテム間（mx: 4px）。 */
  level?: 'block' | 'item'
}

/**
 * DnD 中に表示するドロップ位置インジケーター（アクセントカラーの 2px ライン）。
 */
export function DropIndicator({ level = 'block' }: Props) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        height: '2px',
        background: theme.palette.accent.main,
        borderRadius: '1px',
        mx: level === 'item' ? '4px' : 1,
        my: '1px',
      }}
    />
  )
}
