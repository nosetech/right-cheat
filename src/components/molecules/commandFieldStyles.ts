import { alpha, Theme } from '@mui/material/styles'

import { HeatBarStyle } from '@/constants/heatPalette'
import { COMMAND_HINT_WIDTH } from '@/constants/layout'
import { FONT_CODE } from '@/theme/fonts'
import { scaledPx } from '@/utils/css'

/**
 * コマンドボックス（コピー/実行可能なテキストボックス）の共通スタイル定義。
 * CommandField と HistoryItemRow で同じ見た目を共有するため、
 * 状態別スタイルをここに一元化する。
 */

export type CommandBoxState = {
  hasError: boolean
  hasDone: boolean
  isFocused: boolean
  isHovered: boolean
}

/**
 * コマンドボックスの状態別スタイル（エラー > 完了 > フォーカス > ホバー/通常）。
 * `heat`（クリップボード履歴のヒートバー）はエラー・完了・フォーカスのいずれでもない
 * 通常状態（ホバー含む）でのみ適用する。
 */
export function getCommandBoxSx(
  theme: Theme,
  state: CommandBoxState,
  heat: HeatBarStyle | null = null,
) {
  const isDark = theme.palette.mode === 'dark'
  const accentColor = theme.palette.accent.main

  if (state.hasError) {
    return {
      background: `${theme.palette.alert.main}20`,
      border: `0.5px solid ${theme.palette.alert.main}`,
      borderRadius: 1,
    }
  }
  if (state.hasDone) {
    return {
      background: alpha(accentColor, isDark ? 0.09 : 0.06),
      border: `0.5px solid ${alpha(accentColor, isDark ? 0.32 : 0.3)}`,
      borderRadius: 1,
    }
  }
  if (state.isFocused) {
    return {
      background: theme.palette.glass.field,
      border: `0.5px solid ${alpha(accentColor, isDark ? 0.18 : 0.22)}`,
      borderLeft: `2.5px solid ${accentColor}`,
      borderRadius: '0 4px 4px 0',
    }
  }
  const baseBackground = state.isHovered
    ? theme.palette.glass.field
    : theme.palette.glass.panel
  return {
    background: heat?.bgTint
      ? `linear-gradient(0deg, ${heat.bgTint}, ${heat.bgTint}), ${baseBackground}`
      : baseBackground,
    border: `0.5px solid ${theme.palette.divider}`,
    borderRadius: 1,
    ...(heat
      ? { boxShadow: `inset ${heat.width}px 0 0 ${heat.barColor}` }
      : {}),
  }
}

/** 行番号ヒントのラッパー Box 用スタイル */
export const numberHintBoxSx = {
  width: COMMAND_HINT_WIDTH,
  minWidth: COMMAND_HINT_WIDTH,
  flexShrink: 0,
  textAlign: 'right',
  paddingTop: '6px',
  userSelect: 'none',
} as const

/** 行番号ヒントのテキスト用スタイル */
export function getNumberHintTextSx(theme: Theme, isFocused: boolean) {
  return {
    fontFamily: FONT_CODE,
    fontSize: scaledPx(theme.custom.fontSize.numberHint),
    color: isFocused ? theme.palette.accent.main : theme.palette.text.disabled,
    transition: 'color 0.14s',
  }
}

/** コマンドテキスト用スタイル（複数行は小さめのフォントサイズ） */
export function getCommandTextSx(
  theme: Theme,
  { isMultiLine, hasDone }: { isMultiLine: boolean; hasDone: boolean },
) {
  return {
    fontFamily: FONT_CODE,
    fontSize: isMultiLine
      ? scaledPx(theme.custom.fontSize.commandMultiline)
      : scaledPx(theme.custom.fontSize.caption),
    color: hasDone ? theme.palette.accent.main : theme.palette.text.primary,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineHeight: 1.55,
    flex: 1,
    minWidth: 0,
    transition: 'color 0.14s',
  } as const
}

/** 右端のアクションアイコン（コピー/実行/チェック）ラッパー用スタイル */
export function getActionIconBoxSx(
  theme: Theme,
  {
    hasDone,
    isFocused,
    isHovered,
  }: { hasDone: boolean; isFocused: boolean; isHovered: boolean },
) {
  return {
    opacity: hasDone ? 1 : isFocused || isHovered ? 0.55 : 0,
    transition: 'opacity 0.14s',
    color: hasDone ? theme.palette.accent.main : theme.palette.text.disabled,
    flexShrink: 0,
    paddingTop: '2px',
  }
}
