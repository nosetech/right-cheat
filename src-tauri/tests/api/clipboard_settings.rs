// clipboard_settings API のユニットテスト（issue #180）
//
// テスト対象: src-tauri/src/api/clipboard_settings.rs
// - ClipboardSettings::normalized() のクランプロジック（純粋関数・ブラックボックス/ホワイトボックス）
// - get_clipboard_settings / set_clipboard_settings（tauri-plugin-store 永続化）
// - init_clipboard_settings（未設定時のみ既定値を書き込む冪等処理）
// - clear_history_on_quit_if_enabled（DB のクリップボード履歴全削除）
//
// テストは font_size.rs のパターン（tauri::test::mock_app +
// TauriSettingsStore）、および DB を伴うテストは db/repository.rs・api/cheatsheet.rs の
// インメモリ DB 構築パターンに準拠する。

// ─────────────────────────────────────────────────────────────
// ClipboardSettings::normalized() — 純粋関数のためモック不要
//
// 同値分割:
//   min_chars: [下限未満] [有効範囲内] [上限超過]
//   max_chars: [正規化後の min_chars 未満] [min_chars〜上限の範囲内] [上限超過]
//   max_items: [下限未満] [有効範囲内] [上限超過]
//   monitoring_enabled / clear_on_quit: bool の全組み合わせ（素通しされることを確認）
//
// 境界値分析:
//   min_chars: 0, 1, 2(下限), 3, 999, 1000(上限), 1001, u32::MAX
//   max_items: 9, 10(下限), 11, 999, 1000(上限), 1001
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod normalized {
    use app_lib::api::clipboard_settings::ClipboardSettings;

    fn settings(
        monitoring_enabled: bool,
        min_chars: u32,
        max_chars: u32,
        max_items: u32,
        clear_on_quit: bool,
    ) -> ClipboardSettings {
        ClipboardSettings {
            monitoring_enabled,
            min_chars,
            max_chars,
            max_items,
            clear_on_quit,
        }
    }

    /// 全フィールドが既に有効範囲内の場合、値は変化しない
    #[test]
    fn all_fields_within_range_are_unchanged() {
        let input = settings(true, 5, 50, 20, false);
        let result = input.normalized();
        assert_eq!(result.min_chars, 5);
        assert_eq!(result.max_chars, 50);
        assert_eq!(result.max_items, 20);
        assert_eq!(result.monitoring_enabled, true);
        assert_eq!(result.clear_on_quit, false);
    }

    /// デフォルト値は正規化しても変化しない（冪等性の前提確認）
    #[test]
    fn default_settings_are_already_normalized() {
        let default = ClipboardSettings::default();
        let result = default.normalized();
        assert_eq!(result, default);
    }

    // ── min_chars の境界値分析 ─────────────────────────────

    /// min_chars = 0（下限未満）は下限 2 にクランプされる
    #[test]
    fn min_chars_zero_is_clamped_to_lower_bound() {
        let result = settings(true, 0, 200, 100, false).normalized();
        assert_eq!(result.min_chars, 2);
    }

    /// min_chars = 1（下限の直下）は下限 2 にクランプされる
    #[test]
    fn min_chars_just_below_lower_bound_is_clamped() {
        let result = settings(true, 1, 200, 100, false).normalized();
        assert_eq!(result.min_chars, 2);
    }

    /// min_chars = 2（下限ちょうど）は変化しない
    #[test]
    fn min_chars_at_lower_bound_is_unchanged() {
        let result = settings(true, 2, 200, 100, false).normalized();
        assert_eq!(result.min_chars, 2);
    }

    /// min_chars = 3（下限の直上）は変化しない
    #[test]
    fn min_chars_just_above_lower_bound_is_unchanged() {
        let result = settings(true, 3, 200, 100, false).normalized();
        assert_eq!(result.min_chars, 3);
    }

    /// min_chars = 999（上限の直下）は変化しない
    #[test]
    fn min_chars_just_below_upper_bound_is_unchanged() {
        let result = settings(true, 999, 1000, 100, false).normalized();
        assert_eq!(result.min_chars, 999);
    }

    /// min_chars = 1000（上限ちょうど）は変化しない
    #[test]
    fn min_chars_at_upper_bound_is_unchanged() {
        let result = settings(true, 1000, 1000, 100, false).normalized();
        assert_eq!(result.min_chars, 1000);
    }

    /// min_chars = 1001（上限の直上）は上限 1000 にクランプされる
    #[test]
    fn min_chars_just_above_upper_bound_is_clamped() {
        let result = settings(true, 1001, 1001, 100, false).normalized();
        assert_eq!(result.min_chars, 1000);
    }

    /// min_chars = u32::MAX（極値）は上限 1000 にクランプされる
    #[test]
    fn min_chars_max_u32_is_clamped_to_upper_bound() {
        let result = settings(true, u32::MAX, u32::MAX, 100, false).normalized();
        assert_eq!(result.min_chars, 1000);
    }

    // ── max_chars の境界値分析・min_chars との相互作用 ──────

    /// max_chars が正規化後の min_chars 未満の場合、min_chars まで引き上げられる
    #[test]
    fn max_chars_below_min_chars_is_clamped_up_to_min_chars() {
        let result = settings(true, 5, 3, 100, false).normalized();
        assert_eq!(result.min_chars, 5);
        assert_eq!(result.max_chars, 5);
    }

    /// max_chars = min_chars（下限ちょうど）は変化しない
    #[test]
    fn max_chars_equal_to_min_chars_is_unchanged() {
        let result = settings(true, 5, 5, 100, false).normalized();
        assert_eq!(result.max_chars, 5);
    }

    /// max_chars 下限は「正規化後」の min_chars を使う（issue #180 の整合性ルール）。
    /// min_chars = 0（クランプ後 2）、max_chars = 1（クランプ後の min_chars 未満）
    /// の場合、max_chars は正規化後の min_chars = 2 まで引き上げられる。
    #[test]
    fn max_chars_lower_bound_uses_normalized_min_chars_not_raw_value() {
        let result = settings(true, 0, 1, 100, false).normalized();
        assert_eq!(result.min_chars, 2);
        assert_eq!(result.max_chars, 2);
    }

    /// min_chars が上限超過でクランプされた場合、max_chars もクランプ後の min_chars まで
    /// 引き上げられる
    #[test]
    fn max_chars_lower_bound_uses_normalized_min_chars_when_min_chars_clamped_high() {
        let result = settings(true, 1001, 500, 100, false).normalized();
        assert_eq!(result.min_chars, 1000);
        assert_eq!(result.max_chars, 1000);
    }

    /// max_chars = 999（上限の直下）は変化しない
    #[test]
    fn max_chars_just_below_upper_bound_is_unchanged() {
        let result = settings(true, 2, 999, 100, false).normalized();
        assert_eq!(result.max_chars, 999);
    }

    /// max_chars = 1000（上限ちょうど）は変化しない
    #[test]
    fn max_chars_at_upper_bound_is_unchanged() {
        let result = settings(true, 2, 1000, 100, false).normalized();
        assert_eq!(result.max_chars, 1000);
    }

    /// max_chars = 1001（上限の直上）は上限 1000 にクランプされる
    #[test]
    fn max_chars_just_above_upper_bound_is_clamped() {
        let result = settings(true, 2, 1001, 100, false).normalized();
        assert_eq!(result.max_chars, 1000);
    }

    // ── max_items の境界値分析 ─────────────────────────────

    /// max_items = 9（下限の直下）は下限 10 にクランプされる
    #[test]
    fn max_items_just_below_lower_bound_is_clamped() {
        let result = settings(true, 2, 200, 9, false).normalized();
        assert_eq!(result.max_items, 10);
    }

    /// max_items = 10（下限ちょうど）は変化しない
    #[test]
    fn max_items_at_lower_bound_is_unchanged() {
        let result = settings(true, 2, 200, 10, false).normalized();
        assert_eq!(result.max_items, 10);
    }

    /// max_items = 11（下限の直上）は変化しない
    #[test]
    fn max_items_just_above_lower_bound_is_unchanged() {
        let result = settings(true, 2, 200, 11, false).normalized();
        assert_eq!(result.max_items, 11);
    }

    /// max_items = 999（上限の直下）は変化しない
    #[test]
    fn max_items_just_below_upper_bound_is_unchanged() {
        let result = settings(true, 2, 200, 999, false).normalized();
        assert_eq!(result.max_items, 999);
    }

    /// max_items = 1000（上限ちょうど）は変化しない
    #[test]
    fn max_items_at_upper_bound_is_unchanged() {
        let result = settings(true, 2, 200, 1000, false).normalized();
        assert_eq!(result.max_items, 1000);
    }

    /// max_items = 1001（上限の直上）は上限 1000 にクランプされる
    #[test]
    fn max_items_just_above_upper_bound_is_clamped() {
        let result = settings(true, 2, 200, 1001, false).normalized();
        assert_eq!(result.max_items, 1000);
    }

    /// max_items = 0（極値）は下限 10 にクランプされる
    #[test]
    fn max_items_zero_is_clamped_to_lower_bound() {
        let result = settings(true, 2, 200, 0, false).normalized();
        assert_eq!(result.max_items, 10);
    }

    /// max_items = u32::MAX（極値）は上限 1000 にクランプされる
    #[test]
    fn max_items_max_u32_is_clamped_to_upper_bound() {
        let result = settings(true, 2, 200, u32::MAX, false).normalized();
        assert_eq!(result.max_items, 1000);
    }

    // ── bool フィールドの素通し確認（組み合わせテスト） ────

    /// monitoring_enabled / clear_on_quit は数値クランプの影響を受けず、
    /// そのまま保持される（true, true の組み合わせ）
    #[test]
    fn bool_fields_pass_through_true_true() {
        let result = settings(true, 0, 0, 0, true).normalized();
        assert_eq!(result.monitoring_enabled, true);
        assert_eq!(result.clear_on_quit, true);
    }

    /// bool フィールドの素通し確認（true, false の組み合わせ）
    #[test]
    fn bool_fields_pass_through_true_false() {
        let result = settings(true, 0, 0, 0, false).normalized();
        assert_eq!(result.monitoring_enabled, true);
        assert_eq!(result.clear_on_quit, false);
    }

    /// bool フィールドの素通し確認（false, true の組み合わせ）
    #[test]
    fn bool_fields_pass_through_false_true() {
        let result = settings(false, 0, 0, 0, true).normalized();
        assert_eq!(result.monitoring_enabled, false);
        assert_eq!(result.clear_on_quit, true);
    }

    /// bool フィールドの素通し確認（false, false の組み合わせ）
    #[test]
    fn bool_fields_pass_through_false_false() {
        let result = settings(false, 0, 0, 0, false).normalized();
        assert_eq!(result.monitoring_enabled, false);
        assert_eq!(result.clear_on_quit, false);
    }

    /// normalized() は冪等: 一度正規化した結果を再度正規化しても変化しない
    #[test]
    fn normalized_is_idempotent() {
        let once = settings(true, 0, 5000, 1, false).normalized();
        let twice = once.clone().normalized();
        assert_eq!(once, twice);
    }
}

