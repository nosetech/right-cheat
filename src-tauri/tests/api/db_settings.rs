// ============================================================
// テスト対象: src-tauri/src/api/db_settings.rs
//
// ブラックボックステスト戦略:
//   同値分割:
//     - 設定が存在しない → デフォルト値クラス（output_path=None）
//     - 設定が存在する   → 保存値クラス（output_path=Some(String)）
//     - output_path: None / Some(有効パス) / Some(存在しないディレクトリ) /
//                   Some(親ディレクトリなしパス)
//
//   境界値分析:
//     - output_path=None（デフォルト）と Some(空でないパス) の境界
//     - 書き込み権限チェック: 存在するディレクトリ（/tmp）と
//       存在しないディレクトリ（/nonexistent/path）の境界
//
// ホワイトボックステスト戦略:
//   get_db_settings の分岐:
//     - Ok(None)  → DbSettings::default() を返す
//     - Ok(Some)  → serde_json::from_value でデシリアライズして返す
//   set_db_settings の分岐:
//     - output_path=None → 書き込み権限チェックをスキップして保存
//     - output_path=Some, 親ディレクトリなし → "Invalid path" エラー
//     - output_path=Some, ディレクトリ不存在 → "Directory does not exist" エラー
//     - output_path=Some, 書き込み成功 → 設定を保存
//   init_db_settings の分岐:
//     - Ok(Some(_)) → 既存設定を保持してスキップ
//     - Ok(None)    → デフォルト設定を書き込む
//   DbSettings のシリアライズ/デシリアライズのラウンドトリップ
// ============================================================

// ------------------------------------------------------------
// get_db_settings のテスト
// ------------------------------------------------------------
#[cfg(test)]
mod get_db_settings {
    use app_lib::api::db_settings::{get_db_settings, set_db_settings, DbSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 設定が存在しない場合のデフォルト値取得テスト
    /// 同値クラス: 設定が存在しない（ストレージ空）
    /// ホワイトボックス: Ok(None) → DbSettings::default() を返すパス
    /// 期待値: output_path=None
    #[test]
    fn get_default_when_no_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-get-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result = get_db_settings(app.handle().clone()).unwrap();

        // デフォルト値: output_path=None
        assert_eq!(result.output_path, None);
    }

    /// output_path=Some のカスタム値を持つ既存設定の取得テスト
    /// 同値クラス: 設定が存在する（output_path=Some(パス)）
    /// ホワイトボックス: Ok(Some(json)) → serde_json::from_value で返すパス
    /// 期待値: 保存されたカスタムパスがそのまま返される
    #[test]
    fn get_existing_settings_with_custom_output_path() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-get-custom-path.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // カスタム値を事前に保存（/tmp は macOS で常に存在）
        let custom_settings = DbSettings {
            output_path: Some("/tmp/cheatsheet.db".to_string()),
        };
        set_db_settings(app.handle().clone(), custom_settings).unwrap();

        // 取得を検証
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, Some("/tmp/cheatsheet.db".to_string()));
    }

    /// output_path=None の既存設定取得テスト
    /// 同値クラス: 設定が存在、output_path=None（明示的に None を保存した場合）
    /// 期待値: output_path=None が正しく取得できる
    #[test]
    fn get_existing_settings_with_output_path_none() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-get-path-none.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // output_path=None で明示的に保存
        let settings = DbSettings { output_path: None };
        set_db_settings(app.handle().clone(), settings).unwrap();

        // None が正しく取得できることを検証
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, None);
    }
}

// ------------------------------------------------------------
// set_db_settings のテスト
// ------------------------------------------------------------
#[cfg(test)]
mod set_db_settings {
    use app_lib::api::db_settings::{get_db_settings, set_db_settings, DbSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// output_path=None（デフォルト）の保存テスト
    /// 同値クラス: output_path=None（書き込み権限チェックをスキップするパス）
    /// ホワイトボックス: if let Some(ref path_str) = settings.output_path の else パス
    /// 期待値: 書き込み権限チェックなしで設定が正常保存される
    #[test]
    fn set_with_output_path_none() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-set-none.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let settings = DbSettings { output_path: None };
        let result = set_db_settings(app.handle().clone(), settings);
        assert!(result.is_ok());

        // 保存された値を確認
        let fetched = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(fetched.output_path, None);
    }

