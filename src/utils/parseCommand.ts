/**
 * バックスラッシュを処理してコマンド文字列をパース
 * - `\\` (エスケープされたバックスラッシュ) -> `\`
 * - `\` (単一のバックスラッシュ) -> 改行
 *
 * @param command - パースするコマンド文字列
 * @returns 改行とエスケープされたバックスラッシュが処理された文字列
 *
 * @example
 * // JSON内: "line1\\line2"（JSON では \ を \\ でエスケープ）
 * parseCommand(String.raw`line1\line2`) // 'line1\nline2' を返す
 *
 * // JSON内: "echo\\\\test"（JSON では \\\\ で 1つの \ を表現）
 * parseCommand(String.raw`echo\\test`) // 'echo\test' を返す
 *
 * // 複合パターン: JSON内では複数のバックスラッシュと改行が混在
 * parseCommand(String.raw`mixed\line\\and\escape`) // 'mixed\nline\and\nescape' を返す
 */
export const parseCommand = (command: string): string => {
  // \\ を一時プレースホルダーに置換してエスケープされたバックスラッシュを保護
  const temp = command.replace(/\\\\/g, '__ESCAPED_BACKSLASH__')
  // 単一の \ を改行に置換
  const withNewlines = temp.replace(/\\/g, '\n')
  // プレースホルダーを単一のバックスラッシュに戻す
  return withNewlines.replace(/__ESCAPED_BACKSLASH__/g, '\\')
}

/**
 * コマンドの表示用表現を取得（改行含む）
 * @param command - 表示用にフォーマットするコマンド文字列
 * @returns 表示用にフォーマットされた文字列
 */
export const getDisplayCommand = (command: string): string => {
  return parseCommand(command)
}

/**
 * コマンドのコピー用表現を取得（パース済みバージョン）
 * @param command - クリップボードにコピーするコマンド文字列
 * @returns クリップボードにコピーする文字列
 */
export const getCopyCommand = (command: string): string => {
  return parseCommand(command)
}
