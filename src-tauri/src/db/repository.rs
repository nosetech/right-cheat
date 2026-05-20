use crate::api::cheatsheet::{CheatSheet, Command, CommandGroup, CommandItem, WindowSize};
use rusqlite::{params, Connection, Result};

pub struct CheatsheetRow {
    pub id: i64,
    pub title: String,
    pub sheet_type: Option<String>,
    pub layout: Option<String>,
    pub window_width: Option<i64>,
    pub window_height: Option<i64>,
    pub sort_order: i64,
}

pub fn get_all_titles(conn: &Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT title FROM cheatsheets ORDER BY sort_order ASC, id ASC")?;
    let titles = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>>>()?;
    Ok(titles)
}

pub fn get_cheatsheet_by_title(conn: &Connection, title: &str) -> Result<Option<CheatSheet>> {
    let row = conn.query_row(
        "SELECT id, title, sheet_type, layout, window_width, window_height, sort_order
         FROM cheatsheets WHERE title = ?1",
        params![title],
        |row| {
            Ok(CheatsheetRow {
                id: row.get(0)?,
                title: row.get(1)?,
                sheet_type: row.get(2)?,
                layout: row.get(3)?,
                window_width: row.get(4)?,
                window_height: row.get(5)?,
                sort_order: row.get(6)?,
            })
        },
    );

    let row = match row {
        Ok(r) => r,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
        Err(e) => return Err(e),
    };

    let commandlist = load_commandlist(conn, row.id)?;

    let window_size = match (row.window_width, row.window_height) {
        (Some(w), Some(h)) => Some(WindowSize {
            width: w as u32,
            height: h as u32,
        }),
        _ => None,
    };

    Ok(Some(CheatSheet {
        sheet_type: row.sheet_type,
        title: row.title,
        window_size,
        layout: row.layout,
        commandlist,
    }))
}

