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
    pub truncated: bool,
    pub original_char_count: Option<i64>,
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
            truncated: row.truncated,
            original_char_count: row.original_char_count,
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

/// Clipboard History ウィンドウ内で既存のエントリを再コピーした際に呼び出す。
/// 再コピーは自前マーカー（[`crate::api::clipboard::SELF_COPY_TYPE`]）付きで
/// NSPasteboard に書き込まれ `clipboard_monitor` に検知されないため、
/// このコマンドで明示的に `copy_count` のインクリメントと `copied_at` の更新
/// （`insert_clipboard_history` の既存テキスト分岐と同じ move-to-top 更新）を記録する。
#[tauri::command]
pub fn record_clipboard_history_recopy<R: Runtime>(
    app: AppHandle<R>,
    text: String,
) -> Result<(), String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    repository::insert_clipboard_history(&conn, &text, None).map_err(|e| e.to_string())?;
    log::debug!(
        "[clipboard_history] record_clipboard_history_recopy: {} char(s)",
        text.chars().count()
    );
    Ok(())
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