// ─────────────────────────────────────────────────────────────
// get_clipboard_settings
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod get_clipboard_settings {
    use app_lib::api::clipboard_settings::{get_clipboard_settings, ClipboardSettings};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 同値クラス: 設定が未保存
    /// 期待値: ClipboardSettings::default() を返す
    #[test]
    fn get_default_when_unset() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-get-default.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, ClipboardSettings::default());
    }

    /// 同値クラス: 有効範囲内の値が保存済み
    /// 期待値: 保存されている値をそのまま返す
    #[test]
    fn get_returns_persisted_value_within_range() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-get-persisted.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let custom = ClipboardSettings {
            monitoring_enabled: false,
            min_chars: 10,
            max_chars: 300,
            max_items: 50,
            clear_on_quit: true,
        };
        settings_store
            .set_setting(
                &app.handle().clone(),
                "clipboard_settings",
                serde_json::to_value(&custom).unwrap(),
            )
            .unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, custom);
    }

    /// ホワイトボックス: get_clipboard_settings は取得した値に normalized() を適用する
    /// （src-tauri/src/api/clipboard_settings.rs の Ok(Some(json)) 分岐）。
    /// ストア内に範囲外の値が直接保存されているケース（手動編集された設定ファイル等を想定）。
    #[test]
    fn get_normalizes_out_of_range_persisted_value() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-get-out-of-range.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // set_clipboard_settings を経由せず、正規化されていない生の値を直接ストアに書き込む
        let raw_out_of_range = ClipboardSettings {
            monitoring_enabled: true,
            min_chars: 0,    // 下限未満 -> 2 に補正されるはず
            max_chars: 5000, // 上限超過 -> 1000 に補正されるはず
            max_items: 1,    // 下限未満 -> 10 に補正されるはず
            clear_on_quit: false,
        };
        settings_store
            .set_setting(
                &app.handle().clone(),
                "clipboard_settings",
                serde_json::to_value(&raw_out_of_range).unwrap(),
            )
            .unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result.min_chars, 2);
        assert_eq!(result.max_chars, 1000);
        assert_eq!(result.max_items, 10);
    }
}

