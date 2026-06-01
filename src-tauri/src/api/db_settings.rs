use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::JsonValue;

use crate::common;
use crate::settings_store::{SettingsStore, TauriSettingsStore};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbSettings {
    pub output_path: Option<String>,
}

impl Default for DbSettings {
    fn default() -> Self {
        Self { output_path: None }
    }
}

/// lib.rs の setup() より前（Tauri store 初期化前）に設定ファイルを直接読み込む。
/// log_settings::read_log_settings_from_file() と同じパターン。
pub fn read_db_settings_from_file() -> DbSettings {
    let Some(data_dir) = dirs::data_dir() else {
        return DbSettings::default();
    };
    let settings_path = data_dir
        .join(common::bundle::identifier())
        .join(common::config::SETTING_FILENAME);

    let Ok(content) = std::fs::read_to_string(&settings_path) else {
        return DbSettings::default();
    };

    let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) else {
        return DbSettings::default();
    };

    let Some(db_json) = json.get(common::config::DB_SETTINGS) else {
        return DbSettings::default();
    };

    serde_json::from_value(db_json.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn get_db_settings<R: Runtime>(app: AppHandle<R>) -> Result<DbSettings, String> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(&app, common::config::DB_SETTINGS) {
        Ok(Some(json)) => serde_json::from_value(json).map_err(|e| e.to_string()),
        Ok(None) => Ok(DbSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_db_settings<R: Runtime>(app: AppHandle<R>, settings: DbSettings) -> Result<(), String> {
    if let Some(ref path_str) = settings.output_path {
        let path = PathBuf::from(path_str);
        let parent = path
            .parent()
            .ok_or_else(|| "Invalid path: no parent directory".to_string())?;
        if !parent.exists() {
            return Err(format!("Directory does not exist: {}", parent.display()));
        }
        // 書き込み権限チェック: 一時ファイルを作成して確認
        let temp_path = parent.join(".rightcheat_write_test");
        std::fs::write(&temp_path, b"").map_err(|e| format!("Directory is not writable: {}", e))?;
        let _ = std::fs::remove_file(&temp_path);
    }

    let settings_store = TauriSettingsStore;
    let json: JsonValue = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    settings_store
        .set_setting(&app, common::config::DB_SETTINGS, json)
        .map_err(|e| e.to_string())?;
    log::info!(
        "[db_settings] Saved: output_path={:?}",
        settings.output_path
    );
    Ok(())
}

#[tauri::command]
pub fn get_db_path<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let path = get_effective_db_path(&app)?;
    Ok(path.to_string_lossy().to_string())
}

pub fn get_effective_db_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let settings_store = TauriSettingsStore;
    let settings = match settings_store.get_setting(app, common::config::DB_SETTINGS) {
        Ok(Some(json)) => serde_json::from_value(json).unwrap_or_else(|e| {
            log::warn!(
                "[db_settings] Failed to deserialize db settings, using default: {}",
                e
            );
            DbSettings::default()
        }),
        _ => DbSettings::default(),
    };
    match settings.output_path {
        Some(path) => Ok(PathBuf::from(path)),
        None => app
            .path()
            .app_data_dir()
            .map(|d| d.join("cheatsheet.db"))
            .map_err(|e: tauri::Error| e.to_string()),
    }
}

pub fn init_db_settings<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(app, common::config::DB_SETTINGS) {
        Ok(Some(_)) => {
            log::info!("[db_settings] DB settings already exist");
        }
        Ok(None) => {
            let default_settings = DbSettings::default();
            settings_store.set_setting(
                app,
                common::config::DB_SETTINGS,
                serde_json::to_value(&default_settings)?,
            )?;
            log::info!("[db_settings] Default DB settings initialized");
        }
        Err(e) => {
            log::error!("[db_settings] Error checking DB settings: {:?}", e);
            return Err(Box::new(e));
        }
    }
    Ok(())
}
