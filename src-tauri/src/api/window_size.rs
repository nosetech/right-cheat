use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::JsonValue;

use crate::common;
use crate::settings_store::{SettingsStore, TauriSettingsStore};

const DEFAULT_WINDOW_WIDTH: u32 = 500;
const DEFAULT_WINDOW_HEIGHT: u32 = 800;
const MIN_WINDOW_WIDTH: u32 = 400;
const MIN_WINDOW_HEIGHT: u32 = 300;

fn window_size_key(title: &str) -> String {
    format!(
        "{}_{}",
        common::config::CHEAT_SHEET_WINDOW_SIZE_KEY_PREFIX,
        title
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSizeSettings {
    pub width: u32,
    pub height: u32,
}

impl Default for WindowSizeSettings {
    fn default() -> Self {
        Self {
            width: DEFAULT_WINDOW_WIDTH,
            height: DEFAULT_WINDOW_HEIGHT,
        }
    }
}

impl WindowSizeSettings {
    pub fn clamp_to_min(self) -> Self {
        Self {
            width: self.width.max(MIN_WINDOW_WIDTH),
            height: self.height.max(MIN_WINDOW_HEIGHT),
        }
    }
}

#[tauri::command]
pub fn get_cheat_sheet_window_size<R: Runtime>(
    app: AppHandle<R>,
    title: String,
) -> Result<WindowSizeSettings, String> {
    let settings_store = TauriSettingsStore;
    let key = window_size_key(&title);
    match settings_store.get_setting(&app, &key) {
        Ok(Some(json)) => {
            let settings: WindowSizeSettings =
                serde_json::from_value(json).map_err(|e| e.to_string())?;
            Ok(settings.clamp_to_min())
        }
        Ok(None) => Ok(WindowSizeSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn save_cheat_sheet_window_size<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let settings = WindowSizeSettings { width, height }.clamp_to_min();
    let settings_store = TauriSettingsStore;
    let key = window_size_key(&title);
    let json: JsonValue = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    settings_store
        .set_setting(&app, key, json)
        .map_err(|e| e.to_string())?;
    Ok(())
}