// ─────────────────────────────────────────────────────────────
// set_clipboard_settings
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod set_clipboard_settings {
    use app_lib::api::clipboard_settings::{
        get_clipboard_settings, set_clipboard_settings, ClipboardSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 同値クラス: 入力が既に有効範囲内
    /// 期待値: そのまま永続化される
    #[test]
    fn set_persists_value_within_range_unchanged() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-set-within-range.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let custom = ClipboardSettings {
            monitoring_enabled: false,
            min_chars: 5,
            max_chars: 100,
            max_items: 30,
            clear_on_quit: true,
        };
        set_clipboard_settings(app.handle().clone(), custom.clone()).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, custom);
    }

    /// 同値クラス: 入力が範囲外（min_chars 下限未満、max_chars 上限超過、max_items 下限未満）
    /// 期待値: normalized() が適用された値が永続化される
    #[test]
    fn set_normalizes_out_of_range_input_before_persisting() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-set-out-of-range.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let out_of_range = ClipboardSettings {
            monitoring_enabled: true,
            min_chars: 0,
            max_chars: 99999,
            max_items: 3,
            clear_on_quit: false,
        };
        set_clipboard_settings(app.handle().clone(), out_of_range).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result.min_chars, 2);
        assert_eq!(result.max_chars, 1000);
        assert_eq!(result.max_items, 10);
    }

    /// 境界値: max_chars が min_chars 未満の入力は min_chars まで引き上げて永続化される
    #[test]
    fn set_corrects_max_chars_below_min_chars() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-set-max-below-min.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let inconsistent = ClipboardSettings {
            monitoring_enabled: true,
            min_chars: 50,
            max_chars: 10,
            max_items: 100,
            clear_on_quit: false,
        };
        set_clipboard_settings(app.handle().clone(), inconsistent).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result.min_chars, 50);
        assert_eq!(result.max_chars, 50);
    }

    /// monitoring_enabled / clear_on_quit のトグル切り替えが正しく永続化されることを確認
    #[test]
    fn set_toggles_bool_fields() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-set-toggle.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // デフォルト（monitoring_enabled = true, clear_on_quit = false）から開始
        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result.monitoring_enabled, true);
        assert_eq!(result.clear_on_quit, false);

        // 両方反転
        let mut toggled = result.clone();
        toggled.monitoring_enabled = false;
        toggled.clear_on_quit = true;
        set_clipboard_settings(app.handle().clone(), toggled).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result.monitoring_enabled, false);
        assert_eq!(result.clear_on_quit, true);

        // 元に戻す
        let mut restored = result.clone();
        restored.monitoring_enabled = true;
        restored.clear_on_quit = false;
        set_clipboard_settings(app.handle().clone(), restored).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result.monitoring_enabled, true);
        assert_eq!(result.clear_on_quit, false);
    }

    /// set_clipboard_settings は内部で clipboard_settings_changed イベントを emit する
    /// （src-tauri/src/api/clipboard_settings.rs 参照）。
    /// emit が失敗した場合は Err が返り .unwrap() が panic するため、正常終了することを
    /// もって emit が成功したことを間接的に検証する（font_size.rs の既存テストと同じ方針）。
    #[test]
    fn set_completes_successfully_implying_event_emitted() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-set-emit.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let result = set_clipboard_settings(app.handle().clone(), ClipboardSettings::default());
        assert!(result.is_ok());
    }
}

