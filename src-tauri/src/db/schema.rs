use rusqlite::Connection;

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
