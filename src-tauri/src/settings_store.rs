use tauri_plugin_store::{Error, JsonValue, StoreExt};

use crate::common;

pub fn get_setting<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    key: impl AsRef<str>,
) -> Result<Option<JsonValue>, Error> {
    let store = app.store(common::config::SETTING_FILENAME)?;
    let value = store.get(key);
    Ok(value)
}

pub fn set_setting<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    key: impl Into<String>,
    value: impl Into<JsonValue>,
) -> Result<(), Error> {
    let store = app.store(common::config::SETTING_FILENAME)?;
    store.set(key, value);
    Ok(())
}
