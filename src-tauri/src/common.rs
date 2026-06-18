pub mod config {
    pub const SETTING_FILENAME: &str = "rightcheat-settings.json";
    pub const TOGGLE_VISIBLE_SHORTCUT: &str = "toggle_visibe_shortcut_settings";
    pub const LOG_SETTINGS: &str = "log_settings";
    pub const DB_SETTINGS: &str = "db_settings";
}

pub mod bundle {
    const TAURI_CONF: &str = include_str!("../tauri.conf.json");

    pub fn identifier() -> String {
        let v: serde_json::Value = serde_json::from_str(TAURI_CONF).unwrap_or_default();
        v["identifier"]
            .as_str()
            .unwrap_or("biz.nosetech.rightcheat")
            .to_string()
    }
}

pub mod event {
    pub const WINDOW_VISIABLE_TOGGLE: &str = "window_visible_toggle";
    pub const RELOAD_CHEAT_SHEET: &str = "reload_cheat_sheet";
    pub const THEME_CHANGED: &str = "theme_changed";
    pub const FONT_SIZE_CHANGED: &str = "font_size_changed";
    pub const WINDOW_FOCUSED: &str = "window_focused";
    pub const OPEN_CHEAT_SHEET: &str = "open_cheat_sheet";
}
