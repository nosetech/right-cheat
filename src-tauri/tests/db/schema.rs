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
    assert_eq!(version, 2);
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
    assert_eq!(version, 2);
}
