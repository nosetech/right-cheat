use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::JsonValue;

use crate::common;
use crate::settings_store::{SettingsStore, TauriSettingsStore};

const LOG_FILE_NAME: &str = "RightCheat.log";
const DEFAULT_MAX_FILE_SIZE: u64 = 1_048_576;
const DEFAULT_ROTATION_COUNT: u32 = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogSettings {
    pub output_dir: Option<String>,
    pub max_file_size: u64,
    pub rotation_count: u32,
}

impl Default for LogSettings {
    fn default() -> Self {
        Self {
            output_dir: None,
            max_file_size: DEFAULT_MAX_FILE_SIZE,
            rotation_count: DEFAULT_ROTATION_COUNT,
        }
    }
}

pub fn read_log_settings_from_file() -> LogSettings {
    let Some(data_dir) = dirs::data_dir() else {
        return LogSettings::default();
    };
    let settings_path = data_dir
        .join(common::bundle::identifier())
        .join(common::config::SETTING_FILENAME);

    let Ok(content) = std::fs::read_to_string(&settings_path) else {
        return LogSettings::default();
    };

    let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) else {
        return LogSettings::default();
    };

    let Some(log_json) = json.get(common::config::LOG_SETTINGS) else {
        return LogSettings::default();
    };

    serde_json::from_value(log_json.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn get_log_settings<R: Runtime>(app: AppHandle<R>) -> Result<LogSettings, String> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(&app, common::config::LOG_SETTINGS) {
        Ok(Some(json)) => serde_json::from_value(json).map_err(|e| e.to_string()),
        Ok(None) => Ok(LogSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_log_settings<R: Runtime>(
    app: AppHandle<R>,
    settings: LogSettings,
) -> Result<(), String> {
    let settings_store = TauriSettingsStore;
    let json: JsonValue = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    settings_store
        .set_setting(&app, common::config::LOG_SETTINGS, json)
        .map_err(|e| e.to_string())?;
    log::info!(
        "[log_settings] Saved: max_file_size={}, rotation_count={}, output_dir={:?}",
        settings.max_file_size,
        settings.rotation_count,
        settings.output_dir
    );
    Ok(())
}

#[tauri::command]
pub fn open_latest_log_file<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let log_dir = get_effective_log_dir(&app)?;
    let log_file = log_dir.join(LOG_FILE_NAME);
    log::debug!("[log_settings] Opening log file: {:?}", log_file);
    let log_file_str = log_file.to_string_lossy().to_string();
    app.opener()
        .open_path(log_file_str, None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_log_dir<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let dir = get_effective_log_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

fn get_effective_log_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let settings_store = TauriSettingsStore;
    let settings = match settings_store.get_setting(app, common::config::LOG_SETTINGS) {
        Ok(Some(json)) => serde_json::from_value(json).unwrap_or_else(|e| {
            log::warn!(
                "[log_settings] Failed to deserialize log settings, using default: {}",
                e
            );
            LogSettings::default()
        }),
        _ => LogSettings::default(),
    };
    match settings.output_dir {
        Some(dir) => Ok(PathBuf::from(dir)),
        None => app
            .path()
            .app_log_dir()
            .map_err(|e: tauri::Error| e.to_string()),
    }
}

pub fn init_log_settings<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(app, common::config::LOG_SETTINGS) {
        Ok(Some(_)) => {
            log::info!("[log_settings] Log settings already exist");
        }
        Ok(None) => {
            let default_settings = LogSettings::default();
            settings_store.set_setting(
                app,
                common::config::LOG_SETTINGS,
                serde_json::to_value(&default_settings)?,
            )?;
            log::info!("[log_settings] Default log settings initialized");
        }
        Err(e) => {
            log::error!("[log_settings] Error checking log settings: {:?}", e);
            return Err(Box::new(e));
        }
    }
    Ok(())
}
