// ============================================================
// テスト対象: src-tauri/src/api/log_settings.rs
//
// ブラックボックステスト戦略:
//   同値分割:
//     - 設定が存在しない → デフォルト値クラス
//     - 設定が存在する   → 保存値クラス
//     - output_dir: None / Some(String)
//     - max_file_size: 境界値 1024 (最小想定) / 1_048_576 (デフォルト) / 104_857_600 (最大想定)
//     - rotation_count: 境界値 1 (最小) / 3 (デフォルト) / 20 (最大)
//
//   境界値分析:
//     - max_file_size の最小・デフォルト・最大を検証
//     - rotation_count の最小・デフォルト・最大を検証
//
// ホワイトボックステスト戦略:
//   get_log_settings の分岐:
//     - Ok(None)  → LogSettings::default() を返す
//     - Ok(Some)  → serde_json::from_value でデシリアライズして返す
//   init_log_settings の分岐:
//     - Ok(Some(_)) → 既存設定を保持してスキップ
//     - Ok(None)    → デフォルト設定を書き込む
//   LogSettings のシリアライズ/デシリアライズのラウンドトリップ
// ============================================================

// ------------------------------------------------------------
// get_log_settings のテスト
// ------------------------------------------------------------
#[cfg(test)]
mod get_log_settings {
    use app_lib::api::log_settings::{get_log_settings, set_log_settings, LogSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 設定が存在しない場合のデフォルト値取得テスト
    /// 同値クラス: 設定が存在しない（ストレージ空）
    /// ホワイトボックス: Ok(None) → LogSettings::default() を返すパス
    /// 期待値: output_dir=None, max_file_size=1_048_576, rotation_count=3
    #[test]
    fn get_default_when_no_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-get-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();

        // デフォルト値を検証
        assert_eq!(result.output_dir, None);
        assert_eq!(result.max_file_size, 1_048_576);
        assert_eq!(result.rotation_count, 3);
    }

    /// output_dir=Some、カスタム値の既存設定取得テスト
    /// 同値クラス: 設定が存在、output_dir=Some(カスタムパス)
    /// ホワイトボックス: Ok(Some(json)) → serde_json::from_value で返すパス
    /// 期待値: 保存されたカスタム値がそのまま返される
    #[test]
    fn get_existing_settings_with_custom_output_dir() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-get-custom-dir.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // カスタム値を事前に保存
        let custom_settings = LogSettings {
            output_dir: Some("/custom/log/path".to_string()),
            max_file_size: 2_097_152, // 2MB
            rotation_count: 5,
        };
        set_log_settings(app.handle().clone(), custom_settings).unwrap();

        // 取得を検証
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, Some("/custom/log/path".to_string()));
        assert_eq!(result.max_file_size, 2_097_152);
        assert_eq!(result.rotation_count, 5);
    }

    /// output_dir=None の既存設定取得テスト
    /// 同値クラス: 設定が存在、output_dir=None（明示的に None を保存した場合）
    /// 期待値: output_dir=None が正しく取得できる
    #[test]
    fn get_existing_settings_with_output_dir_none() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-get-dir-none.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // output_dir=None で明示的に保存
        let settings = LogSettings {
            output_dir: None,
            max_file_size: 1_048_576,
            rotation_count: 3,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        // None が正しく取得できることを検証
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
    }
}

// ------------------------------------------------------------
// set_log_settings のテスト
// ------------------------------------------------------------
#[cfg(test)]
mod set_log_settings {
    use app_lib::api::log_settings::{get_log_settings, set_log_settings, LogSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// デフォルト値の保存テスト
    /// 同値クラス: output_dir=None, max_file_size=デフォルト, rotation_count=デフォルト
    /// 期待値: デフォルト値が正しく永続化される
    #[test]
    fn set_default_values() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let settings = LogSettings::default();
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
        assert_eq!(result.max_file_size, 1_048_576);
        assert_eq!(result.rotation_count, 3);
    }

