import { CommandLayout, SheetType } from '@/types/api/CheatSheet'

// 色（ライト/ダーク）は theme.palette.sheetType で一元管理する。
// ここではラベルと説明のみを定義する。
export const TYPE_META: Record<
  SheetType,
  {
    label: string
    description: string
  }
> = {
  command: {
    label: 'Command',
    description: 'Copyable shell commands',
  },
  application: {
    label: 'Application',
    description: 'Subcommands of a single CLI app',
  },
  shortcut: {
    label: 'Shortcut',
    description: 'Keyboard shortcuts',
  },
}

// アイコンは LayoutIcon コンポーネントで描画する。ここではラベルと説明のみ定義する。
export const LAYOUT_META: Record<
  CommandLayout,
  { label: string; description: string }
> = {
  inline: {
    label: 'inline',
    description: 'Description and command on one line',
  },
  stacked: {
    label: 'stacked',
    description: 'Description above, command below',
  },
  command_only: {
    label: 'command_only',
    description: 'Show command only, hide description',
  },
}
