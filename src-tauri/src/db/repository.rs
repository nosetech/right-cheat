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
        "SELECT id, group_name FROM command_groups
         WHERE cheatsheet_id = ?1 ORDER BY sort_order ASC, id ASC",
    )?;

    let groups: Vec<(i64, String)> = groups_stmt
        .query_map(params![cheatsheet_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
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
    for (group_id, group_name) in &groups {
        let group_sort_order: i64 = conn.query_row(
            "SELECT sort_order FROM command_groups WHERE id = ?1",
            params![group_id],
            |r| r.get(0),
        )?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::apply_migrations;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        apply_migrations(&conn).unwrap();
        conn
    }

    fn make_sheet(title: &str) -> CheatSheet {
        CheatSheet {
            sheet_type: None,
            title: title.to_string(),
            window_size: None,
            layout: None,
            commandlist: vec![CommandItem::Single(Command {
                description: Some("desc".to_string()),
                command: "cmd".to_string(),
                layout: None,
            })],
        }
    }

    #[test]
    fn insert_and_get_titles() {
        let conn = setup();
        let sheet = make_sheet("Sheet1");
        insert_cheatsheet(&conn, &sheet, 0).unwrap();

        let titles = get_all_titles(&conn).unwrap();
        assert_eq!(titles, vec!["Sheet1"]);
    }

    #[test]
    fn get_cheatsheet_by_title_returns_none_for_unknown() {
        let conn = setup();
        let result = get_cheatsheet_by_title(&conn, "Unknown").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn insert_and_retrieve_cheatsheet() {
        let conn = setup();
        let sheet = make_sheet("TestSheet");
        let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
        insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

        let retrieved = get_cheatsheet_by_title(&conn, "TestSheet")
            .unwrap()
            .unwrap();
        assert_eq!(retrieved.title, "TestSheet");
        assert_eq!(retrieved.commandlist.len(), 1);
    }

    #[test]
    fn save_and_get_window_size() {
        let conn = setup();
        let sheet = make_sheet("WinSheet");
        insert_cheatsheet(&conn, &sheet, 0).unwrap();

        save_window_size(
            &conn,
            "WinSheet",
            Some(&WindowSize {
                width: 400,
                height: 300,
            }),
        )
        .unwrap();

        let ws = get_window_size(&conn, "WinSheet").unwrap().unwrap();
        assert_eq!(ws.width, 400);
        assert_eq!(ws.height, 300);
    }

    #[test]
    fn save_window_size_none_clears_size() {
        let conn = setup();
        let sheet = make_sheet("WinSheet2");
        insert_cheatsheet(&conn, &sheet, 0).unwrap();

        save_window_size(
            &conn,
            "WinSheet2",
            Some(&WindowSize {
                width: 500,
                height: 600,
            }),
        )
        .unwrap();
        save_window_size(&conn, "WinSheet2", None).unwrap();

        let ws = get_window_size(&conn, "WinSheet2").unwrap();
        assert!(ws.is_none());
    }

    #[test]
    fn save_window_size_returns_false_for_unknown_title() {
        let conn = setup();
        let updated = save_window_size(
            &conn,
            "NoSuchSheet",
            Some(&WindowSize {
                width: 100,
                height: 100,
            }),
        )
        .unwrap();
        assert!(!updated);
    }

    #[test]
    fn title_exists_returns_correct_result() {
        let conn = setup();
        let sheet = make_sheet("ExistsSheet");
        insert_cheatsheet(&conn, &sheet, 0).unwrap();

        assert!(title_exists(&conn, "ExistsSheet").unwrap());
        assert!(!title_exists(&conn, "NoSuchSheet").unwrap());
    }

    #[test]
    fn update_cheatsheet_modifies_commandlist() {
        let conn = setup();
        let sheet = make_sheet("UpdateSheet");
        insert_cheatsheet(&conn, &sheet, 0).unwrap();

        let mut updated = make_sheet("UpdateSheet");
        updated.commandlist = vec![
            CommandItem::Single(Command {
                description: Some("new desc".to_string()),
                command: "new cmd".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                description: None,
                command: "cmd2".to_string(),
                layout: None,
            }),
        ];
        update_cheatsheet(&conn, &updated).unwrap();

        let retrieved = get_cheatsheet_by_title(&conn, "UpdateSheet")
            .unwrap()
            .unwrap();
        assert_eq!(retrieved.commandlist.len(), 2);
    }

    #[test]
    fn delete_cheatsheet_removes_entry() {
        let conn = setup();
        let sheet = make_sheet("DeleteSheet");
        insert_cheatsheet(&conn, &sheet, 0).unwrap();
        delete_cheatsheet(&conn, "DeleteSheet").unwrap();

        let titles = get_all_titles(&conn).unwrap();
        assert!(!titles.contains(&"DeleteSheet".to_string()));
    }

    #[test]
    fn group_commandlist_roundtrip() {
        let conn = setup();
        let sheet = CheatSheet {
            sheet_type: Some("shortcut".to_string()),
            title: "GroupSheet".to_string(),
            window_size: None,
            layout: None,
            commandlist: vec![
                CommandItem::Single(Command {
                    description: Some("single cmd".to_string()),
                    command: "s".to_string(),
                    layout: None,
                }),
                CommandItem::Group(CommandGroup {
                    group: "Group1".to_string(),
                    commandlist: vec![
                        Command {
                            description: Some("g1c1".to_string()),
                            command: "g1c1cmd".to_string(),
                            layout: None,
                        },
                        Command {
                            description: None,
                            command: "g1c2cmd".to_string(),
                            layout: None,
                        },
                    ],
                }),
            ],
        };
        let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
        insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

        let retrieved = get_cheatsheet_by_title(&conn, "GroupSheet")
            .unwrap()
            .unwrap();
        assert_eq!(retrieved.commandlist.len(), 2);

        match &retrieved.commandlist[0] {
            CommandItem::Single(cmd) => assert_eq!(cmd.command, "s"),
            _ => panic!("最初の要素は Single のはず"),
        }
        match &retrieved.commandlist[1] {
            CommandItem::Group(g) => {
                assert_eq!(g.group, "Group1");
                assert_eq!(g.commandlist.len(), 2);
            }
            _ => panic!("2番目の要素は Group のはず"),
        }
    }

    #[test]
    fn sort_order_is_preserved() {
        let conn = setup();
        let sheet1 = make_sheet("A");
        let sheet2 = make_sheet("B");
        let sheet3 = make_sheet("C");
        insert_cheatsheet(&conn, &sheet1, 10).unwrap();
        insert_cheatsheet(&conn, &sheet2, 5).unwrap();
        insert_cheatsheet(&conn, &sheet3, 20).unwrap();

        let titles = get_all_titles(&conn).unwrap();
        assert_eq!(titles, vec!["B", "A", "C"]);
    }
}
