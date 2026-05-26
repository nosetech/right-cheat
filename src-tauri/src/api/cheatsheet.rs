use crate::common;
use crate::db::{repository, DbConnection};
use serde::{Deserialize, Serialize};
use std::fmt;
use tauri::{AppHandle, Emitter, EventTarget, Manager};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    Skip,
    Overwrite,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

impl WindowSize {
    pub fn clamp_to_min(self, min_width: u32, min_height: u32) -> Self {
        Self {
            width: self.width.max(min_width),
            height: self.height.max(min_height),
        }
    }
}

fn window_size_defaults_from_config<R: tauri::Runtime>(app: &AppHandle<R>) -> (u32, u32) {
    let config = app.config();
    let first_window = config.app.windows.first();
    let min_width = first_window.and_then(|w| w.min_width).unwrap_or(0.0) as u32;
    let min_height = first_window.and_then(|w| w.min_height).unwrap_or(0.0) as u32;
    (min_width, min_height)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub success: bool,
    pub error: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CheatSheet {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(rename = "type")]
    pub sheet_type: Option<String>,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub window_size: Option<WindowSize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub layout: Option<String>,
    pub commandlist: Vec<CommandItem>,
}

impl fmt::Display for CheatSheet {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "title = {}, commandlist = ", self.title)?;
        for item in self.commandlist.iter() {
            write!(f, "(")?;
            item.fmt(f)?;
            write!(f, "),")?;
        }
        write!(f, "")
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub enum CommandItem {
    Group(CommandGroup),
    Single(Command),
}

impl fmt::Display for CommandItem {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            CommandItem::Group(g) => write!(f, "group = {}", g.group),
            CommandItem::Single(c) => c.fmt(f),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandGroup {
    pub group: String,
    pub commandlist: Vec<Command>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Command {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub command: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub layout: Option<String>,
}

impl fmt::Display for Command {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "description = {}, command = {}",
            self.description.as_deref().unwrap_or(""),
            self.command
        )
    }
}

#[derive(Debug, Serialize)]
pub struct ImportSummary {
    pub added: usize,
    pub updated: usize,
    pub skipped: usize,
}

#[derive(Debug, Serialize)]
pub struct CommandSearchResult {
    pub id: i64,
    pub cheatsheet_id: i64,
    pub cheatsheet_title: String,
    pub description: String,
    pub command_text: String,
}

impl From<repository::SearchRow> for CommandSearchResult {
    fn from(r: repository::SearchRow) -> Self {
        Self {
            id: r.id,
            cheatsheet_id: r.cheatsheet_id,
            cheatsheet_title: r.cheatsheet_title,
            description: r.description,
            command_text: r.command_text,
        }
    }
}

