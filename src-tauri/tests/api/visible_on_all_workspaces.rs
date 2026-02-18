#[cfg(test)]
mod get_visible_on_all_workspaces_setting {
    use app_lib::api::visible_on_all_workspaces::{
        get_visible_on_all_workspaces_setting, set_visible_on_all_workspaces_setting,
        VisibleOnAllWorkspacesSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// Tests retrieving default settings when no settings exist in storage.
    /// Equivalence class: Settings do not exist
    /// Expected: Returns default value (enabled = true)
    #[test]
    fn get_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-get-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// Tests retrieving existing settings with enabled = true.
    /// Equivalence class: Settings exist, enabled = true
    /// Expected: Returns the stored value (enabled = true)
    #[test]
    fn get_existing_enabled_true() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-get-enabled-true.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set enabled = true
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // Verify retrieval
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// Tests retrieving existing settings with enabled = false.
    /// Equivalence class: Settings exist, enabled = false
    /// Expected: Returns the stored value (enabled = false)
    #[test]
    fn get_existing_enabled_false() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-get-enabled-false.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Set enabled = false
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // Verify retrieval
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }
}

#[cfg(test)]
mod set_visible_on_all_workspaces_setting {
    use app_lib::api::visible_on_all_workspaces::{
        get_visible_on_all_workspaces_setting, set_visible_on_all_workspaces_setting,
        VisibleOnAllWorkspacesSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// Tests setting enabled = true.
    /// Equivalence class: enabled = true
    /// Expected: Settings are persisted correctly
    #[test]
    fn set_enabled_true() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-set-enabled-true.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let settings = VisibleOnAllWorkspacesSettings { enabled: true };

        set_visible_on_all_workspaces_setting(app.handle().clone(), settings.clone()).unwrap();

        // Verify persistence
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// Tests setting enabled = false.
    /// Equivalence class: enabled = false
    /// Expected: Settings are persisted correctly
    #[test]
    fn set_enabled_false() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-set-enabled-false.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let settings = VisibleOnAllWorkspacesSettings { enabled: false };

        set_visible_on_all_workspaces_setting(app.handle().clone(), settings.clone()).unwrap();

        // Verify persistence
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }

    /// Tests toggling settings from true to false and back.
    /// Equivalence class: Settings modification
    /// Expected: Each modification is correctly persisted
    #[test]
    fn toggle_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-set-toggle.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Start with default (true)
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);

        // Toggle to false
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);

        // Toggle back to true
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }
}

#[cfg(test)]
mod init_visible_on_all_workspaces_settings {
    use app_lib::api::visible_on_all_workspaces::{
        get_visible_on_all_workspaces_setting, init_visible_on_all_workspaces_settings,
        set_visible_on_all_workspaces_setting, VisibleOnAllWorkspacesSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// Tests initialization when no settings exist.
    /// Equivalence class: Settings do not exist
    /// Expected: Default settings (enabled = true) are created
    #[test]
    fn init_when_settings_do_not_exist() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-init-new.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Initialize settings
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();

        // Verify default settings were created
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// Tests initialization when settings already exist with enabled = true.
    /// Equivalence class: Settings exist, enabled = true
    /// Expected: Existing settings are preserved (not overwritten)
    #[test]
    fn init_when_settings_exist_with_true() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-init-existing-true.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Pre-set settings with enabled = true
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // Initialize (should not overwrite)
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();

        // Verify settings are unchanged
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// Tests initialization when settings already exist with enabled = false.
    /// Equivalence class: Settings exist, enabled = false
    /// Expected: Existing settings are preserved (not overwritten)
    #[test]
    fn init_when_settings_exist_with_false() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-init-existing-false.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // Pre-set settings with enabled = false
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // Initialize (should not overwrite)
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();

        // Verify settings are unchanged (still false, not overwritten to default true)
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }

    /// Tests initialization multiple times.
    /// Expected: Idempotent behavior - multiple initializations don't corrupt settings
    #[test]
    fn init_multiple_times() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-visible-init-multiple.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // First initialization
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);

        // Change settings
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // Second initialization (should not overwrite)
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);

        // Third initialization (should still not overwrite)
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }
}
