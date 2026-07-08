'use client'

import { CommandLayout } from '@/types/api/CheatSheet'

export interface LayoutIconProps {
  layout: CommandLayout
  size?: number
}

/**
 * コマンドレイアウト（inline / stacked / command_only）を表すアイコン。
 * 色は `stroke='currentColor'` で親のテキスト色を継承する。
 */
export const LayoutIcon = ({ layout, size = 14 }: LayoutIconProps) => {
  const common = {
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
  } as const

  switch (layout) {
    case 'inline':
      return (
        <svg {...common}>
          <line x1='3' y1='9' x2='10' y2='9' />
          <line x1='12' y1='9' x2='21' y2='9' />
          <line x1='3' y1='15' x2='10' y2='15' />
          <line x1='12' y1='15' x2='21' y2='15' />
        </svg>
      )
    case 'stacked':
      return (
        <svg {...common}>
          <line x1='3' y1='6' x2='14' y2='6' />
          <line x1='3' y1='11' x2='21' y2='11' />
          <line x1='3' y1='15' x2='14' y2='15' />
          <line x1='3' y1='20' x2='21' y2='20' />
        </svg>
      )
    case 'command_only':
      return (
        <svg {...common}>
          <polyline points='4 17 10 11 4 5' />
          <line x1='12' y1='19' x2='20' y2='19' />
        </svg>
      )
  }
}