// ─────────────────────────────────────────────────────────────
// init_clipboard_settings
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod init_clipboard_settings {
    use app_lib::api::clipboard_settings::{
        get_clipboard_settings, init_clipboard_settings, set_clipboard_settings, ClipboardSettings,
    };
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use tauri::test::mock_app;

    /// 同値クラス: 設定が未保存
    /// 期待値: 既定値が保存される
    #[test]
    fn init_when_settings_do_not_exist_saves_default() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-init-new.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        init_clipboard_settings(&app.handle()).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, ClipboardSettings::default());
    }

    /// 同値クラス: 設定が既に保存済み
    /// 期待値: 既存設定が保持される（デフォルト値で上書きされない）
    #[test]
    fn init_when_settings_exist_keeps_existing_value() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-init-existing.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let custom = ClipboardSettings {
            monitoring_enabled: false,
            min_chars: 20,
            max_chars: 500,
            max_items: 200,
            clear_on_quit: true,
        };
        set_clipboard_settings(app.handle().clone(), custom.clone()).unwrap();

        init_clipboard_settings(&app.handle()).unwrap();

        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, custom);
    }

    /// 冪等性: 複数回初期化しても設定は破損せず、既存値が保持され続ける
    #[test]
    fn init_multiple_times_is_idempotent() {
        let app = mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings("unittest-clipboard-init-multiple.json");
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        // 1回目: 未設定のため既定値が作られる
        init_clipboard_settings(&app.handle()).unwrap();
        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, ClipboardSettings::default());

        // 設定を変更
        let custom = ClipboardSettings {
            monitoring_enabled: false,
            min_chars: 10,
            max_chars: 400,
            max_items: 150,
            clear_on_quit: true,
        };
        set_clipboard_settings(app.handle().clone(), custom.clone()).unwrap();

        // 2回目・3回目: 上書きされないはず
        init_clipboard_settings(&app.handle()).unwrap();
        init_clipboard_settings(&app.handle()).unwrap();
        let result = get_clipboard_settings(app.handle().clone()).unwrap();
        assert_eq!(result, custom);
    }
}