    /// output_dir=Some("custom/path") の保存テスト
    /// 同値クラス: output_dir=Some(有効なパス文字列)
    /// 期待値: カスタムパスが正しく永続化される
    #[test]
    fn set_with_custom_output_dir() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-custom-dir.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let settings = LogSettings {
            output_dir: Some("custom/log/path".to_string()),
            max_file_size: 1_048_576,
            rotation_count: 3,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, Some("custom/log/path".to_string()));
    }

    /// output_dir=None の保存テスト（None が正しく保存・取得できること）
    /// 同値クラス: output_dir=None
    /// 期待値: None が保存後も None として取得できる
    #[test]
    fn set_with_output_dir_none() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-dir-none.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let settings = LogSettings {
            output_dir: None,
            max_file_size: 1_048_576,
            rotation_count: 3,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
    }

    /// max_file_size の境界値テスト: 最小値 1024 バイト
    /// 境界値分析: max_file_size の下限境界
    /// 期待値: 1024 バイトが正しく保存・取得できる
    #[test]
    fn set_max_file_size_min_boundary() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-size-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 境界値: 最小 1024 バイト（1KB）
        let settings = LogSettings {
            output_dir: None,
            max_file_size: 1_024,
            rotation_count: 3,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.max_file_size, 1_024);
    }

    /// max_file_size の境界値テスト: 最大値 104857600 バイト（100MB）
    /// 境界値分析: max_file_size の上限境界
    /// 期待値: 104_857_600 バイトが正しく保存・取得できる
    #[test]
    fn set_max_file_size_max_boundary() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-size-max.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 境界値: 最大 104_857_600 バイト（100MB）
        let settings = LogSettings {
            output_dir: None,
            max_file_size: 104_857_600,
            rotation_count: 3,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.max_file_size, 104_857_600);
    }

    /// rotation_count の境界値テスト: 最小値 1
    /// 境界値分析: rotation_count の下限境界
    /// 期待値: 1 が正しく保存・取得できる
    #[test]
    fn set_rotation_count_min_boundary() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-rotation-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 境界値: rotation_count 最小 = 1
        let settings = LogSettings {
            output_dir: None,
            max_file_size: 1_048_576,
            rotation_count: 1,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.rotation_count, 1);
    }

    /// rotation_count の境界値テスト: 最大値 20
    /// 境界値分析: rotation_count の上限境界
    /// 期待値: 20 が正しく保存・取得できる
    #[test]
    fn set_rotation_count_max_boundary() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-rotation-max.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 境界値: rotation_count 最大 = 20
        let settings = LogSettings {
            output_dir: None,
            max_file_size: 1_048_576,
            rotation_count: 20,
        };
        set_log_settings(app.handle().clone(), settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.rotation_count, 20);
    }

    /// 設定の上書きテスト（カスタム値 → 別のカスタム値）
    /// 同値クラス: 既存設定を新しい値で上書き
    /// 期待値: 最後に保存した値が正しく取得できる
    #[test]
    fn overwrite_existing_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-set-overwrite.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 最初の設定を保存
        let first_settings = LogSettings {
            output_dir: Some("/first/path".to_string()),
            max_file_size: 2_097_152,
            rotation_count: 5,
        };
        set_log_settings(app.handle().clone(), first_settings).unwrap();

        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, Some("/first/path".to_string()));
        assert_eq!(result.max_file_size, 2_097_152);
        assert_eq!(result.rotation_count, 5);

        // 上書きする設定を保存
        let second_settings = LogSettings {
            output_dir: None,
            max_file_size: 1_048_576,
            rotation_count: 3,
        };
        set_log_settings(app.handle().clone(), second_settings).unwrap();

        // 最後に保存した値が返されることを検証
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
        assert_eq!(result.max_file_size, 1_048_576);
        assert_eq!(result.rotation_count, 3);
    }
}

// ------------------------------------------------------------
// init_log_settings のテスト
// ------------------------------------------------------------
#[cfg(test)]
mod init_log_settings {
    use app_lib::api::log_settings::{
        get_log_settings, init_log_settings, set_log_settings, LogSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 設定が存在しない場合の初期化テスト
    /// 同値クラス: 設定が存在しない
    /// ホワイトボックス: Ok(None) → デフォルト設定書き込みパス
    /// 期待値: デフォルト設定（output_dir=None, max_file_size=1_048_576, rotation_count=3）が作成される
    #[test]
    fn init_when_settings_do_not_exist() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-init-new.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 設定を初期化
        init_log_settings(&app.handle()).unwrap();

        // デフォルト設定が作成されたことを検証
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
        assert_eq!(result.max_file_size, 1_048_576);
        assert_eq!(result.rotation_count, 3);
    }

