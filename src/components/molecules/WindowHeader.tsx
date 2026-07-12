'use client'
import { ReactNode } from 'react'

import { Box } from '@mui/material'

import { WindowTitleBar } from '@/components/molecules/WindowTitleBar'
import { TITLEBAR_HEIGHT } from '@/constants/layout'

type Props = {
  title?: string
  rightControls?: ReactNode
}

/**
 * ウィンドウ上部のヘッダー。
 * data-tauri-drag-region を持つ透明なドラッグ領域 Box と {@link WindowTitleBar} をセットで配置する。
 * WindowTitleBar 自体は pointerEvents: 'none' でドラッグ機能を持たないため、
 * 同じ位置・高さ（TITLEBAR_HEIGHT）に重ねたこの Box がドラッグ領域を担う。
 */
export function WindowHeader({ title, rightControls }: Props) {
  return (
    <>
      <Box
        data-tauri-drag-region
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: `${TITLEBAR_HEIGHT}px`,
          zIndex: 999,
        }}
      />
      <WindowTitleBar title={title} rightControls={rightControls} />
    </>
  )
}