    /// 存在するディレクトリへの output_path 保存テスト
    /// 同値クラス: output_path=Some(存在・書き込み可能なディレクトリ内のパス)
    /// ホワイトボックス: parent.exists() = true かつ write テスト成功パス
    /// 期待値: 設定が正常に保存される（/tmp は macOS で常に存在・書き込み可能）
    #[test]
    fn set_with_valid_output_path() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-set-valid-path.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // /tmp は macOS で常に存在・書き込み可能
        let settings = DbSettings {
            output_path: Some("/tmp/rightcheat_test.db".to_string()),
        };
        let result = set_db_settings(app.handle().clone(), settings);
        assert!(result.is_ok());

        // 保存された値を確認
        let fetched = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(
            fetched.output_path,
            Some("/tmp/rightcheat_test.db".to_string())
        );
    }

    /// 存在しないディレクトリを指定した場合のエラーテスト
    /// 同値クラス: output_path=Some(存在しないディレクトリ内のパス)
    /// ホワイトボックス: !parent.exists() → "Directory does not exist" エラーパス
    /// 期待値: "Directory does not exist" を含むエラーが返される
    #[test]
    fn set_with_nonexistent_directory_returns_error() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-set-nonexistent-dir.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 存在しないディレクトリ内のパスを指定
        let settings = DbSettings {
            output_path: Some("/nonexistent/path/cheatsheet.db".to_string()),
        };
        let result = set_db_settings(app.handle().clone(), settings);

        assert!(result.is_err());
        let err_msg = result.unwrap_err();
        assert!(
            err_msg.contains("Directory does not exist"),
            "エラーメッセージが期待と異なる: {err_msg}"
        );
    }

    /// 親ディレクトリが存在しない絶対パス（ルートに直接ファイル）のエラーテスト
    /// 同値クラス: output_path=Some(親ディレクトリが取得できないパス)
    /// 境界値分析: path.parent() が "/" を返すケース
    /// 注: "/cheatsheet.db" の parent は "/" であり、存在するが書き込み不可
    /// 期待値: エラーが返される（"Directory is not writable" または "Directory does not exist"）
    #[test]
    fn set_with_root_level_file_returns_error() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-set-root-level.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // ルートディレクトリ直下への書き込みは macOS では権限エラーになる
        let settings = DbSettings {
            output_path: Some("/cheatsheet.db".to_string()),
        };
        let result = set_db_settings(app.handle().clone(), settings);

        // macOS ではルートへの書き込みは拒否されるのでエラーになる
        assert!(result.is_err());
    }

    /// 設定の上書きテスト（None → Some → None）
    /// 同値クラス: 既存設定を新しい値で上書き
    /// 期待値: 最後に保存した値が正しく取得できる
    #[test]
    fn overwrite_existing_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-set-overwrite.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 最初: None で保存
        let first = DbSettings { output_path: None };
        set_db_settings(app.handle().clone(), first).unwrap();
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, None);

        // 次: Some で上書き
        let second = DbSettings {
            output_path: Some("/tmp/rightcheat_overwrite.db".to_string()),
        };
        set_db_settings(app.handle().clone(), second).unwrap();
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(
            result.output_path,
            Some("/tmp/rightcheat_overwrite.db".to_string())
        );

        // 最後: None に戻す
        let third = DbSettings { output_path: None };
        set_db_settings(app.handle().clone(), third).unwrap();
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, None);
    }
}

