// 編集モードのブロック並べ替え（Pointer Events ベースの DnD）で使う型。

// ドラッグ中の対象を指す情報。
// - type: 'group' … トップレベルのグループブロック
// - type: 'item'  … コマンド/ショートカット行（itemIndex 有り = グループ内、無し = トップレベル）
export type DragInfo = {
  type: 'item' | 'group'
  blockIndex: number
  itemIndex?: number
}

// ドロップ位置のマーカー。
export type DropMark =
  | { kind: 'between-blocks'; afterBlockIndex: number }
  | { kind: 'into-group'; groupBlockIndex: number }
  | { kind: 'between-items'; groupBlockIndex: number; afterItemIndex: number }
