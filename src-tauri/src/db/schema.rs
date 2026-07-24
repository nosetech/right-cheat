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
    if version < 2 {
        migrate_v2(conn)?;
    }
    if version < 3 {
        migrate_v3(conn)?;
    }
    if version < 4 {
        migrate_v4(conn)?;
    }

    Ok(())
}

/// クリップボード履歴にコピー回数（copy_count）と初回コピー日時（first_copied_at）を追加する。
/// 既存行は copy_count = 1（DEFAULT）、first_copied_at は既存の copied_at 値で backfill する。
fn migrate_v4(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        ALTER TABLE clipboard_history ADD COLUMN copy_count INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE clipboard_history ADD COLUMN first_copied_at TEXT;

        UPDATE clipboard_history SET first_copied_at = copied_at WHERE first_copied_at IS NULL;

        INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '4');
        ",
    )
}

fn migrate_v3(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS clipboard_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            text       TEXT NOT NULL,
            char_count INTEGER NOT NULL,
            copied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_clipboard_history_copied_at
            ON clipboard_history(copied_at DESC);

        INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '3');
        ",
    )
}

fn migrate_v2(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS commands_fts USING fts5(
            description,
            command_text,
            tokenize = 'trigram'
        );

        CREATE TRIGGER IF NOT EXISTS commands_ai AFTER INSERT ON commands BEGIN
            INSERT INTO commands_fts(rowid, description, command_text)
            VALUES (new.id, new.description, new.command_text);
        END;

        CREATE TRIGGER IF NOT EXISTS commands_au AFTER UPDATE ON commands BEGIN
            UPDATE commands_fts
            SET description = new.description,
                command_text = new.command_text
            WHERE rowid = old.id;
        END;

        CREATE TRIGGER IF NOT EXISTS commands_ad AFTER DELETE ON commands BEGIN
            DELETE FROM commands_fts WHERE rowid = old.id;
        END;

        INSERT INTO commands_fts(rowid, description, command_text)
        SELECT id, description, command_text FROM commands;

        INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '2');
        ",
    )
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