pub fn get_window_size(conn: &Connection, title: &str) -> Result<Option<WindowSize>> {
    let result = conn.query_row(
        "SELECT window_width, window_height FROM cheatsheets WHERE title = ?1",
        params![title],
        |row| {
            let w: Option<i64> = row.get(0)?;
            let h: Option<i64> = row.get(1)?;
            Ok((w, h))
        },
    );

    match result {
        Ok((Some(w), Some(h))) => Ok(Some(WindowSize {
            width: w as u32,
            height: h as u32,
        })),
        Ok(_) => Ok(None),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn save_window_size(
    conn: &Connection,
    title: &str,
    window_size: Option<&WindowSize>,
) -> Result<bool> {
    let (w, h) = match window_size {
        Some(ws) => (Some(ws.width as i64), Some(ws.height as i64)),
        None => (None, None),
    };

    let updated = conn.execute(
        "UPDATE cheatsheets SET window_width = ?1, window_height = ?2,
         updated_at = datetime('now') WHERE title = ?3",
        params![w, h, title],
    )?;

    Ok(updated > 0)
}

pub fn insert_cheatsheet(conn: &Connection, sheet: &CheatSheet, sort_order: i64) -> Result<i64> {
    let window_width = sheet.window_size.as_ref().map(|ws| ws.width as i64);
    let window_height = sheet.window_size.as_ref().map(|ws| ws.height as i64);

    conn.execute(
        "INSERT INTO cheatsheets (title, sheet_type, layout, window_width, window_height, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            sheet.title,
            sheet.sheet_type,
            sheet.layout,
            window_width,
            window_height,
            sort_order,
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_cheatsheet(conn: &Connection, sheet: &CheatSheet) -> Result<()> {
    // SAVEPOINTを使用することでトランザクション内外どちらからも安全に呼べる
    conn.execute_batch("SAVEPOINT update_cheatsheet")?;

    let result = (|| -> Result<()> {
        let window_width = sheet.window_size.as_ref().map(|ws| ws.width as i64);
        let window_height = sheet.window_size.as_ref().map(|ws| ws.height as i64);

        conn.execute(
            "UPDATE cheatsheets SET sheet_type = ?1, layout = ?2,
             window_width = ?3, window_height = ?4, updated_at = datetime('now')
             WHERE title = ?5",
            params![
                sheet.sheet_type,
                sheet.layout,
                window_width,
                window_height,
                sheet.title,
            ],
        )?;

        let cheatsheet_id: i64 = conn.query_row(
            "SELECT id FROM cheatsheets WHERE title = ?1",
            params![sheet.title],
            |r| r.get(0),
        )?;

        conn.execute(
            "DELETE FROM commands WHERE cheatsheet_id = ?1 AND group_id IS NULL",
            params![cheatsheet_id],
        )?;
        conn.execute(
            "DELETE FROM command_groups WHERE cheatsheet_id = ?1",
            params![cheatsheet_id],
        )?;

        insert_commandlist(conn, cheatsheet_id, &sheet.commandlist)?;
        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute_batch("RELEASE update_cheatsheet")?;
            Ok(())
        }
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK TO update_cheatsheet");
            Err(e)
        }
    }
}

pub fn delete_cheatsheet(conn: &Connection, title: &str) -> Result<()> {
    conn.execute("DELETE FROM cheatsheets WHERE title = ?1", params![title])?;
    Ok(())
}

pub fn title_exists(conn: &Connection, title: &str) -> Result<bool> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM cheatsheets WHERE title = ?1",
        params![title],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

pub fn get_max_sort_order(conn: &Connection) -> Result<i64> {
    let max: Option<i64> = conn
        .query_row("SELECT MAX(sort_order) FROM cheatsheets", [], |r| r.get(0))
        .unwrap_or(None);
    Ok(max.unwrap_or(-1))
}

pub fn insert_commandlist(
    conn: &Connection,
    cheatsheet_id: i64,
    commandlist: &[CommandItem],
) -> Result<()> {
    for (idx, item) in commandlist.iter().enumerate() {
        match item {
            CommandItem::Single(cmd) => {
                conn.execute(
                    "INSERT INTO commands (cheatsheet_id, group_id, description, command_text, layout, sort_order)
                     VALUES (?1, NULL, ?2, ?3, ?4, ?5)",
                    params![
                        cheatsheet_id,
                        cmd.description,
                        cmd.command,
                        cmd.layout,
                        idx as i64,
                    ],
                )?;
            }
            CommandItem::Group(group) => {
                conn.execute(
                    "INSERT INTO command_groups (cheatsheet_id, group_name, sort_order)
                     VALUES (?1, ?2, ?3)",
                    params![cheatsheet_id, group.group, idx as i64],
                )?;
                let group_id = conn.last_insert_rowid();
                for (cidx, cmd) in group.commandlist.iter().enumerate() {
                    conn.execute(
                        "INSERT INTO commands (cheatsheet_id, group_id, description, command_text, layout, sort_order)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                        params![
                            cheatsheet_id,
                            group_id,
                            cmd.description,
                            cmd.command,
                            cmd.layout,
                            cidx as i64,
                        ],
                    )?;
                }
            }
        }
    }
    Ok(())
}

fn load_commandlist(conn: &Connection, cheatsheet_id: i64) -> Result<Vec<CommandItem>> {
    let mut groups_stmt = conn.prepare(
        "SELECT id, group_name, sort_order FROM command_groups
         WHERE cheatsheet_id = ?1 ORDER BY sort_order ASC, id ASC",
    )?;

    let groups: Vec<(i64, String, i64)> = groups_stmt
        .query_map(params![cheatsheet_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>>>()?;

    let mut all_items: Vec<(i64, CommandItem)> = Vec::new();

    // グループ無しコマンド
    let mut single_stmt = conn.prepare(
        "SELECT description, command_text, layout, sort_order
         FROM commands WHERE cheatsheet_id = ?1 AND group_id IS NULL
         ORDER BY sort_order ASC, id ASC",
    )?;
    let singles: Vec<(i64, CommandItem)> = single_stmt
        .query_map(params![cheatsheet_id], |row| {
            let sort_order: i64 = row.get(3)?;
            Ok((
                sort_order,
                CommandItem::Single(Command {
                    description: row.get(0)?,
                    command: row.get(1)?,
                    layout: row.get(2)?,
                }),
            ))
        })?
        .collect::<Result<Vec<_>>>()?;
    all_items.extend(singles);

    // グループ
    for &(group_id, ref group_name, group_sort_order) in &groups {
        let mut cmd_stmt = conn.prepare(
            "SELECT description, command_text, layout
             FROM commands WHERE group_id = ?1 ORDER BY sort_order ASC, id ASC",
        )?;
        let cmds: Vec<Command> = cmd_stmt
            .query_map(params![group_id], |row| {
                Ok(Command {
                    description: row.get(0)?,
                    command: row.get(1)?,
                    layout: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        all_items.push((
            group_sort_order,
            CommandItem::Group(CommandGroup {
                group: group_name.clone(),
                commandlist: cmds,
            }),
        ));
    }

    all_items.sort_by_key(|(order, _)| *order);
    Ok(all_items.into_iter().map(|(_, item)| item).collect())
}

/// 全チートシートを取得する。将来のエクスポート拡張用。
#[allow(dead_code)]
pub fn get_all_cheatsheets(conn: &Connection) -> Result<Vec<CheatSheet>> {
    let titles = get_all_titles(conn)?;
    let mut sheets = Vec::new();
    for title in &titles {
        if let Some(sheet) = get_cheatsheet_by_title(conn, title)? {
            sheets.push(sheet);
        }
    }
    Ok(sheets)
}

/// タイトルごとのコマンド数を返す。将来のエクスポートUI表示用。
#[allow(dead_code)]
pub fn count_commands_for_titles(
    conn: &Connection,
    titles: &[String],
) -> Result<Vec<(String, i64)>> {
    let mut result = Vec::new();
    for title in titles {
        let cheatsheet_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM cheatsheets WHERE title = ?1",
                params![title],
                |r| r.get(0),
            )
            .ok();
        if let Some(id) = cheatsheet_id {
            let count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM commands WHERE cheatsheet_id = ?1",
                params![id],
                |r| r.get(0),
            )?;
            result.push((title.clone(), count));
        } else {
            result.push((title.clone(), 0));
        }
    }
    Ok(result)
}