// ------------------------------------------------------------
// init_db_settings のテスト
// ------------------------------------------------------------
#[cfg(test)]
mod init_db_settings {
    use app_lib::api::db_settings::{
        get_db_settings, init_db_settings, set_db_settings, DbSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 設定が存在しない場合の初期化テスト
    /// 同値クラス: 設定が存在しない
    /// ホワイトボックス: Ok(None) → デフォルト設定書き込みパス
    /// 期待値: デフォルト設定（output_path=None）が作成される
    #[test]
    fn init_when_settings_do_not_exist() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-init-new.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 設定を初期化
        init_db_settings(&app.handle()).unwrap();

        // デフォルト設定が作成されたことを検証
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, None);
    }

    /// カスタム output_path を持つ既存設定がある場合の初期化テスト
    /// 同値クラス: 設定が存在する（output_path=Some）
    /// ホワイトボックス: Ok(Some(_)) → スキップパス
    /// 期待値: 既存設定が保持される（上書きされない）
    #[test]
    fn init_does_not_overwrite_existing_settings_with_custom_path() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-init-existing-path.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // カスタム設定を事前に保存（/tmp は macOS で常に存在）
        let custom_settings = DbSettings {
            output_path: Some("/tmp/pre_existing.db".to_string()),
        };
        set_db_settings(app.handle().clone(), custom_settings).unwrap();

        // 初期化（上書きされないはず）
        init_db_settings(&app.handle()).unwrap();

        // 設定が変わっていないことを検証
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, Some("/tmp/pre_existing.db".to_string()));
    }

    /// output_path=None の既存設定がある場合の初期化テスト
    /// 同値クラス: 設定が存在する（output_path=None）
    /// ホワイトボックス: Ok(Some(_)) → スキップパス
    /// 期待値: 既存設定が保持される（再書き込みされない）
    #[test]
    fn init_does_not_overwrite_existing_settings_with_none_path() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-init-existing-none.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // output_path=None を事前に保存（設定済みの状態）
        let pre_settings = DbSettings { output_path: None };
        set_db_settings(app.handle().clone(), pre_settings).unwrap();

        // 初期化（再書き込みされないはず）
        init_db_settings(&app.handle()).unwrap();

        // 設定が変わっていないことを検証
        let result = get_db_settings(app.handle().clone()).unwrap();
        assert_eq!(result.output_path, None);
    }

    /// 2回連続で初期化しても冪等性が保たれるテスト
    /// 期待値: 1回目の初期化でデフォルト設定が作成され、2回目の初期化でも変わらない
    ///
    /// 注意: SETTINGS_FILENAME はグローバル Mutex であり並列テスト実行時に競合するため、
    /// init_db_settings 以外の操作（値の読み書き）は set_setting / get_setting を
    /// 直接呼び出して SETTINGS_FILENAME 競合の影響を排除する。
    /// init_db_settings の呼び出しは連続して行い、間に他の SETTINGS_FILENAME 参照を入れない。
    #[test]
    fn init_twice_does_not_overwrite_first_init() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-db-init-twice.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 1回目と2回目の初期化を連続で実行（間に SETTINGS_FILENAME 競合が入らない）
        init_db_settings(&app.handle()).unwrap();
        init_db_settings(&app.handle()).unwrap();

        // 2回初期化後もデフォルト値が保持されていることを検証
        let raw = settings_store
            .get_setting(&app.handle().clone(), app_lib::common::config::DB_SETTINGS)
            .unwrap();
        let result: DbSettings = serde_json::from_value(raw.unwrap()).unwrap();
        assert_eq!(result.output_path, None);
    }
}

// ------------------------------------------------------------
// DbSettings シリアライズ/デシリアライズのテスト
// ------------------------------------------------------------
#[cfg(test)]
mod db_settings_serde {
    use app_lib::api::db_settings::DbSettings;

    /// デフォルト値のシリアライズ → デシリアライズのラウンドトリップテスト
    /// 同値クラス: output_path=None のデフォルト値
    /// 期待値: シリアライズ後にデシリアライズしても値が一致する
    #[test]
    fn round_trip_default_values() {
        let original = DbSettings::default();

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: DbSettings = serde_json::from_value(json).unwrap();

        assert_eq!(deserialized.output_path, None);
    }

