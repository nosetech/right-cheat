use crate::api::cheatsheet::WindowSize;
use crate::common;
use crate::settings_store::{SettingsStore, TauriSettingsStore};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, EventTarget};

/// Clipboard History ウィンドウの最小サイズ（論理ピクセル）。
/// ウィンドウ生成時の `min_inner_size` と一致させる。
const CLIPBOARD_HISTORY_MIN_WIDTH: u32 = 320;
const CLIPBOARD_HISTORY_MIN_HEIGHT: u32 = 400;

#[tauri::command]
pub fn notify_theme_changed<R: tauri::Runtime>(app: AppHandle<R>) -> String {
    let response;
    match app.emit_to(EventTarget::app(), common::event::THEME_CHANGED, ()) {
        Ok(_) => response = "success",
        Err(_) => response = "fail",
    }

    format!("{{\"status\": \"{}\"}}", response)
}

/// Clipboard History ウィンドウのピン留めサイズを設定ファイルから取得する。
/// 未設定（キーなし・null）の場合は `None` を返す。
#[tauri::command]
pub fn get_clipboard_history_window_size<R: tauri::Runtime>(
    app: AppHandle<R>,
) -> Result<Option<WindowSize>, String> {
    let settings_store = TauriSettingsStore;
    let value = settings_store
        .get_setting(&app, common::config::CLIPBOARD_HISTORY_WINDOW_SIZE)
        .map_err(|e| e.to_string())?;

    match value {
        None | Some(Value::Null) => Ok(None),
        Some(v) => serde_json::from_value::<WindowSize>(v)
            .map(Some)
            .map_err(|e| e.to_string()),
    }
}

/// Clipboard History ウィンドウのピン留めサイズを設定ファイルに保存する。
/// `None` を渡すとピン留めを解除する（null を保存する）。
#[tauri::command]
pub fn save_clipboard_history_window_size<R: tauri::Runtime>(
    app: AppHandle<R>,
    window_size: Option<WindowSize>,
) -> Result<(), String> {
    let settings_store = TauriSettingsStore;
    let value = match window_size {
        Some(ws) => {
            let clamped =
                ws.clamp_to_min(CLIPBOARD_HISTORY_MIN_WIDTH, CLIPBOARD_HISTORY_MIN_HEIGHT);
            json!(clamped)
        }
        None => Value::Null,
    };

    settings_store
        .set_setting(&app, common::config::CLIPBOARD_HISTORY_WINDOW_SIZE, value)
        .map_err(|e| e.to_string())
}
