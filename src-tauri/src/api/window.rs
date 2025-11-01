use crate::common;
use tauri::{AppHandle, Emitter, EventTarget};

#[tauri::command]
pub fn notify_theme_changed<R: tauri::Runtime>(app: AppHandle<R>) -> String {
    let response;
    match app.emit_to(EventTarget::app(), common::event::THEME_CHANGED, ()) {
        Ok(_) => response = "success",
        Err(_) => response = "fail",
    }

    format!("{{\"status\": \"{}\"}}", response)
}