    /// output_path=Some のシリアライズ → デシリアライズのラウンドトリップテスト
    /// 同値クラス: output_path=Some(パス文字列)
    /// 期待値: シリアライズ後にデシリアライズしても値が一致する
    #[test]
    fn round_trip_with_output_path_some() {
        let original = DbSettings {
            output_path: Some("/path/to/cheatsheet.db".to_string()),
        };

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: DbSettings = serde_json::from_value(json).unwrap();

        assert_eq!(
            deserialized.output_path,
            Some("/path/to/cheatsheet.db".to_string())
        );
    }

    /// 日本語パスを含む output_path のラウンドトリップテスト
    /// 同値クラス: output_path=Some(マルチバイト文字を含むパス)
    /// 期待値: 日本語を含むパスも正しくシリアライズ/デシリアライズできる
    #[test]
    fn round_trip_with_japanese_path() {
        let original = DbSettings {
            output_path: Some("/Users/ユーザー/データ/cheatsheet.db".to_string()),
        };

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: DbSettings = serde_json::from_value(json).unwrap();

        assert_eq!(
            deserialized.output_path,
            Some("/Users/ユーザー/データ/cheatsheet.db".to_string())
        );
    }

    /// 境界値: 空文字列の output_path のラウンドトリップテスト
    /// 境界値分析: Some("") — パス文字列の最小境界（空文字列）
    /// 期待値: 空文字列も正しくシリアライズ/デシリアライズできる
    #[test]
    fn round_trip_with_empty_string_output_path() {
        let original = DbSettings {
            output_path: Some(String::new()),
        };

        let json = serde_json::to_value(&original).unwrap();
        let deserialized: DbSettings = serde_json::from_value(json).unwrap();

        assert_eq!(deserialized.output_path, Some(String::new()));
    }

    /// JSON フィールド名の検証テスト
    /// ホワイトボックス: serde の derive が正しいフィールド名で出力することを確認
    /// 期待値: "output_path" キーが存在し、値が正しい
    #[test]
    fn serialized_json_has_correct_field_names() {
        let settings = DbSettings {
            output_path: Some("/test/cheatsheet.db".to_string()),
        };

        let json = serde_json::to_value(&settings).unwrap();

        // フィールド名の存在確認
        assert!(json.get("output_path").is_some());

        // フィールド値の確認
        assert_eq!(json["output_path"], "/test/cheatsheet.db");
    }

    /// output_path=None のとき JSON に null が入ることを確認するテスト
    /// ホワイトボックス: Option::None → JSON null のシリアライズ動作確認
    /// 期待値: output_path フィールドが null として出力される
    #[test]
    fn serialized_json_output_path_none_is_null() {
        let settings = DbSettings { output_path: None };

        let json = serde_json::to_value(&settings).unwrap();

        // output_path フィールドが存在し、null であることを確認
        assert!(json.get("output_path").is_some());
        assert!(json["output_path"].is_null());
    }

    /// Clone trait の動作確認テスト
    /// ホワイトボックス: #[derive(Clone)] が正しく動作することを確認
    /// 期待値: クローン後の値が元の値と等しい
    #[test]
    fn clone_preserves_values() {
        let original = DbSettings {
            output_path: Some("/tmp/clone_test.db".to_string()),
        };

        let cloned = original.clone();

        assert_eq!(cloned.output_path, original.output_path);
    }

    /// Debug trait の動作確認テスト
    /// ホワイトボックス: #[derive(Debug)] が正しく動作することを確認
    /// 期待値: Debug 出力がパニックしない
    #[test]
    fn debug_format_does_not_panic() {
        let settings = DbSettings {
            output_path: Some("/tmp/debug_test.db".to_string()),
        };

        // Debug フォーマットがパニックしないことを確認
        let debug_str = format!("{:?}", settings);
        assert!(debug_str.contains("DbSettings"));
    }
}
