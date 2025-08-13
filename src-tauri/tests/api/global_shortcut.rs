#[cfg(test)]
mod get_toggle_visible_shortcut_settings {
    use app_lib::api::global_shortcut::{
        get_toggle_visible_shortcut_settings, init_toggle_visible_shortcut_settings,
    };
    use app_lib::settings_store::{clear_settings, initialize_settings};
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-settings.json";

    #[test]
    fn get_notinitialized() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        initialize_settings(TEST_SETTING_FILENAME);
        clear_settings(&app.handle().clone()).unwrap();

        let result = get_toggle_visible_shortcut_settings(app.handle().clone());
        assert_eq!(result, "{\"status\": \"fail\", \"message\": \"No settings found for toggle visible shortcut.\"}");
    }

    #[test]
    fn get_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        initialize_settings(TEST_SETTING_FILENAME);
        clear_settings(&app.handle().clone()).unwrap();

        init_toggle_visible_shortcut_settings(&app.handle().clone()).unwrap();

        let result = get_toggle_visible_shortcut_settings(app.handle().clone());
        assert_eq!(result, "{\"status\": \"success\", \"message\": {\"command\":true,\"ctrl\":true,\"hotkey\":\"R\",\"option\":false}}");
    }

    // TODO:
    // settings_store::get_settingがErrorを返す場合の動作をテストする。get_settingをモックにする。
    // #[test]
    // fn get_error() {
    //     let app = mock_app();
    //     let _ = app
    //         .handle()
    //         .plugin(tauri_plugin_store::Builder::new().build());
    //     initialize_settings("");
    //
    //     let result = get_toggle_visible_shortcut_settings(app.handle().clone());
    //     assert_eq!(result, "{\"status\": \"fail\", \"message\": \"No settings found for toggle visible shortcut.\"}");
    // }
}

#[cfg(test)]
mod set_toggle_visible_shortcut_settings {
    use app_lib::{
        api::global_shortcut::{
            get_toggle_visible_shortcut_settings, set_toggle_visible_shortcut_settings, ShortcutDef,
        },
        settings_store::{clear_settings, initialize_settings},
    };
    use tauri::test::mock_app;

    pub const TEST_SETTING_FILENAME: &str = "unittest-settings.json";

    #[test]
    fn set_shortcut() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        initialize_settings(TEST_SETTING_FILENAME);
        clear_settings(&app.handle().clone()).unwrap();

        let shortcut = ShortcutDef::new(false, true, false, String::from("C"));

        let result = set_toggle_visible_shortcut_settings(app.handle().clone(), shortcut);
        assert_eq!(result, "{\"status\": \"success\", \"message\": {\"command\":false,\"ctrl\":false,\"hotkey\":\"C\",\"option\":true}}");

        let result = get_toggle_visible_shortcut_settings(app.handle().clone());
        assert_eq!(result, "{\"status\": \"success\", \"message\": {\"command\":false,\"ctrl\":false,\"hotkey\":\"C\",\"option\":true}}");
    }

    // TODO:
    // settings_store::set_settingがErrorを返す場合の動作をテストする。set_settingをモックにする。
    // #[test]
    // fn set_shortcut() {
    // }
}
