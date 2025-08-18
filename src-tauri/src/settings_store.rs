use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri_plugin_store::{Error, JsonValue, StoreExt};

use crate::common;

static SETTINGS_FILENAME: Lazy<Mutex<String>> =
    Lazy::new(|| Mutex::new(common::config::SETTING_FILENAME.to_string()));

pub trait SettingsStore {
    fn initialize_settings(&self, filename: &str);
    fn clear_settings<R: tauri::Runtime>(&self, app: &tauri::AppHandle<R>) -> Result<(), Error>;
    fn get_setting<R: tauri::Runtime>(
        &self,
        app: &tauri::AppHandle<R>,
        key: impl AsRef<str>,
    ) -> Result<Option<JsonValue>, Error>;
    fn set_setting<R: tauri::Runtime>(
        &self,
        app: &tauri::AppHandle<R>,
        key: impl Into<String>,
        value: impl Into<JsonValue>,
    ) -> Result<(), Error>;
}

pub struct TauriSettingsStore;

impl SettingsStore for TauriSettingsStore {
    fn initialize_settings(&self, filename: &str) {
        let mut settings_filename = SETTINGS_FILENAME.lock().unwrap();
        *settings_filename = filename.to_string();
    }

    fn clear_settings<R: tauri::Runtime>(&self, app: &tauri::AppHandle<R>) -> Result<(), Error> {
        let filename = SETTINGS_FILENAME.lock().unwrap();
        let store = app.store(&*filename)?;
        store.clear();
        store.save()?;
        Ok(())
    }

    fn get_setting<R: tauri::Runtime>(
        &self,
        app: &tauri::AppHandle<R>,
        key: impl AsRef<str>,
    ) -> Result<Option<JsonValue>, Error> {
        let filename = SETTINGS_FILENAME.lock().unwrap();
        let store = app.store(&*filename)?;
        let value = store.get(key);
        Ok(value)
    }

    fn set_setting<R: tauri::Runtime>(
        &self,
        app: &tauri::AppHandle<R>,
        key: impl Into<String>,
        value: impl Into<JsonValue>,
    ) -> Result<(), Error> {
        let filename = SETTINGS_FILENAME.lock().unwrap();
        let store = app.store(&*filename)?;
        store.set(key, value);
        Ok(())
    }
}

