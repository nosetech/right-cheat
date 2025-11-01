use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_store::JsonValue;

use crate::common;
use crate::settings_store::{SettingsStore, TauriSettingsStore};

const FONT_SIZE_SETTINGS_KEY: &str = "font_size_settings";
const DEFAULT_FONT_SIZE_LEVEL: i32 = 2;
const DEFAULT_FONT_SIZE_SCALE: f64 = 1.0;
const MIN_FONT_SIZE_LEVEL: i32 = 0;
const MAX_FONT_SIZE_LEVEL: i32 = 4;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontSizeSettings {
    pub level: i32,
    pub scale: f64,
}

impl Default for FontSizeSettings {
    fn default() -> Self {
        Self {
            level: DEFAULT_FONT_SIZE_LEVEL,
            scale: DEFAULT_FONT_SIZE_SCALE,
        }
    }
}

impl FontSizeSettings {
    fn from_level(level: i32) -> Self {
        let scale = match level {
            0 => 0.8,
            1 => 0.9,
            2 => 1.0,
            3 => 1.1,
            4 => 1.2,
            _ => 1.0,
        };
        Self { level, scale }
    }
}

#[tauri::command]
pub fn get_font_size_settings<R: Runtime>(app: AppHandle<R>) -> Result<FontSizeSettings, String> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(&app, FONT_SIZE_SETTINGS_KEY) {
        Ok(Some(json)) => {
            let settings: FontSizeSettings =
                serde_json::from_value(json).map_err(|e| e.to_string())?;
            Ok(settings)
        }
        Ok(None) => Ok(FontSizeSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_font_size_settings<R: Runtime>(
    app: AppHandle<R>,
    settings: FontSizeSettings,
) -> Result<(), String> {
    let settings_store = TauriSettingsStore;
    let json: JsonValue = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    settings_store
        .set_setting(&app, FONT_SIZE_SETTINGS_KEY, json)
        .map_err(|e| e.to_string())?;

    // Emit event to notify frontend of font size change
    app.emit(common::event::FONT_SIZE_CHANGED, settings)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn increase_font_size<R: Runtime>(app: AppHandle<R>) -> Result<FontSizeSettings, String> {
    let current = get_font_size_settings(app.clone())?;
    let new_level = (current.level + 1).min(MAX_FONT_SIZE_LEVEL);
    let new_settings = FontSizeSettings::from_level(new_level);
    set_font_size_settings(app, new_settings.clone())?;
    Ok(new_settings)
}

#[tauri::command]
pub fn decrease_font_size<R: Runtime>(app: AppHandle<R>) -> Result<FontSizeSettings, String> {
    let current = get_font_size_settings(app.clone())?;
    let new_level = (current.level - 1).max(MIN_FONT_SIZE_LEVEL);
    let new_settings = FontSizeSettings::from_level(new_level);
    set_font_size_settings(app, new_settings.clone())?;
    Ok(new_settings)
}

#[tauri::command]
pub fn reset_font_size<R: Runtime>(app: AppHandle<R>) -> Result<FontSizeSettings, String> {
    let new_settings = FontSizeSettings::default();
    set_font_size_settings(app, new_settings.clone())?;
    Ok(new_settings)
}
