// window_size.rs のユニットテスト
//
// テスト戦略:
// - ブラックボックステスト: 同値分割・境界値分析
// - ホワイトボックステスト: get_cheat_sheet_window_size の全コードパス
//   (Ok(None) パス, Ok(Some(json)) パス, clamp_to_min の各分岐)
//
// 定数値:
//   DEFAULT_WINDOW_WIDTH  = 500
//   DEFAULT_WINDOW_HEIGHT = 800
//   MIN_WINDOW_WIDTH      = 400
//   MIN_WINDOW_HEIGHT     = 300

// ─────────────────────────────────────────────────────────────────────────────
// get_cheat_sheet_window_size のテスト
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod get_cheat_sheet_window_size {
    use app_lib::api::window_size::{get_cheat_sheet_window_size, save_cheat_sheet_window_size};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    // ─── 同値クラス: 設定が存在しない ─────────────────────────────────────────

    /// ホワイトボックス: Ok(None) パス
    /// ストレージに設定が存在しない場合はデフォルト値を返す
    /// 同値クラス: 設定なし
    /// 期待値: width = 500 (DEFAULT), height = 800 (DEFAULT)
    #[test]
    fn get_default_when_no_settings_exist() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-get-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 500);
        assert_eq!(result.height, 800);
    }

    // ─── 同値クラス: 正常な設定値（最小値より大きい値）─────────────────────

    /// ホワイトボックス: Ok(Some(json)) パス、clamp_to_min で変化なし
    /// 最小値より大きい正常な設定値を保存後に取得できる
    /// 同値クラス: width > 400, height > 300
    /// 期待値: 保存した値がそのまま返る
    #[test]
    fn get_saved_normal_values() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-get-normal.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 600, 900)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 600);
        assert_eq!(result.height, 900);
    }

    // ─── 同値クラス: 最小値未満の保存値 → クランプされて返る ─────────────────

    /// ホワイトボックス: clamp_to_min で width・height 両方クランプ
    /// 最小値未満の値を保存した場合、取得時に最小値へクランプされる
    /// 同値クラス: width < 400 かつ height < 300
    /// 期待値: width = 400 (MIN), height = 300 (MIN)
    #[test]
    fn get_clamps_below_min_values() {
        use app_lib::api::window_size::WindowSizeSettings;

        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-get-below-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 最小値未満の値を直接ストアに書き込む（save 経由では save 時に clamp されるため）
        let raw_settings = WindowSizeSettings {
            width: 100,
            height: 100,
        };
        let json = serde_json::to_value(&raw_settings).unwrap();
        settings_store
            .set_setting(
                &app.handle().clone(),
                "cheat_sheet_window_size_TestSheet",
                json,
            )
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        // get 時に clamp_to_min が適用され最小値に揃えられる
        assert_eq!(result.width, 400);
        assert_eq!(result.height, 300);
    }

    // ─── 異なるタイトルで独立した設定が取得できる ────────────────────────────

    /// 異なるチートシートタイトルの設定が独立して管理される
    /// 同値クラス: 異なるキーの設定
    /// 期待値: 各タイトルに対してそれぞれの設定値が返る
    #[test]
    fn get_independent_settings_per_title() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-get-independent.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        save_cheat_sheet_window_size(app.handle().clone(), "SheetA".to_string(), 500, 700).unwrap();
        save_cheat_sheet_window_size(app.handle().clone(), "SheetB".to_string(), 800, 1000)
            .unwrap();

        let result_a =
            get_cheat_sheet_window_size(app.handle().clone(), "SheetA".to_string()).unwrap();
        let result_b =
            get_cheat_sheet_window_size(app.handle().clone(), "SheetB".to_string()).unwrap();

        assert_eq!(result_a.width, 500);
        assert_eq!(result_a.height, 700);
        assert_eq!(result_b.width, 800);
        assert_eq!(result_b.height, 1000);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// save_cheat_sheet_window_size のテスト
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod save_cheat_sheet_window_size {
    use app_lib::api::window_size::{get_cheat_sheet_window_size, save_cheat_sheet_window_size};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    // ─── 境界値: 最小値ちょうど ───────────────────────────────────────────────

    /// 境界値分析: width = MIN_WINDOW_WIDTH(400), height = MIN_WINDOW_HEIGHT(300)
    /// 最小値ちょうどの値を保存した場合、そのまま保存・取得できる
    /// 期待値: width = 400, height = 300
    #[test]
    fn save_exact_min_values() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-min-exact.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 400, 300)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 400);
        assert_eq!(result.height, 300);
    }

    // ─── 境界値: 最小値より 1 小さい値 ──────────────────────────────────────

    /// 境界値分析: width = MIN - 1(399), height = MIN - 1(299)
    /// 保存時に clamp_to_min が適用され、最小値に切り上げられる
    /// 期待値: width = 400 (MIN), height = 300 (MIN)
    #[test]
    fn save_one_below_min_clamps_to_min() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-one-below-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // MIN_WINDOW_WIDTH - 1 = 399, MIN_WINDOW_HEIGHT - 1 = 299
        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 399, 299)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 400);
        assert_eq!(result.height, 300);
    }

    // ─── 境界値: 最小値より 1 大きい値 ──────────────────────────────────────

    /// 境界値分析: width = MIN + 1(401), height = MIN + 1(301)
    /// 最小値より 1 大きい値はクランプされずそのまま保存・取得できる
    /// 期待値: width = 401, height = 301
    #[test]
    fn save_one_above_min_is_not_clamped() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-one-above-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // MIN_WINDOW_WIDTH + 1 = 401, MIN_WINDOW_HEIGHT + 1 = 301
        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 401, 301)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 401);
        assert_eq!(result.height, 301);
    }

    // ─── 同値クラス: width のみ最小値未満 ────────────────────────────────────

    /// ホワイトボックス: clamp_to_min の片方のみクランプ (width)
    /// width のみ最小値未満の場合、width だけクランプされ height はそのまま
    /// 期待値: width = 400 (MIN), height = 元の値
    #[test]
    fn save_only_width_below_min_clamps_width_only() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-width-below.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // width = 300 (MIN 未満), height = 600 (MIN 以上)
        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 300, 600)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 400);
        assert_eq!(result.height, 600);
    }

    // ─── 同値クラス: height のみ最小値未満 ───────────────────────────────────

    /// ホワイトボックス: clamp_to_min の片方のみクランプ (height)
    /// height のみ最小値未満の場合、height だけクランプされ width はそのまま
    /// 期待値: width = 元の値, height = 300 (MIN)
    #[test]
    fn save_only_height_below_min_clamps_height_only() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-height-below.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // width = 500 (MIN 以上), height = 200 (MIN 未満)
        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 500, 200)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, 500);
        assert_eq!(result.height, 300);
    }

    // ─── 境界値: 極大値 ──────────────────────────────────────────────────────

    /// 境界値分析: u32::MAX に近い極大値を保存できる
    /// 期待値: 保存した値がそのまま返る
    #[test]
    fn save_very_large_values() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-large.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let large_width: u32 = 10_000;
        let large_height: u32 = 10_000;
        save_cheat_sheet_window_size(
            app.handle().clone(),
            "TestSheet".to_string(),
            large_width,
            large_height,
        )
        .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();

        assert_eq!(result.width, large_width);
        assert_eq!(result.height, large_height);
    }

    // ─── 異なるタイトルで独立した設定を保存・取得できる ──────────────────────

    /// 複数の異なるチートシートタイトルに対して独立した設定を保存できる
    /// 同値クラス: 異なるキーへの保存
    /// 期待値: 各タイトルに対してそれぞれ保存した値が返る
    #[test]
    fn save_independent_settings_per_title() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-independent.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        save_cheat_sheet_window_size(app.handle().clone(), "SheetX".to_string(), 450, 600).unwrap();
        save_cheat_sheet_window_size(app.handle().clone(), "SheetY".to_string(), 700, 900).unwrap();
        save_cheat_sheet_window_size(app.handle().clone(), "SheetZ".to_string(), 1200, 1600)
            .unwrap();

        let result_x =
            get_cheat_sheet_window_size(app.handle().clone(), "SheetX".to_string()).unwrap();
        let result_y =
            get_cheat_sheet_window_size(app.handle().clone(), "SheetY".to_string()).unwrap();
        let result_z =
            get_cheat_sheet_window_size(app.handle().clone(), "SheetZ".to_string()).unwrap();

        assert_eq!(result_x.width, 450);
        assert_eq!(result_x.height, 600);
        assert_eq!(result_y.width, 700);
        assert_eq!(result_y.height, 900);
        assert_eq!(result_z.width, 1200);
        assert_eq!(result_z.height, 1600);
    }

    // ─── 保存した設定を上書きできる ──────────────────────────────────────────

    /// 同じタイトルに対して新しい値で上書き保存できる
    /// 同値クラス: 設定の更新
    /// 期待値: 最後に保存した値が返る
    #[test]
    fn save_overwrite_existing_settings() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-window-size-save-overwrite.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 初回保存
        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 500, 800)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();
        assert_eq!(result.width, 500);
        assert_eq!(result.height, 800);

        // 上書き保存
        save_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string(), 650, 950)
            .unwrap();

        let result =
            get_cheat_sheet_window_size(app.handle().clone(), "TestSheet".to_string()).unwrap();
        assert_eq!(result.width, 650);
        assert_eq!(result.height, 950);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WindowSizeSettings 構造体 / clamp_to_min のユニットテスト
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod window_size_settings {
    use app_lib::api::window_size::WindowSizeSettings;

    // ─── Default 実装 ─────────────────────────────────────────────────────────

    /// Default::default() が期待する定数値を返す
    /// 期待値: width = 500, height = 800
    #[test]
    fn default_returns_expected_values() {
        let settings = WindowSizeSettings::default();

        assert_eq!(settings.width, 500);
        assert_eq!(settings.height, 800);
    }

    // ─── clamp_to_min: 両値がともに最小値以上 ────────────────────────────────

    /// clamp_to_min: width・height ともに最小値以上のとき値は変化しない
    /// 境界値: width = MIN(400), height = MIN(300)
    #[test]
    fn clamp_to_min_does_not_change_values_at_min() {
        let settings = WindowSizeSettings {
            width: 400,
            height: 300,
        };
        let clamped = settings.clamp_to_min();

        assert_eq!(clamped.width, 400);
        assert_eq!(clamped.height, 300);
    }

    /// clamp_to_min: width・height ともに最小値より大きいとき値は変化しない
    #[test]
    fn clamp_to_min_does_not_change_values_above_min() {
        let settings = WindowSizeSettings {
            width: 600,
            height: 900,
        };
        let clamped = settings.clamp_to_min();

        assert_eq!(clamped.width, 600);
        assert_eq!(clamped.height, 900);
    }

    // ─── clamp_to_min: 両値ともに最小値未満 ──────────────────────────────────

    /// clamp_to_min: width・height ともに最小値未満のとき両方最小値にクランプ
    /// 境界値: width = MIN - 1(399), height = MIN - 1(299)
    #[test]
    fn clamp_to_min_clamps_both_values_below_min() {
        let settings = WindowSizeSettings {
            width: 399,
            height: 299,
        };
        let clamped = settings.clamp_to_min();

        assert_eq!(clamped.width, 400);
        assert_eq!(clamped.height, 300);
    }

    /// clamp_to_min: 極端に小さい値（0）でも最小値にクランプ
    #[test]
    fn clamp_to_min_clamps_zero_values() {
        let settings = WindowSizeSettings {
            width: 0,
            height: 0,
        };
        let clamped = settings.clamp_to_min();

        assert_eq!(clamped.width, 400);
        assert_eq!(clamped.height, 300);
    }

    // ─── clamp_to_min: 片方だけ最小値未満 ───────────────────────────────────

    /// clamp_to_min: width のみ最小値未満のとき width だけクランプ
    #[test]
    fn clamp_to_min_clamps_only_width_when_below_min() {
        let settings = WindowSizeSettings {
            width: 100,
            height: 500,
        };
        let clamped = settings.clamp_to_min();

        assert_eq!(clamped.width, 400);
        assert_eq!(clamped.height, 500);
    }

    /// clamp_to_min: height のみ最小値未満のとき height だけクランプ
    #[test]
    fn clamp_to_min_clamps_only_height_when_below_min() {
        let settings = WindowSizeSettings {
            width: 800,
            height: 100,
        };
        let clamped = settings.clamp_to_min();

        assert_eq!(clamped.width, 800);
        assert_eq!(clamped.height, 300);
    }
}
