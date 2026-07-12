export const TITLEBAR_HEIGHT = 28
export const TRAFFIC_LIGHTS_WIDTH = 72

// inline レイアウトのコマンド一覧を CSS Grid（subgrid）で整列させるための定数。
// 番号ヒント列・コマンド列・説明列を全行で共有し、コマンド:説明を 4:1 で揃える。
export const COMMAND_HINT_WIDTH = '14px'
export const INLINE_GRID_TEMPLATE_COLUMNS = `${COMMAND_HINT_WIDTH} 4fr 1fr`
// grid の gap（MUI spacing 単位）。従来の Stack spacing と揃える。
export const COMMAND_GRID_ROW_GAP = 1
export const COMMAND_GRID_COL_GAP = 0.75