    /// カスタム設定が存在する場合の初期化テスト（output_dir=Some）
    /// 同値クラス: 設定が存在する（output_dir=Some）
    /// ホワイトボックス: Ok(Some(_)) → スキップパス
    /// 期待値: 既存設定が保持される（上書きされない）
    #[test]
    fn init_does_not_overwrite_existing_settings_with_custom_dir() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-init-existing-dir.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // カスタム設定を事前に保存
        let custom_settings = LogSettings {
            output_dir: Some("/pre/existing/path".to_string()),
            max_file_size: 5_242_880, // 5MB
            rotation_count: 10,
        };
        set_log_settings(app.handle().clone(), custom_settings).unwrap();

        // 初期化（上書きされないはず）
        init_log_settings(&app.handle()).unwrap();

        // 設定が変わっていないことを検証
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, Some("/pre/existing/path".to_string()));
        assert_eq!(result.max_file_size, 5_242_880);
        assert_eq!(result.rotation_count, 10);
    }

    /// デフォルト相当の既存設定がある場合の初期化テスト（output_dir=None）
    /// 同値クラス: 設定が存在する（output_dir=None）
    /// 期待値: 既存設定が保持される（上書きされない）
    #[test]
    fn init_does_not_overwrite_existing_settings_with_none_dir() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-init-existing-none.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // output_dir=None のまま、非デフォルト値を持つ設定を事前に保存
        let pre_settings = LogSettings {
            output_dir: None,
            max_file_size: 2_097_152, // デフォルト(1MB)とは異なる2MB
            rotation_count: 7,
        };
        set_log_settings(app.handle().clone(), pre_settings).unwrap();

        // 初期化（上書きされないはず）
        init_log_settings(&app.handle()).unwrap();

        // 設定が変わっていないことを検証
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
        assert_eq!(result.max_file_size, 2_097_152);
        assert_eq!(result.rotation_count, 7);
    }

    /// 複数回初期化しても冪等性が保たれるテスト
    /// 期待値: 初回初期化後に設定を変更し、再度初期化しても既存設定が保持される
    #[test]
    fn init_is_idempotent_multiple_times() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-log-init-idempotent.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 1回目の初期化: デフォルト設定が作成される
        init_log_settings(&app.handle()).unwrap();
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, None);
        assert_eq!(result.max_file_size, 1_048_576);
        assert_eq!(result.rotation_count, 3);

        // 設定をカスタム値に変更
        let custom_settings = LogSettings {
            output_dir: Some("/changed/path".to_string()),
            max_file_size: 10_485_760, // 10MB
            rotation_count: 5,
        };
        set_log_settings(app.handle().clone(), custom_settings).unwrap();

        // 2回目の初期化（カスタム値が上書きされないはず）
        init_log_settings(&app.handle()).unwrap();
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, Some("/changed/path".to_string()));
        assert_eq!(result.max_file_size, 10_485_760);
        assert_eq!(result.rotation_count, 5);

        // 3回目の初期化（やはり上書きされないはず）
        init_log_settings(&app.handle()).unwrap();
        let result = get_log_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_dir, Some("/changed/path".to_string()));
        assert_eq!(result.max_file_size, 10_485_760);
        assert_eq!(result.rotation_count, 5);
    }
}

// ------------------------------------------------------------
// LogSettings シリアライズ/デシリアライズのテスト
// ------------------------------------------------------------
#[cfg(test)]
mod log_settings_serde {
    use app_lib::api::log_settings::LogSettings;

