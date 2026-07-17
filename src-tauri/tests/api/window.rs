#[cfg(test)]
mod get_clipboard_history_window_size {
    use app_lib::api::window::get_clipboard_history_window_size;
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-window-settings.json";

    #[test]
    fn get_notinitialized() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 設定キーが存在しない場合は Ok(None) を返す
        let result = get_clipboard_history_window_size(app.handle().clone()).unwrap();
        assert!(result.is_none());
    }
}

#[cfg(test)]
mod save_clipboard_history_window_size {
    use app_lib::api::cheatsheet::WindowSize;
    use app_lib::api::window::{
        get_clipboard_history_window_size, save_clipboard_history_window_size,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-window-settings.json";

    #[test]
    fn save_and_get_roundtrip() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 最小サイズ以上の値はそのまま保存される
        let window_size = WindowSize {
            width: 500,
            height: 700,
        };
        save_clipboard_history_window_size(app.handle().clone(), Some(window_size)).unwrap();

        let result = get_clipboard_history_window_size(app.handle().clone())
            .unwrap()
            .unwrap();
        assert_eq!(result.width, 500);
        assert_eq!(result.height, 700);
    }

    #[test]
    fn save_clamps_below_minimum() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 最小サイズ (320x400) 未満の値はクランプされる
        let window_size = WindowSize {
            width: 100,
            height: 100,
        };
        save_clipboard_history_window_size(app.handle().clone(), Some(window_size)).unwrap();

        let result = get_clipboard_history_window_size(app.handle().clone())
            .unwrap()
            .unwrap();
        assert_eq!(result.width, 320);
        assert_eq!(result.height, 400);
    }

    #[test]
    fn save_clamps_width_only() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 幅のみが最小値未満の境界値ケース（高さは最小値ちょうど）
        let window_size = WindowSize {
            width: 319,
            height: 400,
        };
        save_clipboard_history_window_size(app.handle().clone(), Some(window_size)).unwrap();

        let result = get_clipboard_history_window_size(app.handle().clone())
            .unwrap()
            .unwrap();
        assert_eq!(result.width, 320);
        assert_eq!(result.height, 400);
    }

    #[test]
    fn save_at_minimum_boundary_is_not_clamped() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 最小サイズちょうどの値はクランプされずそのまま保存される
        let window_size = WindowSize {
            width: 320,
            height: 400,
        };
        save_clipboard_history_window_size(app.handle().clone(), Some(window_size)).unwrap();

        let result = get_clipboard_history_window_size(app.handle().clone())
            .unwrap()
            .unwrap();
        assert_eq!(result.width, 320);
        assert_eq!(result.height, 400);
    }

    #[test]
    fn save_none_unpins_after_value_saved() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // まず値を保存してからピン解除(None)することで null 保存の挙動を確認
        let window_size = WindowSize {
            width: 500,
            height: 700,
        };
        save_clipboard_history_window_size(app.handle().clone(), Some(window_size)).unwrap();

        save_clipboard_history_window_size(app.handle().clone(), None).unwrap();

        let result = get_clipboard_history_window_size(app.handle().clone()).unwrap();
        assert!(result.is_none());
    }
}
