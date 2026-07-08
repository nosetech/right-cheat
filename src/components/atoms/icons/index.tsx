'use client'

import { CSSProperties, ReactNode } from 'react'

/**
 * 共通アイコンの props。
 * - `size`: 幅・高さ（px、正方形）
 * - `color`: 線色（stroke 系）または塗り色（fill 系）。既定は `currentColor` で親のテキスト色を継承
 * - `strokeWidth`: 線幅（stroke 系のみ）
 * - `style`: 追加のインラインスタイル（flexShrink や transform など）
 */
export interface IconProps {
  size?: number | string
  color?: string
  strokeWidth?: number | string
  style?: CSSProperties
}

// ─── ストローク系アイコンの共通ラッパー ─────────────────────────────────────

const StrokeIcon = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  style,
  children,
}: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap='round'
    strokeLinejoin='round'
    style={style}
  >
    {children}
  </svg>
)

// ─── アイコン定義 ────────────────────────────────────────────────────────────

/** チェックマーク */
export const CheckIcon = (p: IconProps) => (
  <StrokeIcon size={14} strokeWidth={2.6} {...p}>
    <polyline points='20 6 9 17 4 12' />
  </StrokeIcon>
)

/** 下向きシェブロン（開閉インジケータ） */
export const ChevronDownIcon = (p: IconProps) => (
  <StrokeIcon size={8} strokeWidth={2.5} {...p}>
    <polyline points='6 9 12 15 18 9' />
  </StrokeIcon>
)

/** 編集（鉛筆） */
export const PencilIcon = (p: IconProps) => (
  <StrokeIcon size={12} {...p}>
    <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
    <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
  </StrokeIcon>
)

/** 削除（ゴミ箱） */
export const TrashIcon = (p: IconProps) => (
  <StrokeIcon size={12} {...p}>
    <polyline points='3 6 5 6 21 6' />
    <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
    <path d='M10 11v6' />
    <path d='M14 11v6' />
    <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
  </StrokeIcon>
)

/** 検索（虫眼鏡） */
export const SearchIcon = (p: IconProps) => (
  <StrokeIcon size={20} {...p}>
    <circle cx='11' cy='11' r='8' />
    <line x1='21' y1='21' x2='16.65' y2='16.65' />
  </StrokeIcon>
)

/** 検索結果なし（虫眼鏡＋マイナス） */
export const SearchOffIcon = (p: IconProps) => (
  <StrokeIcon size={20} {...p}>
    <circle cx='11' cy='11' r='8' />
    <line x1='21' y1='21' x2='16.65' y2='16.65' />
    <line x1='8' y1='11' x2='14' y2='11' />
  </StrokeIcon>
)

/** 閉じる（×） */
export const CloseIcon = (p: IconProps) => (
  <StrokeIcon size={10} strokeWidth={2.5} {...p}>
    <line x1='18' y1='6' x2='6' y2='18' />
    <line x1='6' y1='6' x2='18' y2='18' />
  </StrokeIcon>
)

/** 追加（＋） */
export const PlusIcon = (p: IconProps) => (
  <StrokeIcon size={12} strokeWidth={2.4} {...p}>
    <line x1='12' y1='5' x2='12' y2='19' />
    <line x1='5' y1='12' x2='19' y2='12' />
  </StrokeIcon>
)

/** マイナス（−、不確定チェック） */
export const MinusIcon = (p: IconProps) => (
  <StrokeIcon size={12} strokeWidth={3.5} {...p}>
    <line x1='5' y1='12' x2='19' y2='12' />
  </StrokeIcon>
)

/** ロック（施錠） */
export const LockIcon = (p: IconProps) => (
  <StrokeIcon size={9} strokeWidth={2.4} {...p}>
    <rect x='4' y='11' width='16' height='10' rx='1.5' />
    <path d='M8 11V7a4 4 0 0 1 8 0v4' />
  </StrokeIcon>
)

/** 警告・エラー（！付き円） */
export const AlertCircleIcon = (p: IconProps) => (
  <StrokeIcon size={12} strokeWidth={2.2} {...p}>
    <circle cx='12' cy='12' r='10' />
    <line x1='12' y1='8' x2='12' y2='12' />
    <line x1='12' y1='16' x2='12.01' y2='16' />
  </StrokeIcon>
)

/** ファイル（折り返し角付き） */
export const FileIcon = (p: IconProps) => (
  <StrokeIcon size={12} {...p}>
    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
    <polyline points='14 2 14 8 20 8' />
  </StrokeIcon>
)

/** アップロード（書き出し） */
export const UploadIcon = (p: IconProps) => (
  <StrokeIcon size={11} strokeWidth={2.4} {...p}>
    <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
    <polyline points='17 8 12 3 7 8' />
    <line x1='12' y1='3' x2='12' y2='15' />
  </StrokeIcon>
)

/** 保存（追加用フォルダ） */
export const SaveIcon = (p: IconProps) => (
  <StrokeIcon size={11} strokeWidth={2.2} {...p}>
    <path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' />
    <line x1='12' y1='11' x2='12' y2='17' />
    <line x1='9' y1='14' x2='15' y2='14' />
  </StrokeIcon>
)

/** コピー */
export const CopyIcon = (p: IconProps) => (
  <StrokeIcon size={11} {...p}>
    <rect x='9' y='9' width='13' height='13' rx='2' />
    <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
  </StrokeIcon>
)

/** 実行（再生） */
export const PlayIcon = (p: IconProps) => (
  <StrokeIcon size={11} {...p}>
    <polygon points='5 3 19 12 5 21 5 3' />
  </StrokeIcon>
)

/** Enter/戻る（corner-down-left） */
export const ReturnIcon = (p: IconProps) => (
  <StrokeIcon size={13} strokeWidth={2.2} {...p}>
    <polyline points='9 10 4 15 9 20' />
    <path d='M20 4v7a4 4 0 0 1-4 4H4' />
  </StrokeIcon>
)

/** 一覧（リスト） */
export const ListIcon = (p: IconProps) => (
  <StrokeIcon size={13} {...p}>
    <line x1='8' y1='6' x2='21' y2='6' />
    <line x1='8' y1='12' x2='21' y2='12' />
    <line x1='8' y1='18' x2='21' y2='18' />
    <line x1='3' y1='6' x2='3.01' y2='6' />
    <line x1='3' y1='12' x2='3.01' y2='12' />
    <line x1='3' y1='18' x2='3.01' y2='18' />
  </StrokeIcon>
)

/** ドラッグハンドル（グリップ点、viewBox 10×14） */
export const DragHandleIcon = ({
  width = 10,
  height = 14,
  color = 'currentColor',
  style,
}: Pick<IconProps, 'color' | 'style'> & {
  width?: number | string
  height?: number | string
}) => (
  <svg
    width={width}
    height={height}
    viewBox='0 0 10 14'
    fill={color}
    style={style}
  >
    <circle cx='3' cy='3' r='1.3' />
    <circle cx='7' cy='3' r='1.3' />
    <circle cx='3' cy='7' r='1.3' />
    <circle cx='7' cy='7' r='1.3' />
    <circle cx='3' cy='11' r='1.3' />
    <circle cx='7' cy='11' r='1.3' />
  </svg>
)