fn with_db<R: tauri::Runtime, T, F>(app: &AppHandle<R>, f: F) -> Result<T, String>
where
    F: FnOnce(&rusqlite::Connection) -> Result<T, rusqlite::Error>,
{
    let state = app.state::<DbConnection>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    f(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_cheat_titles<R: tauri::Runtime>(app: AppHandle<R>) -> String {
    match with_db(&app, |conn| repository::get_all_titles(conn)) {
        Ok(titles) => {
            #[derive(Serialize)]
            struct TitleResponse {
                title: Vec<String>,
            }
            serde_json::to_string(&TitleResponse { title: titles })
                .unwrap_or_else(|_| r#"{"title":[]}"#.to_string())
        }
        Err(e) => {
            log::error!("[cheatsheet] get_cheat_titles error: {}", e);
            let err = ErrorResponse {
                success: false,
                error: e,
            };
            serde_json::to_string(&err).unwrap_or_else(|_| {
                r#"{"success":false,"error":"JSON response generation error"}"#.to_string()
            })
        }
    }
}

#[tauri::command]
pub fn get_cheat_sheet<R: tauri::Runtime>(app: AppHandle<R>, title: &str) -> String {
    match with_db(&app, |conn| {
        repository::get_cheatsheet_by_title(conn, title)
    }) {
        Ok(Some(sheet)) => serde_json::to_string(&sheet).unwrap_or_else(|_| "{}".to_string()),
        Ok(None) => "{}".to_string(),
        Err(e) => {
            log::error!("[cheatsheet] get_cheat_sheet error: {}", e);
            let err = ErrorResponse {
                success: false,
                error: e,
            };
            serde_json::to_string(&err).unwrap_or_else(|_| {
                r#"{"success":false,"error":"JSON response generation error"}"#.to_string()
            })
        }
    }
}

#[tauri::command]
pub fn reload_cheat_sheet<R: tauri::Runtime>(app: AppHandle<R>) -> String {
    match app.emit_to(EventTarget::app(), common::event::RELOAD_CHEAT_SHEET, ()) {
        Ok(_) => r#"{"status": "success"}"#.to_string(),
        Err(_) => r#"{"status": "fail"}"#.to_string(),
    }
}

#[tauri::command]
pub fn get_cheat_sheet_window_size<R: tauri::Runtime>(
    app: AppHandle<R>,
    title: &str,
) -> Result<Option<WindowSize>, String> {
    with_db(&app, |conn| repository::get_window_size(conn, title))
}

#[tauri::command]
pub fn save_cheat_sheet_window_size<R: tauri::Runtime>(
    app: AppHandle<R>,
    title: &str,
    window_size: Option<WindowSize>,
) -> Result<(), String> {
    let window_size = window_size.map(|ws| {
        let (min_width, min_height) = window_size_defaults_from_config(&app);
        ws.clamp_to_min(min_width, min_height)
    });

    let found = with_db(&app, |conn| {
        repository::save_window_size(conn, title, window_size.as_ref())
    })?;

    if !found {
        return Err(format!("Cheat sheet '{}' not found", title));
    }
    Ok(())
}

#[tauri::command]
pub fn import_from_json<R: tauri::Runtime>(
    app: AppHandle<R>,
    json_path: String,
    on_conflict: ConflictResolution,
) -> Result<ImportSummary, String> {
    use std::fs::File;
    use std::io::BufReader;

    let file = File::open(&json_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let reader = BufReader::new(file);
    let sheets: Vec<CheatSheet> =
        serde_json::from_reader(reader).map_err(|e| format!("JSON parse error: {}", e))?;

    let mut added = 0;
    let mut updated = 0;
    let mut skipped = 0;

    with_db(&app, |conn| {
        let tx = conn.unchecked_transaction()?;

        let max_order = repository::get_max_sort_order(&tx)?;

        for (i, sheet) in sheets.iter().enumerate() {
            let exists = repository::title_exists(&tx, &sheet.title)?;
            if exists {
                match on_conflict {
                    ConflictResolution::Overwrite => {
                        repository::update_cheatsheet(&tx, sheet)?;
                        updated += 1;
                    }
                    ConflictResolution::Skip => {
                        skipped += 1;
                    }
                }
            } else {
                let sort_order = max_order + 1 + i as i64;
                let cheatsheet_id = repository::insert_cheatsheet(&tx, sheet, sort_order)?;
                repository::insert_commandlist(&tx, cheatsheet_id, &sheet.commandlist)?;
                added += 1;
            }
        }

        tx.commit()?;
        Ok(())
    })?;

    log::info!(
        "[cheatsheet] import_from_json: added={}, updated={}, skipped={}",
        added,
        updated,
        skipped
    );

    let _ = app.emit_to(EventTarget::app(), common::event::RELOAD_CHEAT_SHEET, ());

    Ok(ImportSummary {
        added,
        updated,
        skipped,
    })
}

pub fn scan_import_conflicts<R: tauri::Runtime>(
    app: &AppHandle<R>,
    json_path: &str,
) -> Result<Vec<String>, String> {
    use std::fs::File;
    use std::io::BufReader;

    let file = File::open(json_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let reader = BufReader::new(file);
    let sheets: Vec<CheatSheet> =
        serde_json::from_reader(reader).map_err(|e| format!("JSON parse error: {}", e))?;

    with_db(app, |conn| {
        let mut conflicts = Vec::new();
        for sheet in &sheets {
            if repository::title_exists(conn, &sheet.title)? {
                conflicts.push(sheet.title.clone());
            }
        }
        Ok(conflicts)
    })
}

const DEFAULT_SEARCH_LIMIT: u32 = 100;

#[tauri::command]
pub fn search_commands<R: tauri::Runtime>(
    app: AppHandle<R>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<CommandSearchResult>, String> {
    let limit = limit.unwrap_or(DEFAULT_SEARCH_LIMIT);
    with_db(&app, |conn| {
        repository::search_commands(conn, &query, limit)
    })
    .map(|rows| rows.into_iter().map(CommandSearchResult::from).collect())
}

#[tauri::command]
pub fn export_to_json<R: tauri::Runtime>(
    app: AppHandle<R>,
    json_path: String,
    titles: Vec<String>,
) -> Result<(), String> {
    if titles.is_empty() {
        return Err("No items selected for export".to_string());
    }

    let sheets = with_db(&app, |conn| {
        let mut result = Vec::new();
        for title in &titles {
            if let Some(sheet) = repository::get_cheatsheet_by_title(conn, title)? {
                result.push(sheet);
            }
        }
        Ok(result)
    })?;

    let json = serde_json::to_string_pretty(&sheets)
        .map_err(|e| format!("JSON serialization error: {}", e))?;
    std::fs::write(&json_path, format!("{}\n", json))
        .map_err(|e| format!("File write error: {}", e))?;

    log::info!(
        "[cheatsheet] export_to_json: exported {} cheatsheets to {}",
        sheets.len(),
        json_path
    );

    Ok(())
}
