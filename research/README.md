# research/

RightCheat 本体に組み込む前の技術検証コードを置くディレクトリ。
本体クレートとは独立して存在し、Cargo workspace にも含めない。

## 一覧

| ディレクトリ | 関連 issue | 目的 |
|---|---|---|
| `sqlite-fts/` | [#70](https://github.com/nosetech/right-cheat/issues/70) | SQLite FTS5 + trigram tokenizer による日本語全文検索の検証 |

## 運用方針

- **本体には組み込まない**: 検証専用なので `src-tauri/` 側からは参照しない
- **CI 対象外**: 本体の `cargo test` には含めない（独立した Cargo プロジェクトとして実行する）
- **検証完了後の扱い**: 検証結果が本体に反映され不要になった時点で issue クローズと同時に削除可
