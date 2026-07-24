/**
 * クリップボード履歴の「Heat bar color」設定（issue #195）で使用するカラーパレットと、
 * コピー回数からヒートバーの見た目を導出するロジック。
 * v19 モックアップ（design/RightCheat-handoff_20260714.zip の HEAT_PALETTES / historyHeat）に準拠。
 */

export type HeatBarColorId =
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'none'

export type HeatColorPalette = {
  id: Exclude<HeatBarColorId, 'none'>
  label: string
  solid: string
  rgb: [number, number, number]
}

/** 選択可能な7色（None を除く）。ライト/ダーク共通の意味色として定義する。 */
export const HEAT_COLOR_PALETTES: HeatColorPalette[] = [
  { id: 'red', label: 'Red', solid: '#ff5c5c', rgb: [255, 90, 90] },
  { id: 'orange', label: 'Orange', solid: '#ff7a32', rgb: [255, 140, 60] },
  { id: 'amber', label: 'Amber', solid: '#d9a520', rgb: [222, 168, 40] },
  { id: 'green', label: 'Green', solid: '#34c759', rgb: [70, 190, 110] },
  { id: 'teal', label: 'Teal', solid: '#14b8a6', rgb: [40, 190, 185] },
  { id: 'blue', label: 'Blue', solid: '#4d96ff', rgb: [80, 150, 255] },
  { id: 'purple', label: 'Purple', solid: '#a78bfa', rgb: [170, 130, 250] },
]

/** Preferences のカラーピッカーに並べる8択（7色 + None）。 */
export const HEAT_COLOR_OPTIONS: { id: HeatBarColorId; label: string }[] = [
  ...HEAT_COLOR_PALETTES.map(({ id, label }) => ({ id, label })),
  { id: 'none', label: 'None' },
]

export const DEFAULT_HEAT_BAR_COLOR: HeatBarColorId = 'orange'

/**
 * コピー回数（copy_count）の上限。バックエンド（`insert_clipboard_history` の
 * `MIN(copy_count + 1, 5)`）と同じ値を持ち、フロントエンドの楽観的更新
 * （`useClipboardHistory.recordRecopy`）でも同じ上限でカウントアップを止める。
 */
export const MAX_COPY_COUNT = 5

export type HeatBarStyle = {
  /** inset shadow の幅（px） */
  width: number
  /** バー色（inset shadow の色） */
  barColor: string
  /** 行背景に重ねるティント色。null の場合は重ねない */
  bgTint: string | null
}

/**
 * コピー回数（1〜5でキャップ）を、行左端に描くヒートバーの見た目に変換する。
 * `heatColor` が 'none' の場合は null を返す（呼び出し側でヒートバー表示自体を無効化する）。
 */
export function historyHeat(
  count: number,
  isDark: boolean,
  heatColor: HeatBarColorId,
): HeatBarStyle | null {
  if (heatColor === 'none') return null
  const palette = HEAT_COLOR_PALETTES.find((p) => p.id === heatColor)
  if (!palette) return null

  const level = Math.max(1, Math.min(MAX_COPY_COUNT, count || 1)) - 1
  const [r, g, b] = palette.rgb
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`

  const levels: HeatBarStyle[] = [
    {
      width: 2,
      barColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.13)',
      bgTint: null,
    },
    { width: 2.5, barColor: rgba(0.55), bgTint: null },
    {
      width: 3,
      barColor: rgba(0.74),
      bgTint: isDark ? rgba(0.045) : rgba(0.055),
    },
    {
      width: 4,
      barColor: rgba(0.88),
      bgTint: isDark ? rgba(0.07) : rgba(0.08),
    },
    {
      width: 5,
      barColor: palette.solid,
      bgTint: isDark ? rgba(0.1) : rgba(0.1),
    },
  ]

  return levels[level]
}
