# sqlite-fts research

Issue [#70](https://github.com/nosetech/right-cheat/issues/70) のための検証用クレート。
SQLite FTS5 と `trigram` トークナイザを使い、日本語コマンド説明文・コマンド本文の
全文検索が RightCheat に十分使える品質で実現できるかを確認する。

## 検証スコープ

issue #70 で示されている候補のうち、**SQLite FTS5 のみ**を検証する。
（`tantivy` / `bayard` は今回対象外。`nanodb` は trigram FTS を持たず、別軸の検討項目）

verification 項目:

- [x] 通常テーブル + FTS5 仮想テーブルの作成・操作方法
- [x] Rust（rusqlite）での SQLite 操作のベース
- [x] `trigram` トークナイザでの 3 文字以上の MATCH 検索
- [x] unigram（1 文字）/ bigram（2 文字）検索のフォールバック
- [x] 大文字小文字の扱い、INSERT/UPDATE/DELETE の同期トリガー

## 構成

| ファイル | 内容 |
|---|---|
| `src/lib.rs` | スキーマ作成、CRUD、FTS / LIKE / ハイブリッド検索、テスト14件 |
| `Cargo.toml` | `rusqlite = { version = "0.32", features = ["bundled"] }` のみ |

## 実行方法

```bash
cd research/sqlite-fts
cargo test
```

期待結果: 14 tests passed

```
running 14 tests
test tests::fts5_trigram_tokenizer_is_available ... ok
test tests::delete_syncs_to_fts_table ... ok
test tests::fts_search_matches_japanese_3chars ... ok
test tests::fts_search_matches_japanese_exactly_3chars ... ok
test tests::empty_query_returns_no_rows ... ok
test tests::fts_search_matches_alphanumeric ... ok
test tests::hybrid_search_3chars_uses_fts ... ok
test tests::fts_search_is_case_insensitive ... ok
test tests::hybrid_search_bigram_falls_back_to_like ... ok
test tests::schema_creates_tables_and_triggers ... ok
test tests::like_escape_protects_special_chars ... ok
test tests::insert_syncs_to_fts_table ... ok
test tests::hybrid_search_unigram_falls_back_to_like ... ok
test tests::update_syncs_to_fts_table ... ok

test result: ok. 14 passed; 0 failed
```

## 検証結果サマリ

### 1. SQLite FTS5 + trigram tokenizer は問題なく利用可能

- `rusqlite` の `bundled` feature により、`libsqlite3-sys 0.30.1` 経由で
  FTS5 と trigram tokenizer を含むビルド済み SQLite が組み込まれる
- `tauri-plugin-sql` などの追加プラグインは不要

### 2. 推奨スキーマ構成

検証コードでは以下の構成を採用した（issue #142 の `commands` テーブル想定）。

```sql
CREATE TABLE commands (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    description   TEXT NOT NULL DEFAULT '',
    command_text  TEXT NOT NULL
);

CREATE VIRTUAL TABLE commands_fts USING fts5(
    description,
    command_text,
    tokenize = 'trigram'
);

-- INSERT/UPDATE/DELETE の同期トリガー
CREATE TRIGGER commands_ai AFTER INSERT ON commands BEGIN ... END;
CREATE TRIGGER commands_au AFTER UPDATE ON commands BEGIN ... END;
CREATE TRIGGER commands_ad AFTER DELETE ON commands BEGIN ... END;
```

**ポイント:**

- `content=commands` の external content 形式は採用しなかった
  - 実装が単純で、トリガーの記述量も増えないため
  - 一方で同じ内容を 2 回保持するためサイズは約 2 倍になる（チートシートのコマンドは
    総文字数が小さいため許容範囲）
- `rowid` を `commands.id` と一致させて JOIN を簡潔にする

### 3. trigram tokenizer の特徴

- **3 文字以上の検索クエリ**で trigram インデックスが効く
- **大文字小文字を区別しない**（デフォルト）
- 部分一致が `MATCH` でできる（LIKE と異なり高速）
- 日本語のひらがな・カタカナ・漢字に対しても trigram で動作する
- `MATCH "abc"` は `description LIKE '%abc%' OR command_text LIKE '%abc%'` と
  ほぼ同じ意味を持つが、インデックスを利用する

### 4. unigram / bigram の扱い

trigram tokenizer は **3 文字未満のクエリでインデックスを使えない**ため、別途対応が必要。

検証コードでは以下のハイブリッド方式を採用した:

| クエリ長 | 経路 |
|---|---|
| 0 文字 | 検索を行わず空配列を返す |
| 1〜2 文字 | `commands` テーブルへの `LIKE '%query%' ESCAPE '\'` |
| 3 文字以上 | `commands_fts MATCH ?` |

**判定はバックエンド側で行う**ことを推奨する。フロントエンドからは
単一の `search_commands(query)` Tauri コマンドだけ提供すればよい。

レコード件数が増えた場合でも、RightCheat のチートシート規模（数百〜数千件想定）
であれば LIKE スキャンも十分実用的な速度で動作する。

### 5. 同期トリガーの動作確認

- INSERT 時 → `commands_fts` に新規行が追加される
- UPDATE 時 → 対応する `rowid` の行が書き換わる
- DELETE 時 → 対応する `rowid` の行が削除される

トランザクション内のロールバック挙動についてはこの検証では未確認だが、
SQLite のトリガーはトランザクションに従うため、issue #142 で実装する
`import_from_json` などのバルク処理でも整合性は保たれる想定。

## 推奨採用方針（issue #142 への提言）

- **採用ライブラリ**: `rusqlite 0.32+` の `bundled` feature
- **検索スキーマ**: 上記の `commands_fts` を `commands` と並列に作成し、
  3 つのトリガーで同期する
- **検索 API**: バックエンド側で文字数による分岐を持つ単一の Tauri コマンドを提供
- **検索対象**: 当面は `commands.description` と `commands.command_text` の 2 列
  - チートシートのタイトル（`cheatsheets.title`）も検索したい場合は
    別の FTS テーブル `cheatsheets_fts` を追加するか、検索結果から `cheatsheet_id`
    を引いて `JOIN` する

## 課題・残件

- **絞り込み（チートシート単位など）**: FTS5 の `MATCH` と通常の `WHERE` を
  組み合わせる例は未検証。issue #142 の API 実装時に確認する
- **ハイライト表示**: FTS5 には `highlight()` / `snippet()` が用意されている。
  検索 UI 側で必要になったら使用を検討
- **大量データ時のパフォーマンス**: 検証はサンプル 11 件のみ。大量件数での
  実測は本実装後の負荷テストに委ねる
