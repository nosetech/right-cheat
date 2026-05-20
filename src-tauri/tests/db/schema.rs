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

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN \
             ('cheatsheets','command_groups','commands','schema_meta')",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 4, "4つのテーブルが作成されること");
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
    assert_eq!(version, 1);
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
    assert_eq!(version, 1);
}
