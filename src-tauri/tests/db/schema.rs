use app_lib::db::schema::apply_migrations;
use rusqlite::Connection;

fn in_memory_conn() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    conn
}

#[test]
fn apply_migrations_creates_tables() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    // 通常テーブル 4 つ + FTS5 仮想テーブル 1 つ
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type IN ('table') AND name IN \
             ('cheatsheets','command_groups','commands','schema_meta','commands_fts')",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 5, "5つのテーブル（FTS含む）が作成されること");
}

#[test]
fn apply_migrations_creates_fts_triggers() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name IN \
             ('commands_ai','commands_au','commands_ad')",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 3, "FTS同期トリガーが3つ作成されること");
}

#[test]
fn schema_version_is_set() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let version: i64 = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM schema_meta WHERE key = 'schema_version'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(version, 4);
}

#[test]
fn apply_migrations_is_idempotent() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();
    apply_migrations(&conn).unwrap();

    let version: i64 = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM schema_meta WHERE key = 'schema_version'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(version, 4);
}

// ── v3: clipboard_history テーブルのテスト ─────────────────────
//
// テスト対象: migrate_v3 で追加される clipboard_history テーブルと
// idx_clipboard_history_copied_at インデックス
//
// ブラックボックス テスト設計:
//   [同値分割]
//     有効クラス①: text / char_count を指定した INSERT → 成功
//     無効クラス②: text が NULL → NOT NULL 制約違反でエラー
//     無効クラス③: char_count が NULL → NOT NULL 制約違反でエラー
//   [境界値分析]
//     copied_at を明示指定しない INSERT → DEFAULT (datetime('now')) が適用される
//
// ホワイトボックス テスト設計:
//   - id が AUTOINCREMENT のため、削除後の再挿入で id が再利用されないこと

#[test]
fn apply_migrations_creates_clipboard_history_table() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='clipboard_history'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1, "clipboard_history テーブルが作成されること");
}

#[test]
fn apply_migrations_creates_clipboard_history_index() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_clipboard_history_copied_at'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        count, 1,
        "idx_clipboard_history_copied_at インデックスが作成されること"
    );
}

#[test]
fn clipboard_history_copied_at_defaults_to_now_when_omitted() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    // copied_at を指定せずに INSERT → DEFAULT (datetime('now')) が適用される
    conn.execute(
        "INSERT INTO clipboard_history (text, char_count) VALUES ('abc', 3)",
        [],
    )
    .unwrap();

    let copied_at: String = conn
        .query_row(
            "SELECT copied_at FROM clipboard_history WHERE text = 'abc'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(
        !copied_at.is_empty(),
        "copied_at にデフォルト値が設定されること"
    );
}

#[test]
fn clipboard_history_text_not_null_constraint_rejects_null() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let result = conn.execute(
        "INSERT INTO clipboard_history (text, char_count) VALUES (NULL, 0)",
        [],
    );
    assert!(result.is_err(), "text が NULL の INSERT はエラーになること");
}

#[test]
fn clipboard_history_char_count_not_null_constraint_rejects_null() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let result = conn.execute(
        "INSERT INTO clipboard_history (text, char_count) VALUES ('abc', NULL)",
        [],
    );
    assert!(
        result.is_err(),
        "char_count が NULL の INSERT はエラーになること"
    );
}

#[test]
fn clipboard_history_id_autoincrement_does_not_reuse_deleted_id() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    conn.execute(
        "INSERT INTO clipboard_history (text, char_count) VALUES ('first', 5)",
        [],
    )
    .unwrap();
    let first_id = conn.last_insert_rowid();

    conn.execute("DELETE FROM clipboard_history WHERE id = ?1", [first_id])
        .unwrap();

    conn.execute(
        "INSERT INTO clipboard_history (text, char_count) VALUES ('second', 6)",
        [],
    )
    .unwrap();
    let second_id = conn.last_insert_rowid();

    assert!(
        second_id > first_id,
        "AUTOINCREMENT により削除済み id が再利用されないこと"
    );
}

// ── v4: clipboard_history への copy_count / first_copied_at 追加マイグレーションのテスト ──
//
// テスト対象: migrate_v4 で追加される copy_count（DEFAULT 1）/ first_copied_at カラムと、
// 既存データ（v3 スキーマ相当）に対する first_copied_at の backfill 処理
//
// ブラックボックス テスト設計:
//   [同値分割]
//     有効クラス①: copy_count を指定しない INSERT → DEFAULT 1 が適用される
//     有効クラス②: copy_count を明示指定した INSERT → 指定値がそのまま入る
//     有効クラス③: マイグレーション適用前（v3 相当）に存在した行 → first_copied_at が
//                   copied_at の値で backfill される
//   [境界値分析]
//     backfill 対象行が 0 件（新規に v1〜v4 まで適用したケース）/ 1 件 / 複数件
//
// ホワイトボックス テスト設計:
//   - apply_migrations を schema_version = 3 の状態から呼び出すと migrate_v4 のみが
//     実行される分岐を通ることを検証する
//   - apply_migrations は v3 → v4 の部分適用後も冪等であること（重複 ALTER TABLE で
//     エラーにならないこと）

/// v3 スキーマ相当（copy_count / first_copied_at カラムがまだ存在しない状態）を
/// 手動で構築し、1行だけ登録した Connection を返す。
/// migrate_v1〜v3 は private のため直接呼べず、apply_migrations 経由では一気に
/// 最新版まで進んでしまうため、ここでは v3 相当のテーブル定義を直接実行して
/// schema_version を 3 に設定する。
fn v3_conn_with_row(text: &str, char_count: i64, copied_at: &str) -> Connection {
    let conn = in_memory_conn();
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE clipboard_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            text       TEXT NOT NULL,
            char_count INTEGER NOT NULL,
            copied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
        );
        INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '3');
        ",
    )
    .unwrap();
    conn.execute(
        "INSERT INTO clipboard_history (text, char_count, copied_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![text, char_count, copied_at],
    )
    .unwrap();
    conn
}

