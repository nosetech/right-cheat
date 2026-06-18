use crate::api::cheatsheet::{CheatSheet, Command, CommandGroup, CommandItem, WindowSize};
use rusqlite::{params, params_from_iter, types::ToSql, Connection, Result};

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
        "SELECT id, description, command_text, layout, sort_order
         FROM commands WHERE cheatsheet_id = ?1 AND group_id IS NULL
         ORDER BY sort_order ASC, id ASC",
    )?;
    let singles: Vec<(i64, CommandItem)> = single_stmt
        .query_map(params![cheatsheet_id], |row| {
            let sort_order: i64 = row.get(4)?;
            Ok((
                sort_order,
                CommandItem::Single(Command {
                    id: Some(row.get(0)?),
                    description: row.get(1)?,
                    command: row.get(2)?,
                    layout: row.get(3)?,
                }),
            ))
        })?
        .collect::<Result<Vec<_>>>()?;
    all_items.extend(singles);

    // グループ
    for &(group_id, ref group_name, group_sort_order) in &groups {
        let mut cmd_stmt = conn.prepare(
            "SELECT id, description, command_text, layout
             FROM commands WHERE group_id = ?1 ORDER BY sort_order ASC, id ASC",
        )?;
        let cmds: Vec<Command> = cmd_stmt
            .query_map(params![group_id], |row| {
                Ok(Command {
                    id: Some(row.get(0)?),
                    description: row.get(1)?,
                    command: row.get(2)?,
                    layout: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        all_items.push((
            group_sort_order,
            CommandItem::Group(CommandGroup {
                id: Some(group_id),
                group: group_name.clone(),
                commandlist: cmds,
            }),
        ));
    }

    all_items.sort_by_key(|(order, _)| *order);
    Ok(all_items.into_iter().map(|(_, item)| item).collect())
}

#[derive(Debug)]
pub struct SearchRow {
    pub id: i64,
    pub cheatsheet_id: i64,
    pub cheatsheet_title: String,
    pub description: String,
    pub command_text: String,
}

fn escape_like_query(query: &str) -> String {
    let escaped = query
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    format!("%{}%", escaped)
}

/// クエリを空白で分割して検索語の一覧を得る（連続した空白・前後の空白は無視）。
fn split_terms(query: &str) -> Vec<&str> {
    query.split_whitespace().collect()
}

pub fn search_by_like(conn: &Connection, query: &str, limit: u32) -> Result<Vec<SearchRow>> {
    let terms = split_terms(query);
    // 各検索語ごとに description / command_text のいずれかに含まれることを条件とし、
    // 語同士は AND で連結する（複数キーワードの絞り込み検索）。
    let mut conditions = Vec::with_capacity(terms.len());
    let mut bind: Vec<Box<dyn ToSql>> = Vec::with_capacity(terms.len() + 1);
    for (i, term) in terms.iter().enumerate() {
        let n = i + 1;
        conditions.push(format!(
            "(c.description LIKE ?{n} ESCAPE '\\' OR c.command_text LIKE ?{n} ESCAPE '\\')"
        ));
        bind.push(Box::new(escape_like_query(term)));
    }
    let limit_idx = terms.len() + 1;
    bind.push(Box::new(limit));
    let sql = format!(
        "SELECT c.id, c.cheatsheet_id, cs.title, COALESCE(c.description, ''), c.command_text
         FROM commands c
         JOIN cheatsheets cs ON c.cheatsheet_id = cs.id
         WHERE {}
         ORDER BY c.cheatsheet_id, c.sort_order
         LIMIT ?{limit_idx}",
        conditions.join(" AND ")
    );
    let mut stmt = conn.prepare(&sql)?;
    let results = stmt
        .query_map(params_from_iter(bind.iter()), |row| {
            Ok(SearchRow {
                id: row.get(0)?,
                cheatsheet_id: row.get(1)?,
                cheatsheet_title: row.get(2)?,
                description: row.get(3)?,
                command_text: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(results)
}

pub fn search_by_fts(conn: &Connection, query: &str, limit: u32) -> Result<Vec<SearchRow>> {
    // 各検索語をダブルクォートで囲んでフレーズ化し、空白で連結する。
    // FTS5 では空白区切りのフレーズは暗黙の AND となるため複数キーワードの絞り込みになる。
    let fts_query = split_terms(query)
        .iter()
        .map(|t| format!("\"{}\"", t.replace('"', "\"\"")))
        .collect::<Vec<_>>()
        .join(" ");
    let mut stmt = conn.prepare(
        "SELECT c.id, c.cheatsheet_id, cs.title, COALESCE(c.description, ''), c.command_text
         FROM commands c
         JOIN cheatsheets cs ON c.cheatsheet_id = cs.id
         WHERE c.id IN (SELECT rowid FROM commands_fts WHERE commands_fts MATCH ?1)
         ORDER BY c.cheatsheet_id, c.sort_order
         LIMIT ?2",
    )?;
    let results = stmt
        .query_map(params![fts_query, limit], |row| {
            Ok(SearchRow {
                id: row.get(0)?,
                cheatsheet_id: row.get(1)?,
                cheatsheet_title: row.get(2)?,
                description: row.get(3)?,
                command_text: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(results)
}

pub fn search_commands(conn: &Connection, query: &str, limit: u32) -> Result<Vec<SearchRow>> {
    let terms = split_terms(query);
    if terms.is_empty() {
        return Ok(vec![]);
    }
    // 全ての検索語が 3 文字以上なら trigram FTS を使える。
    // 1 つでも 3 文字未満の語があると FTS では一致しないため LIKE 検索にフォールバックする。
    if terms.iter().all(|t| t.chars().count() >= 3) {
        search_by_fts(conn, query, limit)
    } else {
        search_by_like(conn, query, limit)
    }
}

pub struct CheatSheetSummaryRow {
    pub id: i64,
    pub title: String,
    pub sort_order: i64,
    pub sheet_type: Option<String>,
    pub layout: Option<String>,
    pub command_count: i64,
}

pub fn list_cheat_sheet_summaries(conn: &Connection) -> Result<Vec<CheatSheetSummaryRow>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.title, c.sort_order, c.sheet_type, c.layout,
                COUNT(cmd.id) as command_count
         FROM cheatsheets c
         LEFT JOIN commands cmd ON cmd.cheatsheet_id = c.id
         GROUP BY c.id, c.title, c.sort_order, c.sheet_type, c.layout
         ORDER BY c.sort_order ASC, c.id ASC",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(CheatSheetSummaryRow {
                id: row.get(0)?,
                title: row.get(1)?,
                sort_order: row.get(2)?,
                sheet_type: row.get(3)?,
                layout: row.get(4)?,
                command_count: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
    Ok(rows)
}

pub struct CheatSheetUpdateItem {
    pub id: Option<i64>,
    pub title: String,
    pub sort_order: i64,
    pub sheet_type: Option<String>,
    pub layout: Option<String>,
}

pub fn update_cheat_sheets_batch(
    conn: &Connection,
    updates: &[CheatSheetUpdateItem],
) -> Result<()> {
    let tx = conn.unchecked_transaction()?;

    let existing_ids: Vec<i64> = {
        let mut stmt = tx.prepare("SELECT id FROM cheatsheets")?;
        let ids = stmt
            .query_map([], |r| r.get(0))?
            .collect::<Result<Vec<_>>>()?;
        ids
    };

    let updated_ids: std::collections::HashSet<i64> = updates.iter().filter_map(|u| u.id).collect();
    let deleted_ids: Vec<i64> = existing_ids
        .into_iter()
        .filter(|id| !updated_ids.contains(id))
        .collect();

    for id in &deleted_ids {
        tx.execute("DELETE FROM cheatsheets WHERE id = ?1", params![id])?;
    }

    for item in updates {
        match item.id {
            Some(id) => {
                tx.execute(
                    "UPDATE cheatsheets
                     SET title = ?1, sort_order = ?2, sheet_type = ?3, layout = ?4,
                         updated_at = datetime('now')
                     WHERE id = ?5",
                    params![
                        item.title,
                        item.sort_order,
                        item.sheet_type,
                        item.layout,
                        id
                    ],
                )?;
            }
            None => {
                tx.execute(
                    "INSERT INTO cheatsheets (title, sort_order, sheet_type, layout)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![item.title, item.sort_order, item.sheet_type, item.layout],
                )?;
            }
        }
    }

    tx.commit()?;
    Ok(())
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

/// チートシートタイトルからIDを取得する
pub fn get_cheatsheet_id_by_title(conn: &Connection, title: &str) -> Result<Option<i64>> {
    let result = conn.query_row(
        "SELECT id FROM cheatsheets WHERE title = ?1",
        params![title],
        |r| r.get(0),
    );
    match result {
        Ok(id) => Ok(Some(id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// トップレベルの最大sort_orderを取得（commandsとcommand_groupsの両方を考慮）
pub fn get_max_toplevel_sort_order(conn: &Connection, cheatsheet_id: i64) -> Result<i64> {
    let max_cmd: Option<i64> = conn
        .query_row(
            "SELECT MAX(sort_order) FROM commands WHERE cheatsheet_id = ?1 AND group_id IS NULL",
            params![cheatsheet_id],
            |r| r.get(0),
        )
        .unwrap_or(None);
    let max_grp: Option<i64> = conn
        .query_row(
            "SELECT MAX(sort_order) FROM command_groups WHERE cheatsheet_id = ?1",
            params![cheatsheet_id],
            |r| r.get(0),
        )
        .unwrap_or(None);
    let max = match (max_cmd, max_grp) {
        (Some(a), Some(b)) => a.max(b),
        (Some(a), None) => a,
        (None, Some(b)) => b,
        (None, None) => -1,
    };
    Ok(max)
}

/// グループ内コマンドの最大sort_orderを取得
pub fn get_max_command_in_group_sort_order(conn: &Connection, group_id: i64) -> Result<i64> {
    let max: Option<i64> = conn
        .query_row(
            "SELECT MAX(sort_order) FROM commands WHERE group_id = ?1",
            params![group_id],
            |r| r.get(0),
        )
        .unwrap_or(None);
    Ok(max.unwrap_or(-1))
}

/// コマンドを追加（新規）
pub fn add_command_row(
    conn: &Connection,
    cheatsheet_id: i64,
    group_id: Option<i64>,
    description: Option<&str>,
    command_text: &str,
    layout: Option<&str>,
    sort_order: i64,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO commands (cheatsheet_id, group_id, description, command_text, layout, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![cheatsheet_id, group_id, description, command_text, layout, sort_order],
    )?;
    Ok(conn.last_insert_rowid())
}

/// コマンドを更新
pub fn update_command_row(
    conn: &Connection,
    id: i64,
    group_id: Option<i64>,
    description: Option<&str>,
    command_text: &str,
    layout: Option<&str>,
) -> Result<()> {
    conn.execute(
        "UPDATE commands SET group_id = ?1, description = ?2, command_text = ?3, layout = ?4 WHERE id = ?5",
        params![group_id, description, command_text, layout, id],
    )?;
    Ok(())
}

/// コマンドを削除
pub fn delete_command_row(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM commands WHERE id = ?1", params![id])?;
    Ok(())
}

/// グループを追加
pub fn add_group_row(
    conn: &Connection,
    cheatsheet_id: i64,
    name: &str,
    sort_order: i64,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO command_groups (cheatsheet_id, group_name, sort_order) VALUES (?1, ?2, ?3)",
        params![cheatsheet_id, name, sort_order],
    )?;
    Ok(conn.last_insert_rowid())
}

/// グループを更新
pub fn update_group_row(conn: &Connection, id: i64, name: &str) -> Result<()> {
    conn.execute(
        "UPDATE command_groups SET group_name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

/// グループを削除（CASCADEでcommandも削除）
pub fn delete_group_row(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM command_groups WHERE id = ?1", params![id])?;
    Ok(())
}

/// コマンドリスト全体を置き換え（SAVEPOINTでアトミックに）
pub fn replace_commandlist_by_title(
    conn: &Connection,
    title: &str,
    commandlist: &[CommandItem],
) -> Result<()> {
    conn.execute_batch("SAVEPOINT replace_commandlist")?;

    let result = (|| -> Result<()> {
        let cheatsheet_id: i64 = conn.query_row(
            "SELECT id FROM cheatsheets WHERE title = ?1",
            params![title],
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
        conn.execute(
            "UPDATE cheatsheets SET updated_at = datetime('now') WHERE id = ?1",
            params![cheatsheet_id],
        )?;

        insert_commandlist(conn, cheatsheet_id, commandlist)?;
        Ok(())
    })();

    match result {
        Ok(()) => {
            conn.execute_batch("RELEASE replace_commandlist")?;
            Ok(())
        }
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK TO replace_commandlist");
            Err(e)
        }
    }
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
