use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::JsonValue;

use crate::settings_store::{SettingsStore, TauriSettingsStore};

const VISIBLE_ON_ALL_WORKSPACES_SETTINGS_KEY: &str = "visible_on_all_workspaces_settings";
const DEFAULT_VISIBLE_ON_ALL_WORKSPACES: bool = true;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisibleOnAllWorkspacesSettings {
    pub enabled: bool,
}

impl Default for VisibleOnAllWorkspacesSettings {
    fn default() -> Self {
        Self {
            enabled: DEFAULT_VISIBLE_ON_ALL_WORKSPACES,
        }
    }
}

#[tauri::command]
pub fn get_visible_on_all_workspaces_setting<R: Runtime>(
    app: AppHandle<R>,
) -> Result<VisibleOnAllWorkspacesSettings, String> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(&app, VISIBLE_ON_ALL_WORKSPACES_SETTINGS_KEY) {
        Ok(Some(json)) => {
            let settings: VisibleOnAllWorkspacesSettings =
                serde_json::from_value(json).map_err(|e| e.to_string())?;
            Ok(settings)
        }
        Ok(None) => Ok(VisibleOnAllWorkspacesSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_visible_on_all_workspaces_setting<R: Runtime>(
    app: AppHandle<R>,
    settings: VisibleOnAllWorkspacesSettings,
) -> Result<(), String> {
    let settings_store = TauriSettingsStore;
    let json: JsonValue = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    settings_store
        .set_setting(&app, VISIBLE_ON_ALL_WORKSPACES_SETTINGS_KEY, json)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn init_visible_on_all_workspaces_settings<R: Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(app, VISIBLE_ON_ALL_WORKSPACES_SETTINGS_KEY) {
        Ok(Some(_)) => {
            log::info!("Visible on all workspaces setting already exists");
        }
        Ok(None) => {
            let default_settings = VisibleOnAllWorkspacesSettings::default();
            settings_store.set_setting(
                app,
                VISIBLE_ON_ALL_WORKSPACES_SETTINGS_KEY,
                serde_json::to_value(&default_settings)?,
            )?;
            log::info!(
                "Default visible on all workspaces setting initialized: {}",
                default_settings.enabled
            );
        }
        Err(e) => {
            log::error!("Error checking visible on all workspaces setting: {:?}", e);
            return Err(Box::new(e));
        }
    }
    Ok(())
}