#[test]
fn apply_migrations_adds_copy_count_and_first_copied_at_columns() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    let mut stmt = conn
        .prepare("PRAGMA table_info(clipboard_history)")
        .unwrap();
    let columns: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();

    assert!(
        columns.contains(&"copy_count".to_string()),
        "copy_count カラムが追加されること"
    );
    assert!(
        columns.contains(&"first_copied_at".to_string()),
        "first_copied_at カラムが追加されること"
    );
}

#[test]
fn clipboard_history_copy_count_defaults_to_one_when_omitted() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    conn.execute(
        "INSERT INTO clipboard_history (text, char_count, first_copied_at) \
         VALUES ('abc', 3, '2026-01-01 00:00:00.000')",
        [],
    )
    .unwrap();

    let copy_count: i64 = conn
        .query_row(
            "SELECT copy_count FROM clipboard_history WHERE text = 'abc'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        copy_count, 1,
        "copy_count を指定しない INSERT では DEFAULT 1 が適用されること"
    );
}

#[test]
fn clipboard_history_copy_count_can_be_set_explicitly() {
    let conn = in_memory_conn();
    apply_migrations(&conn).unwrap();

    conn.execute(
        "INSERT INTO clipboard_history (text, char_count, first_copied_at, copy_count) \
         VALUES ('xyz', 3, '2026-01-01 00:00:00.000', 5)",
        [],
    )
    .unwrap();

    let copy_count: i64 = conn
        .query_row(
            "SELECT copy_count FROM clipboard_history WHERE text = 'xyz'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        copy_count, 5,
        "copy_count を明示指定した場合はその値が入ること"
    );
}

#[test]
fn migrate_v4_backfills_first_copied_at_from_copied_at_for_existing_row() {
    // Arrange: v3 相当のスキーマ・データ（first_copied_at カラムがまだ存在しない状態）
    let conn = v3_conn_with_row("legacy", 6, "2025-06-01 10:00:00.000");

    // Act: schema_version=3 から apply_migrations を呼ぶと migrate_v4 のみが実行される
    apply_migrations(&conn).unwrap();

    // Assert: first_copied_at が既存の copied_at 値で backfill されること
    let (copied_at, first_copied_at): (String, String) = conn
        .query_row(
            "SELECT copied_at, first_copied_at FROM clipboard_history WHERE text = 'legacy'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(copied_at, "2025-06-01 10:00:00.000");
    assert_eq!(
        first_copied_at, copied_at,
        "既存行の first_copied_at は copied_at の値で backfill されること"
    );
}

#[test]
fn migrate_v4_backfills_copy_count_default_for_existing_row() {
    // Arrange: v3 相当のスキーマ・データ
    let conn = v3_conn_with_row("legacy2", 7, "2025-06-02 10:00:00.000");

    // Act
    apply_migrations(&conn).unwrap();

    // Assert: ALTER TABLE の DEFAULT 1 により既存行にも copy_count = 1 が入ること
    let copy_count: i64 = conn
        .query_row(
            "SELECT copy_count FROM clipboard_history WHERE text = 'legacy2'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(copy_count, 1, "既存行にも DEFAULT 1 が適用されること");
}

#[test]
fn migrate_v4_multiple_existing_rows_are_all_backfilled() {
    // Arrange: 複数行が存在する v3 相当データ（境界値: 1件 → 複数件）
    let conn = v3_conn_with_row("row1", 4, "2025-01-01 00:00:00.000");
    conn.execute(
        "INSERT INTO clipboard_history (text, char_count, copied_at) \
         VALUES ('row2', 4, '2025-01-02 00:00:00.000')",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO clipboard_history (text, char_count, copied_at) \
         VALUES ('row3', 4, '2025-01-03 00:00:00.000')",
        [],
    )
    .unwrap();

    // Act
    apply_migrations(&conn).unwrap();

    // Assert: 全行が backfill されること（NULL の行が残らない）
    let null_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM clipboard_history WHERE first_copied_at IS NULL",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        null_count, 0,
        "全ての既存行の first_copied_at が backfill されること"
    );
}

#[test]
fn migrate_v4_applied_from_v3_updates_schema_version_to_4() {
    // Arrange: schema_version = 3（境界値: 0件のbackfill対象ではなく1件のみ）
    let conn = v3_conn_with_row("v", 1, "2025-01-01 00:00:00.000");

    // Act
    apply_migrations(&conn).unwrap();

    // Assert
    let version: i64 = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM schema_meta WHERE key = 'schema_version'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(version, 4);
}

#[test]
fn apply_migrations_from_v3_is_idempotent() {
    // v3 相当の状態から apply_migrations を複数回呼んでもエラーにならないこと
    // （migrate_v4 の ALTER TABLE がスキーマバージョンガードにより再実行されないこと）
    let conn = v3_conn_with_row("idem", 4, "2025-01-01 00:00:00.000");

    apply_migrations(&conn).unwrap();
    let result = apply_migrations(&conn);

    assert!(
        result.is_ok(),
        "v3 から適用後、再度 apply_migrations を呼んでもエラーにならないこと"
    );

    let version: i64 = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM schema_meta WHERE key = 'schema_version'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(version, 4);
}
