// common.rs のテスト
//
// テスト対象: app_lib::common
//   - config モジュールの定数
//   - event モジュールの定数
//
// ブラックボックス テスト設計:
//   [同値分割]
//     有効クラス①: 定数が期待する文字列値と等しい（各定数1ケース）
//     有効クラス②: 定数同士が互いに異なる（一意性の確認）
//   [境界値分析]
//     各定数は固定文字列リテラルであるため入力境界はない。
//     ただし、以下の観点を検証する:
//       - 空文字列でないこと（最短境界: len >= 1）
//       - 値に意図しない余分な空白が含まれていないこと
//
// ホワイトボックス テスト設計:
//   - config モジュールの全定数（SETTING_FILENAME, TOGGLE_VISIBLE_SHORTCUT）を参照するパス
//   - event モジュールの全定数（WINDOW_VISIABLE_TOGGLE, RELOAD_CHEAT_SHEET,
//     THEME_CHANGED, FONT_SIZE_CHANGED, WINDOW_FOCUSED）を参照するパス
//   定数は分岐を持たないため、参照するだけでカバレッジが達成される

#[cfg(test)]
mod config_constants {
    use app_lib::common::config;

    // ブラックボックス: 同値分割 - 有効クラス① (SETTING_FILENAME が期待値と等しい)
    // ホワイトボックス: config::SETTING_FILENAME を参照するパス
    #[test]
    fn setting_filename_has_expected_value() {
        // Arrange: 期待する設定ファイル名
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(config::SETTING_FILENAME, "rightcheat-settings.json");
    }

    // ブラックボックス: 同値分割 - 有効クラス① (TOGGLE_VISIBLE_SHORTCUT が期待値と等しい)
    // ホワイトボックス: config::TOGGLE_VISIBLE_SHORTCUT を参照するパス
    #[test]
    fn toggle_visible_shortcut_has_expected_value() {
        // Arrange: 期待するショートカット設定キー名
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(
            config::TOGGLE_VISIBLE_SHORTCUT,
            "toggle_visibe_shortcut_settings"
        );
    }

    // ブラックボックス: 境界値分析 - 各定数が空文字列でないこと（最短境界）
    // ホワイトボックス: config モジュール全定数を参照するパス
    #[test]
    fn config_constants_are_not_empty() {
        // Assert: いずれの定数も空文字列でないこと
        assert!(
            !config::SETTING_FILENAME.is_empty(),
            "SETTING_FILENAME は空文字列であってはならない"
        );
        assert!(
            !config::TOGGLE_VISIBLE_SHORTCUT.is_empty(),
            "TOGGLE_VISIBLE_SHORTCUT は空文字列であってはならない"
        );
    }

    // ブラックボックス: 同値分割 - 有効クラス② (config 定数同士が異なる)
    #[test]
    fn config_constants_are_unique() {
        // Assert: config 内の定数が互いに異なること（誤ったコピペによる重複がないこと）
        assert_ne!(
            config::SETTING_FILENAME,
            config::TOGGLE_VISIBLE_SHORTCUT,
            "config 定数はそれぞれ一意の値を持つこと"
        );
    }

    // ブラックボックス: 境界値分析 - 定数値に余分な空白が含まれていないこと
    #[test]
    fn config_constants_have_no_surrounding_whitespace() {
        // Assert: 各定数が trim() しても変化しないこと（前後に空白がないこと）
        assert_eq!(
            config::SETTING_FILENAME,
            config::SETTING_FILENAME.trim(),
            "SETTING_FILENAME に前後の空白が含まれていないこと"
        );
        assert_eq!(
            config::TOGGLE_VISIBLE_SHORTCUT,
            config::TOGGLE_VISIBLE_SHORTCUT.trim(),
            "TOGGLE_VISIBLE_SHORTCUT に前後の空白が含まれていないこと"
        );
    }
}

#[cfg(test)]
mod event_constants {
    use app_lib::common::event;

    // ブラックボックス: 同値分割 - 有効クラス① (WINDOW_VISIABLE_TOGGLE が期待値と等しい)
    // ホワイトボックス: event::WINDOW_VISIABLE_TOGGLE を参照するパス
    #[test]
    fn window_visiable_toggle_has_expected_value() {
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(event::WINDOW_VISIABLE_TOGGLE, "window_visible_toggle");
    }

    // ブラックボックス: 同値分割 - 有効クラス① (RELOAD_CHEAT_SHEET が期待値と等しい)
    // ホワイトボックス: event::RELOAD_CHEAT_SHEET を参照するパス
    #[test]
    fn reload_cheat_sheet_has_expected_value() {
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(event::RELOAD_CHEAT_SHEET, "reload_cheat_sheet");
    }

    // ブラックボックス: 同値分割 - 有効クラス① (THEME_CHANGED が期待値と等しい)
    // ホワイトボックス: event::THEME_CHANGED を参照するパス
    #[test]
    fn theme_changed_has_expected_value() {
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(event::THEME_CHANGED, "theme_changed");
    }

