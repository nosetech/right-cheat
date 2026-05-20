use rusqlite::Connection;

#[allow(dead_code)]
const CURRENT_VERSION: i64 = 1;

pub fn apply_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
    )?;

    let version: i64 = conn
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM schema_meta WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if version < 1 {
        migrate_v1(conn)?;
    }

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS cheatsheets (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            title         TEXT NOT NULL UNIQUE,
            sheet_type    TEXT,
            layout        TEXT,
            window_width  INTEGER,
            window_height INTEGER,
            sort_order    INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS command_groups (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            cheatsheet_id INTEGER NOT NULL,
            group_name    TEXT NOT NULL,
            sort_order    INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (cheatsheet_id) REFERENCES cheatsheets(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS commands (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            cheatsheet_id INTEGER NOT NULL,
            group_id      INTEGER,
            description   TEXT,
            command_text  TEXT NOT NULL,
            layout        TEXT,
            sort_order    INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (cheatsheet_id) REFERENCES cheatsheets(id) ON DELETE CASCADE,
            FOREIGN KEY (group_id)      REFERENCES command_groups(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_groups_cheatsheet
            ON command_groups(cheatsheet_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_commands_cheatsheet
            ON commands(cheatsheet_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_commands_group
            ON commands(group_id, sort_order);

        INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '1');
        ",
    )
}

#[cfg(test)]
mod tests {
    use super::*;
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
        assert_eq!(version, CURRENT_VERSION);
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
        assert_eq!(version, CURRENT_VERSION);
    }
}
