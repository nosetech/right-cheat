use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_store::JsonValue;

use crate::common;
use crate::settings_store::{SettingsStore, TauriSettingsStore};

const CLIPBOARD_SETTINGS_KEY: &str = "clipboard_settings";

pub const DEFAULT_MONITORING_ENABLED: bool = true;
pub const DEFAULT_MIN_CHARS: u32 = 2;
pub const DEFAULT_MAX_CHARS: u32 = 200;
pub const DEFAULT_MAX_ITEMS: u32 = 100;
pub const DEFAULT_CLEAR_ON_QUIT: bool = false;
pub const DEFAULT_HEAT_BAR_COLOR: &str = "orange";

pub const MIN_CHARS_LOWER_BOUND: u32 = 2;
pub const CHARS_UPPER_BOUND: u32 = 1000;
pub const MAX_ITEMS_LOWER_BOUND: u32 = 10;
pub const MAX_ITEMS_UPPER_BOUND: u32 = 1000;

/// Heat bar color の許容値（issue #195）。7色 + None（表示オフ）。
pub const HEAT_BAR_COLORS: [&str; 8] = [
    "red", "orange", "amber", "green", "teal", "blue", "purple", "none",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ClipboardSettings {
    pub monitoring_enabled: bool,
    pub min_chars: u32,
    pub max_chars: u32,
    pub max_items: u32,
    pub clear_on_quit: bool,
    pub heat_bar_color: String,
}

impl Default for ClipboardSettings {
    fn default() -> Self {
        Self {
            monitoring_enabled: DEFAULT_MONITORING_ENABLED,
            min_chars: DEFAULT_MIN_CHARS,
            max_chars: DEFAULT_MAX_CHARS,
            max_items: DEFAULT_MAX_ITEMS,
            clear_on_quit: DEFAULT_CLEAR_ON_QUIT,
            heat_bar_color: DEFAULT_HEAT_BAR_COLOR.to_string(),
        }
    }
}

impl ClipboardSettings {
    /// 各値を有効範囲にクランプする。max_chars の下限は常に
    /// max(MIN_CHARS_LOWER_BOUND, min_chars) とする（issue #180 の整合性ルール）。
    /// heat_bar_color は許容値（HEAT_BAR_COLORS）以外であればデフォルトに補正する。
    pub fn normalized(&self) -> Self {
        let min_chars = self
            .min_chars
            .clamp(MIN_CHARS_LOWER_BOUND, CHARS_UPPER_BOUND);
        let max_chars = self.max_chars.clamp(min_chars, CHARS_UPPER_BOUND);
        let max_items = self
            .max_items
            .clamp(MAX_ITEMS_LOWER_BOUND, MAX_ITEMS_UPPER_BOUND);
        let heat_bar_color = if HEAT_BAR_COLORS.contains(&self.heat_bar_color.as_str()) {
            self.heat_bar_color.clone()
        } else {
            DEFAULT_HEAT_BAR_COLOR.to_string()
        };
        Self {
            monitoring_enabled: self.monitoring_enabled,
            min_chars,
            max_chars,
            max_items,
            clear_on_quit: self.clear_on_quit,
            heat_bar_color,
        }
    }
}

#[tauri::command]
pub fn get_clipboard_settings<R: Runtime>(app: AppHandle<R>) -> Result<ClipboardSettings, String> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(&app, CLIPBOARD_SETTINGS_KEY) {
        Ok(Some(json)) => {
            let settings: ClipboardSettings =
                serde_json::from_value(json).map_err(|e| e.to_string())?;
            Ok(settings.normalized())
        }
        Ok(None) => Ok(ClipboardSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn set_clipboard_settings<R: Runtime>(
    app: AppHandle<R>,
    settings: ClipboardSettings,
) -> Result<(), String> {
    let settings = settings.normalized();
    let settings_store = TauriSettingsStore;
    let json: JsonValue = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    settings_store
        .set_setting(&app, CLIPBOARD_SETTINGS_KEY, json)
        .map_err(|e| e.to_string())?;

    // ClipboardMonitor（issue #178）が設定変更を即時反映できるよう通知する
    app.emit(common::event::CLIPBOARD_SETTINGS_CHANGED, settings)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn init_clipboard_settings<R: Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    let settings_store = TauriSettingsStore;
    match settings_store.get_setting(app, CLIPBOARD_SETTINGS_KEY) {
        Ok(Some(_)) => {
            log::info!("[clipboard_settings] Clipboard settings already exist");
        }
        Ok(None) => {
            let default_settings = ClipboardSettings::default();
            settings_store.set_setting(
                app,
                CLIPBOARD_SETTINGS_KEY,
                serde_json::to_value(&default_settings)?,
            )?;
            log::info!(
                "[clipboard_settings] Default clipboard settings initialized: {:?}",
                default_settings
            );
        }
        Err(e) => {
            log::error!(
                "[clipboard_settings] Error checking clipboard settings: {:?}",
                e
            );
            return Err(Box::new(e));
        }
    }
    Ok(())
}

/// アプリ終了時に呼び出し、Clear history on quit が ON ならクリップボード履歴を全削除する。
pub fn clear_history_on_quit_if_enabled<R: Runtime>(app: &AppHandle<R>) {
    use tauri::Manager;

    let settings = match get_clipboard_settings(app.clone()) {
        Ok(s) => s,
        Err(e) => {
            log::error!(
                "[clipboard_settings] Failed to get clipboard settings on quit: {}",
                e
            );
            return;
        }
    };
    if !settings.clear_on_quit {
        return;
    }

    let db = app.state::<crate::db::DbConnection>();
    let conn = match db.0.lock() {
        Ok(conn) => conn,
        Err(e) => {
            log::error!(
                "[clipboard_settings] Failed to lock DB connection on quit: {}",
                e
            );
            return;
        }
    };
    match crate::db::repository::clear_clipboard_history(&conn) {
        Ok(()) => {
            log::info!("[clipboard_settings] Clipboard history cleared on quit");
        }
        Err(e) => {
            log::error!(
                "[clipboard_settings] Failed to clear clipboard history on quit: {}",
                e
            );
        }
    }
}
