use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};

use crate::db::{repository, DbConnection};

/// フロントエンドに返すクリップボード履歴1件分。
#[derive(Debug, Clone, Serialize)]
pub struct ClipboardHistoryItem {
    pub id: i64,
    pub text: String,
    pub char_count: i64,
    pub copied_at: String,
    pub copy_count: i64,
    pub first_copied_at: String,
}

impl From<repository::ClipboardHistoryRow> for ClipboardHistoryItem {
    fn from(row: repository::ClipboardHistoryRow) -> Self {
        Self {
            id: row.id,
            text: row.text,
            char_count: row.char_count,
            copied_at: row.copied_at,
            copy_count: row.copy_count,
            first_copied_at: row.first_copied_at,
        }
    }
}

/// クリップボード履歴を新しい順に取得する。
#[tauri::command]
pub fn list_clipboard_history<R: Runtime>(
    app: AppHandle<R>,
    limit: u32,
) -> Result<Vec<ClipboardHistoryItem>, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let rows = repository::list_clipboard_history(&conn, limit).map_err(|e| e.to_string())?;
    log::debug!(
        "[clipboard_history] list_clipboard_history: {} item(s) (limit={})",
        rows.len(),
        limit
    );
    Ok(rows.into_iter().map(ClipboardHistoryItem::from).collect())
}

/// クリップボード履歴を1件削除する。
#[tauri::command]
pub fn delete_clipboard_history_item<R: Runtime>(app: AppHandle<R>, id: i64) -> Result<(), String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    repository::delete_clipboard_history(&conn, id).map_err(|e| e.to_string())?;
    log::debug!("[clipboard_history] delete_clipboard_history_item: id={id}");
    Ok(())
}

/// クリップボード履歴を全削除する。
#[tauri::command]
pub fn clear_clipboard_history<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    repository::clear_clipboard_history(&conn).map_err(|e| e.to_string())?;
    log::info!("[clipboard_history] clear_clipboard_history: all items deleted");
    Ok(())
}