    /// デフォルト値のシリアライズ → デシリアライズのラウンドトリップテスト
    /// 同値クラス: output_dir=None のデフォルト値
    /// 期待値: シリアライズ後にデシリアライズしても値が一致する
    #[test]
    fn round_trip_default_values() {
        let original = LogSettings::default();

        // JSON にシリアライズ
        let json = serde_json::to_value(&original).unwrap();

        // JSON からデシリアライズ
        let deserialized: LogSettings = serde_json::from_value(json).unwrap();

        assert_eq!(deserialized.output_dir, None);
        assert_eq!(deserialized.max_file_size, 1_048_576);
        assert_eq!(deserialized.rotation_count, 3);
    }

    /// output_dir=Some のシリアライズ → デシリアライズのラウンドトリップテスト
    /// 同値クラス: output_dir=Some(パス文字列)
    /// 期待値: シリアライズ後にデシリアライズしても値が一致する
    #[test]
    fn round_trip_with_output_dir_some() {
        let original = LogSettings {
            output_dir: Some("/path/to/logs".to_string()),
            max_file_size: 2_097_152,
            rotation_count: 5,
        };

        // JSON にシリアライズ
        let json = serde_json::to_value(&original).unwrap();

        // JSON からデシリアライズ
        let deserialized: LogSettings = serde_json::from_value(json).unwrap();

        assert_eq!(deserialized.output_dir, Some("/path/to/logs".to_string()));
        assert_eq!(deserialized.max_file_size, 2_097_152);
        assert_eq!(deserialized.rotation_count, 5);
    }

    /// 日本語パスを含む output_dir のラウンドトリップテスト
    /// 同値クラス: output_dir=Some(マルチバイト文字を含むパス)
    /// 期待値: 日本語を含むパスも正しくシリアライズ/デシリアライズできる
    #[test]
    fn round_trip_with_japanese_path() {
        let original = LogSettings {
            output_dir: Some("/Users/ユーザー/ログ".to_string()),
            max_file_size: 1_048_576,
            rotation_count: 3,
        };

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: LogSettings = serde_json::from_value(json).unwrap();

        assert_eq!(
            deserialized.output_dir,
            Some("/Users/ユーザー/ログ".to_string())
        );
    }

    /// 境界値を持つ設定のラウンドトリップテスト
    /// 境界値分析: max_file_size=1024(最小), rotation_count=1(最小)
    /// 期待値: 境界値もシリアライズ/デシリアライズで正確に保持される
    #[test]
    fn round_trip_with_min_boundary_values() {
        let original = LogSettings {
            output_dir: None,
            max_file_size: 1_024, // 1KB（最小想定）
            rotation_count: 1,    // 最小
        };

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: LogSettings = serde_json::from_value(json).unwrap();

        assert_eq!(deserialized.max_file_size, 1_024);
        assert_eq!(deserialized.rotation_count, 1);
    }

    /// 境界値を持つ設定のラウンドトリップテスト
    /// 境界値分析: max_file_size=104857600(100MB最大), rotation_count=20(最大)
    /// 期待値: 境界値もシリアライズ/デシリアライズで正確に保持される
    #[test]
    fn round_trip_with_max_boundary_values() {
        let original = LogSettings {
            output_dir: None,
            max_file_size: 104_857_600, // 100MB（最大想定）
            rotation_count: 20,         // 最大
        };

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: LogSettings = serde_json::from_value(json).unwrap();

        assert_eq!(deserialized.max_file_size, 104_857_600);
        assert_eq!(deserialized.rotation_count, 20);
    }

    /// JSON フィールド名の検証テスト
    /// ホワイトボックス: serde の derive が正しいフィールド名で出力することを確認
    /// 期待値: "output_dir", "max_file_size", "rotation_count" のキーが存在する
    #[test]
    fn serialized_json_has_correct_field_names() {
        let settings = LogSettings {
            output_dir: Some("/test".to_string()),
            max_file_size: 1_048_576,
            rotation_count: 3,
        };

        let json = serde_json::to_value(&settings).unwrap();

        // フィールド名の存在確認
        assert!(json.get("output_dir").is_some());
        assert!(json.get("max_file_size").is_some());
        assert!(json.get("rotation_count").is_some());

        // フィールド値の型・値確認
        assert_eq!(json["output_dir"], "/test");
        assert_eq!(json["max_file_size"], 1_048_576_u64);
        assert_eq!(json["rotation_count"], 3_u32);
    }
}
