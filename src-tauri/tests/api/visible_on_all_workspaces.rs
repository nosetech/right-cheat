#[cfg(test)]
mod get_visible_on_all_workspaces_setting {
    use app_lib::api::visible_on_all_workspaces::{
        get_visible_on_all_workspaces_setting, set_visible_on_all_workspaces_setting,
        VisibleOnAllWorkspacesSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// ストレージに設定が存在しない場合のデフォルト設定取得テスト
    /// 同値クラス: 設定が存在しない
    /// 期待値: デフォルト値（enabled = false）を返す
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
        assert_eq!(result.enabled, false);
    }

    /// enabled = true の既存設定取得テスト
    /// 同値クラス: 設定が存在、enabled = true
    /// 期待値: 保存されている値（enabled = true）を返す
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

        // enabled = true を設定
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // 取得を検証
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// enabled = false の既存設定取得テスト
    /// 同値クラス: 設定が存在、enabled = false
    /// 期待値: 保存されている値（enabled = false）を返す
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

        // enabled = false を設定
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // 取得を検証
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

    /// enabled = true の設定保存テスト
    /// 同値クラス: enabled = true
    /// 期待値: 設定が正しく永続化される
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

        // 永続化を検証
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// enabled = false の設定保存テスト
    /// 同値クラス: enabled = false
    /// 期待値: 設定が正しく永続化される
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

        // 永続化を検証
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }

    /// 設定の切り替え（true ↔ false）テスト
    /// 同値クラス: 設定の変更
    /// 期待値: 各変更が正しく永続化される
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

        // デフォルト値（false）から開始
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);

        // true に切り替え
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);

        // false に戻す
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
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

    /// 設定が存在しない場合の初期化テスト
    /// 同値クラス: 設定が存在しない
    /// 期待値: デフォルト設定（enabled = false）が作成される
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

        // 設定を初期化
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();

        // デフォルト設定が作成されたことを検証
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }

    /// enabled = true の既存設定がある場合の初期化テスト
    /// 同値クラス: 設定が存在、enabled = true
    /// 期待値: 既存設定が保持される（上書きされない）
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

        // enabled = true で事前に設定
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // 初期化（上書きされないはず）
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();

        // 設定が変わっていないことを検証
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }

    /// enabled = false の既存設定がある場合の初期化テスト
    /// 同値クラス: 設定が存在、enabled = false
    /// 期待値: 既存設定が保持される（上書きされない）
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

        // enabled = false で事前に設定
        let settings = VisibleOnAllWorkspacesSettings { enabled: false };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // 初期化（上書きされないはず）
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();

        // 設定が変わっていないことを検証（false のまま、デフォルト true に上書きされない）
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);
    }

    /// 複数回初期化テスト
    /// 期待値: 冪等性 - 複数回の初期化が設定を破損しない
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

        // 最初の初期化
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, false);

        // 設定を変更
        let settings = VisibleOnAllWorkspacesSettings { enabled: true };
        set_visible_on_all_workspaces_setting(app.handle().clone(), settings).unwrap();

        // 2回目の初期化（上書きされないはず）
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);

        // 3回目の初期化（やはり上書きされないはず）
        init_visible_on_all_workspaces_settings(&app.handle()).unwrap();
        let result = get_visible_on_all_workspaces_setting(app.handle().clone()).unwrap();
        assert_eq!(result.enabled, true);
    }
}
