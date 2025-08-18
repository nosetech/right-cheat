#[cfg(test)]
mod get_toggle_visible_shortcut_settings {
    use app_lib::api::global_shortcut::{
        get_toggle_visible_shortcut_settings, init_toggle_visible_shortcut_settings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-settings.json";

    #[test]
    fn get_notinitialized() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store.clear_settings(&app.handle().clone()).unwrap();

        let result = get_toggle_visible_shortcut_settings(app.handle().clone());
        assert_eq!(result, "{\"status\": \"fail\", \"message\": \"No settings found for toggle visible shortcut.\"}");
    }

    #[test]
    fn get_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store.clear_settings(&app.handle().clone()).unwrap();

        init_toggle_visible_shortcut_settings(&app.handle().clone()).unwrap();

        let result = get_toggle_visible_shortcut_settings(app.handle().clone());
        assert_eq!(result, "{\"status\": \"success\", \"message\": {\"command\":true,\"ctrl\":true,\"hotkey\":\"R\",\"option\":false}}");
    }

    // モック用のSettings Store実装
    struct MockErrorSettingsStore;
    
    impl app_lib::settings_store::SettingsStore for MockErrorSettingsStore {
        fn initialize_settings(&self, _filename: &str) {}
        
        fn clear_settings<R: tauri::Runtime>(
            &self, 
            _app: &tauri::AppHandle<R>
        ) -> Result<(), tauri_plugin_store::Error> {
            Ok(())
        }
        
        fn get_setting<R: tauri::Runtime>(
            &self,
            _app: &tauri::AppHandle<R>,
            _key: impl AsRef<str>,
        ) -> Result<Option<tauri_plugin_store::JsonValue>, tauri_plugin_store::Error> {
            Err(tauri_plugin_store::Error::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Mock error"
            )))
        }
        
        fn set_setting<R: tauri::Runtime>(
            &self,
            _app: &tauri::AppHandle<R>,
            _key: impl Into<String>,
            _value: impl Into<tauri_plugin_store::JsonValue>,
        ) -> Result<(), tauri_plugin_store::Error> {
            Ok(())
        }
    }

    #[test]
    fn get_error() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        
        let mock_store = MockErrorSettingsStore;
        let result = app_lib::api::global_shortcut::get_toggle_visible_shortcut_settings_with_store(
            &app.handle().clone(),
            &mock_store,
        );
        
        // Error時は"fail"ステータスが返されることを確認
        assert!(result.contains("\"status\": \"fail\""));
        assert!(result.contains("Mock error"));
    }
}

#[cfg(test)]
mod set_toggle_visible_shortcut_settings {
    use app_lib::{
        api::global_shortcut::{
            get_toggle_visible_shortcut_settings, set_toggle_visible_shortcut_settings, ShortcutDef,
        },
        settings_store::{SettingsStore, TauriSettingsStore},
    };
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-settings.json";

    #[test]
    fn set_shortcut() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store.clear_settings(&app.handle().clone()).unwrap();

        let shortcut = ShortcutDef::new(false, true, false, String::from("C"));

        let result = set_toggle_visible_shortcut_settings(app.handle().clone(), shortcut);
        assert_eq!(result, "{\"status\": \"success\", \"message\": {\"command\":false,\"ctrl\":false,\"hotkey\":\"C\",\"option\":true}}");

        let result = get_toggle_visible_shortcut_settings(app.handle().clone());
        assert_eq!(result, "{\"status\": \"success\", \"message\": {\"command\":false,\"ctrl\":false,\"hotkey\":\"C\",\"option\":true}}");
    }

    // モック用のSettings Store実装（set_settingでエラーを返す）
    struct MockSetErrorSettingsStore;
    
    impl app_lib::settings_store::SettingsStore for MockSetErrorSettingsStore {
        fn initialize_settings(&self, _filename: &str) {}
        
        fn clear_settings<R: tauri::Runtime>(
            &self, 
            _app: &tauri::AppHandle<R>
        ) -> Result<(), tauri_plugin_store::Error> {
            Ok(())
        }
        
        fn get_setting<R: tauri::Runtime>(
            &self,
            _app: &tauri::AppHandle<R>,
            _key: impl AsRef<str>,
        ) -> Result<Option<tauri_plugin_store::JsonValue>, tauri_plugin_store::Error> {
            Ok(None)
        }
        
        fn set_setting<R: tauri::Runtime>(
            &self,
            _app: &tauri::AppHandle<R>,
            _key: impl Into<String>,
            _value: impl Into<tauri_plugin_store::JsonValue>,
        ) -> Result<(), tauri_plugin_store::Error> {
            Err(tauri_plugin_store::Error::Io(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "Mock set error"
            )))
        }
    }

    #[test]
    fn set_error() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        
        let shortcut = ShortcutDef::new(false, true, false, String::from("C"));
        let mock_store = MockSetErrorSettingsStore;
        
        let result = app_lib::api::global_shortcut::set_toggle_visible_shortcut_settings_with_store(
            &app.handle().clone(),
            shortcut,
            &mock_store,
        );
        
        // Error時は"fail"ステータスが返されることを確認
        assert!(result.contains("\"status\": \"fail\""));
        assert!(result.contains("Mock set error"));
    }
}
