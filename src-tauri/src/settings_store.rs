use serde::{Deserialize, Serialize};
use tauri_plugin_store::{Error, JsonValue, StoreExt};

use crate::common;

#[derive(Debug, Serialize, Deserialize)]
pub struct ToggleVisibleShortcut {
    ctrl: bool,
    option: bool,
    shift: bool,
    command: bool,
    hotkey: String,
}

pub fn get_setting<R: tauri::Runtime>(
    app: &tauri::App<R>,
    key: impl AsRef<str>,
) -> Result<Option<JsonValue>, Error> {
    let store = app.store(common::config::SETTING_FILENAME)?;
    let value = store.get(key);
    Ok(value)
}

pub fn set_setting<R: tauri::Runtime>(
    app: &tauri::App<R>,
    key: impl Into<String>,
    value: impl Into<JsonValue>,
) -> Result<(), Error> {
    let store = app.store(common::config::SETTING_FILENAME)?;
    store.set(key, value);
    Ok(())
}

// TODO: toggle_visible_shortcut設定のgetter,setterを実装