// ─────────────────────────────────────────────────────────────
// clear_history_on_quit_if_enabled
//
// tests/db/repository.rs の setup() パターン（インメモリ DB + apply_migrations）と
// tests/api/cheatsheet.rs の setup_mock_app_with_db() パターン（DbConnection を
// mock app に manage）を組み合わせる。settings ストアも併せて初期化する。
// ─────────────────────────────────────────────────────────────
#[cfg(test)]
mod clear_history_on_quit_if_enabled {
    use app_lib::api::clipboard_settings::{
        clear_history_on_quit_if_enabled, set_clipboard_settings, ClipboardSettings,
    };
    use app_lib::db::repository::{count_clipboard_history, insert_clipboard_history};
    use app_lib::db::{schema, DbConnection};
    use app_lib::settings_store::{SettingsStore, TauriSettingsStore};
    use rusqlite::Connection;
    use std::sync::Mutex;
    use tauri::Manager;

    fn setup_mock_app_with_db(settings_filename: &str) -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_app();
        let _ = app
            .handle()
            .plugin(tauri_plugin_store::Builder::new().build());
        let settings_store = TauriSettingsStore;
        settings_store.initialize_settings(settings_filename);
        settings_store
            .clear_settings(&app.handle().clone())
            .unwrap();

        let conn = Connection::open_in_memory().expect("in-memory DB の作成に失敗");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        schema::apply_migrations(&conn).unwrap();
        app.manage(DbConnection(Mutex::new(conn)));
        app
    }

    /// 同値クラス: clear_on_quit = true、履歴が存在する
    /// 期待値: クリップボード履歴が全削除される
    #[test]
    fn clears_history_when_clear_on_quit_enabled() {
        let app = setup_mock_app_with_db("unittest-clipboard-clear-on-quit-enabled.json");

        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
            insert_clipboard_history(&conn, "c").unwrap();
            assert_eq!(count_clipboard_history(&conn).unwrap(), 3);
        }

        let settings = ClipboardSettings {
            clear_on_quit: true,
            ..ClipboardSettings::default()
        };
        set_clipboard_settings(app.handle().clone(), settings).unwrap();

        clear_history_on_quit_if_enabled(&app.handle());

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        assert_eq!(count_clipboard_history(&conn).unwrap(), 0);
    }

    /// 同値クラス: clear_on_quit = false（デフォルト）、履歴が存在する
    /// 期待値: クリップボード履歴は削除されずそのまま残る
    #[test]
    fn keeps_history_when_clear_on_quit_disabled() {
        let app = setup_mock_app_with_db("unittest-clipboard-clear-on-quit-disabled.json");

        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
            insert_clipboard_history(&conn, "b").unwrap();
            assert_eq!(count_clipboard_history(&conn).unwrap(), 2);
        }

        // 設定を保存しない（デフォルトの clear_on_quit = false のまま）
        clear_history_on_quit_if_enabled(&app.handle());

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        assert_eq!(count_clipboard_history(&conn).unwrap(), 2);
    }

    /// 明示的に clear_on_quit = false を保存したケース
    /// 期待値: クリップボード履歴は削除されない
    #[test]
    fn keeps_history_when_clear_on_quit_explicitly_disabled() {
        let app = setup_mock_app_with_db("unittest-clipboard-clear-on-quit-explicit-false.json");

        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_clipboard_history(&conn, "a").unwrap();
        }

        let settings = ClipboardSettings {
            clear_on_quit: false,
            ..ClipboardSettings::default()
        };
        set_clipboard_settings(app.handle().clone(), settings).unwrap();

        clear_history_on_quit_if_enabled(&app.handle());

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        assert_eq!(count_clipboard_history(&conn).unwrap(), 1);
    }

    /// 境界値: clear_on_quit = true、履歴が空（0件）
    /// 期待値: エラーにならず 0件のまま
    #[test]
    fn clear_on_quit_enabled_with_empty_history_does_not_error() {
        let app = setup_mock_app_with_db("unittest-clipboard-clear-on-quit-empty.json");

        let settings = ClipboardSettings {
            clear_on_quit: true,
            ..ClipboardSettings::default()
        };
        set_clipboard_settings(app.handle().clone(), settings).unwrap();

        clear_history_on_quit_if_enabled(&app.handle());

        let state = app.state::<DbConnection>();
        let conn = state.0.lock().unwrap();
        assert_eq!(count_clipboard_history(&conn).unwrap(), 0);
    }

    // 注記: get_clipboard_settings のエラー分岐（settings_store.get_setting が Err を返す
    // ケース）および DB ロック失敗（Mutex poisoning）分岐は、tauri::test の mock 環境では
    // 意図的に発生させる手段がなく、テスト不可能なコードとしてカバレッジ対象外とする。
}
