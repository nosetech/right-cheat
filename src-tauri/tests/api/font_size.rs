#[cfg(test)]
mod get_font_size_settings {
    use app_lib::api::font_size::get_font_size_settings;
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-font-get-settings.json";

    #[test]
    fn get_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result = get_font_size_settings(app.handle().clone()).unwrap();
        assert_eq!(result.level, 2);
        assert_eq!(result.scale, 1.0);
    }
}

#[cfg(test)]
mod set_font_size_settings {
    use app_lib::api::font_size::{
        get_font_size_settings, set_font_size_settings, FontSizeSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-font-set-settings.json";

    #[test]
    fn set_custom_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(TEST_SETTING_FILENAME);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let custom_settings = FontSizeSettings {
            level: 3,
            scale: 1.1,
        };

        set_font_size_settings(app.handle().clone(), custom_settings.clone()).unwrap();

        // Verify persistence
        let result = get_font_size_settings(app.handle().clone()).unwrap();
        assert_eq!(result.level, 3);
        assert_eq!(result.scale, 1.1);
    }
}

#[cfg(test)]
mod increase_font_size {
    use app_lib::api::font_size::{increase_font_size, set_font_size_settings, FontSizeSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    #[test]
    fn increase_from_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-increase-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Start from default (level 2, scale 1.0)
        let result = increase_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 3);
        assert_eq!(result.scale, 1.1);
    }

    #[test]
    fn increase_at_max_boundary() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-increase-max.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set to max level (4)
        let max_settings = FontSizeSettings {
            level: 4,
            scale: 1.2,
        };
        set_font_size_settings(app.handle().clone(), max_settings).unwrap();

        // Try to increase beyond max
        let result = increase_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 4); // Should stay at max
        assert_eq!(result.scale, 1.2);
    }

    #[test]
    fn increase_multiple_times() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-increase-multiple.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set to level 0
        let min_settings = FontSizeSettings {
            level: 0,
            scale: 0.8,
        };
        set_font_size_settings(app.handle().clone(), min_settings).unwrap();

        // Increase to level 1
        let result = increase_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 1);
        assert_eq!(result.scale, 0.9);

        // Increase to level 2
        let result = increase_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 2);
        assert_eq!(result.scale, 1.0);

        // Increase to level 3
        let result = increase_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 3);
        assert_eq!(result.scale, 1.1);

        // Increase to level 4
        let result = increase_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 4);
        assert_eq!(result.scale, 1.2);
    }
}

#[cfg(test)]
mod decrease_font_size {
    use app_lib::api::font_size::{decrease_font_size, set_font_size_settings, FontSizeSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    #[test]
    fn decrease_from_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-decrease-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Start from default (level 2, scale 1.0)
        let result = decrease_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 1);
        assert_eq!(result.scale, 0.9);
    }

    #[test]
    fn decrease_at_min_boundary() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-decrease-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set to min level (0)
        let min_settings = FontSizeSettings {
            level: 0,
            scale: 0.8,
        };
        set_font_size_settings(app.handle().clone(), min_settings).unwrap();

        // Try to decrease below min
        let result = decrease_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 0); // Should stay at min
        assert_eq!(result.scale, 0.8);
    }

    #[test]
    fn decrease_multiple_times() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-decrease-multiple.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set to level 4
        let max_settings = FontSizeSettings {
            level: 4,
            scale: 1.2,
        };
        set_font_size_settings(app.handle().clone(), max_settings).unwrap();

        // Decrease to level 3
        let result = decrease_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 3);
        assert_eq!(result.scale, 1.1);

        // Decrease to level 2
        let result = decrease_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 2);
        assert_eq!(result.scale, 1.0);

        // Decrease to level 1
        let result = decrease_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 1);
        assert_eq!(result.scale, 0.9);

        // Decrease to level 0
        let result = decrease_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 0);
        assert_eq!(result.scale, 0.8);
    }
}

#[cfg(test)]
mod reset_font_size {
    use app_lib::api::font_size::{reset_font_size, set_font_size_settings, FontSizeSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    #[test]
    fn reset_from_max() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-reset-max.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set to max level (4)
        let max_settings = FontSizeSettings {
            level: 4,
            scale: 1.2,
        };
        set_font_size_settings(app.handle().clone(), max_settings).unwrap();

        // Reset to default
        let result = reset_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 2);
        assert_eq!(result.scale, 1.0);
    }

    #[test]
    fn reset_from_min() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-reset-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set to min level (0)
        let min_settings = FontSizeSettings {
            level: 0,
            scale: 0.8,
        };
        set_font_size_settings(app.handle().clone(), min_settings).unwrap();

        // Reset to default
        let result = reset_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 2);
        assert_eq!(result.scale, 1.0);
    }

    #[test]
    fn reset_when_already_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-font-reset-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Already at default (level 2, scale 1.0)
        let result = reset_font_size(app.handle().clone()).unwrap();
        assert_eq!(result.level, 2);
        assert_eq!(result.scale, 1.0);
    }
}
