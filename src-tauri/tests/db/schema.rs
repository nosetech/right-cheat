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
    assert_eq!(version, 3);
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
    assert_eq!(version, 3);
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