    // ブラックボックス: 同値分割 - 有効クラス① (FONT_SIZE_CHANGED が期待値と等しい)
    // ホワイトボックス: event::FONT_SIZE_CHANGED を参照するパス
    #[test]
    fn font_size_changed_has_expected_value() {
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(event::FONT_SIZE_CHANGED, "font_size_changed");
    }

    // ブラックボックス: 同値分割 - 有効クラス① (WINDOW_FOCUSED が期待値と等しい)
    // ホワイトボックス: event::WINDOW_FOCUSED を参照するパス
    #[test]
    fn window_focused_has_expected_value() {
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(event::WINDOW_FOCUSED, "window_focused");
    }

    // ブラックボックス: 同値分割 - 有効クラス① (OPEN_CHEAT_SHEET が期待値と等しい)
    // ホワイトボックス: event::OPEN_CHEAT_SHEET を参照するパス
    // ※ issue #146 (コマンド全文検索 UI) で追加された定数
    #[test]
    fn open_cheat_sheet_has_expected_value() {
        // Act & Assert: 定数が期待する値と一致すること
        assert_eq!(event::OPEN_CHEAT_SHEET, "open_cheat_sheet");
    }

    // ブラックボックス: 境界値分析 - 各定数が空文字列でないこと（最短境界）
    // ホワイトボックス: event モジュール全定数を参照するパス
    #[test]
    fn event_constants_are_not_empty() {
        // Assert: いずれの定数も空文字列でないこと
        assert!(
            !event::WINDOW_VISIABLE_TOGGLE.is_empty(),
            "WINDOW_VISIABLE_TOGGLE は空文字列であってはならない"
        );
        assert!(
            !event::RELOAD_CHEAT_SHEET.is_empty(),
            "RELOAD_CHEAT_SHEET は空文字列であってはならない"
        );
        assert!(
            !event::THEME_CHANGED.is_empty(),
            "THEME_CHANGED は空文字列であってはならない"
        );
        assert!(
            !event::FONT_SIZE_CHANGED.is_empty(),
            "FONT_SIZE_CHANGED は空文字列であってはならない"
        );
        assert!(
            !event::WINDOW_FOCUSED.is_empty(),
            "WINDOW_FOCUSED は空文字列であってはならない"
        );
        assert!(
            !event::OPEN_CHEAT_SHEET.is_empty(),
            "OPEN_CHEAT_SHEET は空文字列であってはならない"
        );
    }

    // ブラックボックス: 同値分割 - 有効クラス② (event 定数同士が互いに異なる)
    // フロントエンドとバックエンドが同じ文字列でイベントを識別するため、
    // 各定数が一意であることは重大な要件である。
    #[test]
    fn event_constants_are_all_unique() {
        // Arrange: 全定数を配列に集める
        let constants = [
            event::WINDOW_VISIABLE_TOGGLE,
            event::RELOAD_CHEAT_SHEET,
            event::THEME_CHANGED,
            event::FONT_SIZE_CHANGED,
            event::WINDOW_FOCUSED,
            event::OPEN_CHEAT_SHEET,
        ];

        // Act: 重複チェック（O(n^2) だが定数数が少ないため許容）
        for i in 0..constants.len() {
            for j in (i + 1)..constants.len() {
                assert_ne!(
                    constants[i], constants[j],
                    "event 定数はすべて一意の値を持つこと: index {} と {} が同じ値 \"{}\"",
                    i, j, constants[i]
                );
            }
        }
    }

    // ブラックボックス: 境界値分析 - 定数値に余分な空白が含まれていないこと
    // イベント名に空白が混入していると Tauri のイベントシステムで
    // リスナーとエミッターが一致しなくなるため検証が必要。
    #[test]
    fn event_constants_have_no_surrounding_whitespace() {
        // Assert: 各定数が trim() しても変化しないこと（前後に空白がないこと）
        assert_eq!(
            event::WINDOW_VISIABLE_TOGGLE,
            event::WINDOW_VISIABLE_TOGGLE.trim(),
            "WINDOW_VISIABLE_TOGGLE に前後の空白が含まれていないこと"
        );
        assert_eq!(
            event::RELOAD_CHEAT_SHEET,
            event::RELOAD_CHEAT_SHEET.trim(),
            "RELOAD_CHEAT_SHEET に前後の空白が含まれていないこと"
        );
        assert_eq!(
            event::THEME_CHANGED,
            event::THEME_CHANGED.trim(),
            "THEME_CHANGED に前後の空白が含まれていないこと"
        );
        assert_eq!(
            event::FONT_SIZE_CHANGED,
            event::FONT_SIZE_CHANGED.trim(),
            "FONT_SIZE_CHANGED に前後の空白が含まれていないこと"
        );
        assert_eq!(
            event::WINDOW_FOCUSED,
            event::WINDOW_FOCUSED.trim(),
            "WINDOW_FOCUSED に前後の空白が含まれていないこと"
        );
        assert_eq!(
            event::OPEN_CHEAT_SHEET,
            event::OPEN_CHEAT_SHEET.trim(),
            "OPEN_CHEAT_SHEET に前後の空白が含まれていないこと"
        );
    }
}
