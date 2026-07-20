#[cfg(test)]
mod is_cheatsheet_window_label {
    use app_lib::api::cheatsheet_window::is_cheatsheet_window_label;

    // --- 同値分割: 有効クラス (true を返すべき) ---

    #[test]
    fn main_label_is_true() {
        // "main" は固定のメインウィンドウラベル
        assert!(is_cheatsheet_window_label("main"));
    }

    #[test]
    fn cheatsheet_prefix_with_number_is_true() {
        // 典型的な追加ウィンドウラベル
        assert!(is_cheatsheet_window_label("cheatsheet-2"));
    }

    #[test]
    fn cheatsheet_prefix_with_large_number_is_true() {
        // 大きい番号でも prefix さえ一致すれば true
        assert!(is_cheatsheet_window_label("cheatsheet-999"));
    }

    #[test]
    fn cheatsheet_prefix_only_is_true() {
        // 境界値: prefix ちょうどで番号部分が空文字でも starts_with は true
        assert!(is_cheatsheet_window_label("cheatsheet-"));
    }

    #[test]
    fn cheatsheet_prefix_with_non_numeric_suffix_is_true() {
        // starts_with による判定のため、番号以外の suffix でも true になる
        assert!(is_cheatsheet_window_label("cheatsheet-abc"));
    }

    // --- 同値分割: 無効クラス (false を返すべき) ---

    #[test]
    fn search_label_is_false() {
        assert!(!is_cheatsheet_window_label("search"));
    }

    #[test]
    fn preferences_label_is_false() {
        assert!(!is_cheatsheet_window_label("preferences"));
    }

    #[test]
    fn clipboard_history_label_is_false() {
        assert!(!is_cheatsheet_window_label("clipboard_history"));
    }

    #[test]
    fn empty_string_is_false() {
        // 境界値: 空文字列
        assert!(!is_cheatsheet_window_label(""));
    }

    #[test]
    fn mainx_is_false() {
        // 境界値: "main" に前方一致するが完全一致ではない文字列
        // "main" との等価比較のみで判定されるため false
        assert!(!is_cheatsheet_window_label("mainx"));
    }

    #[test]
    fn main_uppercase_is_false() {
        // 大文字小文字は区別される（ケースセンシティブ）
        assert!(!is_cheatsheet_window_label("Main"));
    }

    #[test]
    fn cheatsheet_without_trailing_hyphen_is_false() {
        // prefix の末尾ハイフンが無いと starts_with が一致しない
        assert!(!is_cheatsheet_window_label("cheatsheet"));
    }

    #[test]
    fn cheatsheet_uppercase_prefix_is_false() {
        // prefix 部分も大文字小文字を区別する
        assert!(!is_cheatsheet_window_label("Cheatsheet-2"));
    }

    #[test]
    fn substring_match_in_middle_is_false() {
        // "cheatsheet-" が先頭ではなく途中に含まれる場合は false
        assert!(!is_cheatsheet_window_label("x-cheatsheet-2"));
    }
}

#[cfg(test)]
mod next_cheatsheet_window_id {
    use app_lib::api::cheatsheet_window::NextCheatsheetWindowId;
    use std::sync::atomic::Ordering;

    #[test]
    fn default_value_is_two() {
        // main は起動時に既に生成されているため、追加ウィンドウは 2 から採番される
        let counter = NextCheatsheetWindowId::default();
        assert_eq!(counter.0.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn fetch_add_returns_previous_value_and_increments() {
        let counter = NextCheatsheetWindowId::default();

        // fetch_add は「加算前」の値を返す仕様であることを確認
        let first = counter.0.fetch_add(1, Ordering::SeqCst);
        assert_eq!(first, 2);
        assert_eq!(counter.0.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn fetch_add_sequence_is_monotonically_increasing() {
        let counter = NextCheatsheetWindowId::default();

        // create_cheatsheet_window 相当の連続呼び出しを模し、
        // 2, 3, 4, 5, ... と単調増加することを確認する
        let ids: Vec<u32> = (0..5)
            .map(|_| counter.0.fetch_add(1, Ordering::SeqCst))
            .collect();
        assert_eq!(ids, vec![2, 3, 4, 5, 6]);
    }

    #[test]
    fn fetch_add_does_not_reuse_freed_numbers() {
        let counter = NextCheatsheetWindowId::default();

        // ウィンドウ 2, 3 を「生成」した後に 2 が閉じられたと仮定しても、
        // カウンタは空き番号 (2) を再利用せず、常にインクリメントし続ける。
        let first = counter.0.fetch_add(1, Ordering::SeqCst); // 2 を採番
        let second = counter.0.fetch_add(1, Ordering::SeqCst); // 3 を採番
        assert_eq!(first, 2);
        assert_eq!(second, 3);

        // ここで label "cheatsheet-2" のウィンドウが閉じられたとしても
        // カウンタ自体はそれを関知せず、次の採番は 4 になる。
        let third = counter.0.fetch_add(1, Ordering::SeqCst);
        assert_eq!(third, 4);
    }
}

#[cfg(test)]
mod last_focused_cheatsheet_window {
    use app_lib::api::cheatsheet_window::LastFocusedCheatsheetWindow;

    #[test]
    fn new_with_main_initializes_to_main() {
        let state = LastFocusedCheatsheetWindow::new_with_main();
        let guard = state.0.lock().unwrap();
        assert_eq!(guard.as_deref(), Some("main"));
    }

    #[test]
    fn can_be_updated_and_read_back() {
        // register_focus_handler が行う「フォーカスされたラベルで上書きする」動作を模す
        let state = LastFocusedCheatsheetWindow::new_with_main();
        {
            let mut guard = state.0.lock().unwrap();
            *guard = Some("cheatsheet-2".to_string());
        }
        let guard = state.0.lock().unwrap();
        assert_eq!(guard.as_deref(), Some("cheatsheet-2"));
    }

    #[test]
    fn can_be_cleared_to_none() {
        // 全ウィンドウが閉じられた場合など、None になり得ることを確認
        let state = LastFocusedCheatsheetWindow::new_with_main();
        {
            let mut guard = state.0.lock().unwrap();
            *guard = None;
        }
        let guard = state.0.lock().unwrap();
        assert!(guard.is_none());
    }
}

#[cfg(test)]
mod edit_window_labels {
    use app_lib::api::cheatsheet_window::edit_window_labels;

    // --- 同値分割: 通常のラベル ---

    #[test]
    fn main_label_returns_edit_command_and_edit_group() {
        // "main" はメインウィンドウの固定ラベル
        let labels = edit_window_labels("main");
        assert_eq!(
            labels,
            [
                "edit_command-main".to_string(),
                "edit_group-main".to_string()
            ]
        );
    }

    #[test]
    fn label_containing_hyphen_is_appended_as_is() {
        // ラベル自体にハイフンを含むケース（cheatsheet-N 形式）でも
        // 単純に文字列連結されるだけであることを確認
        let labels = edit_window_labels("cheatsheet-2");
        assert_eq!(
            labels,
            [
                "edit_command-cheatsheet-2".to_string(),
                "edit_group-cheatsheet-2".to_string()
            ]
        );
    }

    // --- ホワイトボックス: 返り値の構造（要素数・順序） ---

    #[test]
    fn result_has_exactly_two_elements() {
        // 戻り値の型は [String; 2] で固定長であることの確認
        let labels = edit_window_labels("main");
        assert_eq!(labels.len(), 2);
    }

    #[test]
    fn first_element_is_edit_command_prefixed() {
        // [0] は edit_command 系のラベルであること（順序の固定）
        let labels = edit_window_labels("main");
        assert!(labels[0].starts_with("edit_command-"));
    }

    #[test]
    fn second_element_is_edit_group_prefixed() {
        // [1] は edit_group 系のラベルであること（順序の固定）
        let labels = edit_window_labels("main");
        assert!(labels[1].starts_with("edit_group-"));
    }

    // --- 境界値: 空文字列（縮退ケース） ---

    #[test]
    fn empty_parent_label_returns_degenerate_labels() {
        // parent_label が空文字列の場合の仕様を固定する（縮退ケース）
        let labels = edit_window_labels("");
        assert_eq!(
            labels,
            ["edit_command-".to_string(), "edit_group-".to_string()]
        );
    }
}

#[cfg(test)]
mod resolve_toggle_target_visible {
    use app_lib::api::cheatsheet_window::resolve_toggle_target_visible;

    // --- 同値分割: 全ウィンドウが同じ状態 ---

    #[test]
    fn all_visible_targets_hidden() {
        // 全ウィンドウが表示中なら、目標状態は「非表示にする」(false)
        assert!(!resolve_toggle_target_visible(&[true, true, true]));
    }

    #[test]
    fn all_hidden_targets_visible() {
        // 全ウィンドウが非表示なら、目標状態は「表示する」(true)
        assert!(resolve_toggle_target_visible(&[false, false, false]));
    }

    // --- 同値分割: 状態が混在している ---

    #[test]
    fn mixed_visibility_targets_hidden() {
        // 1つでも表示中のウィンドウがあれば「非表示にする」(false) を優先し、
        // 全ウィンドウの状態を揃える
        assert!(!resolve_toggle_target_visible(&[true, false, false]));
    }

    #[test]
    fn single_visible_among_many_targets_hidden() {
        // 大多数が非表示でも1つでも表示中なら false
        assert!(!resolve_toggle_target_visible(&[
            false, false, false, false, true
        ]));
    }

    // --- 境界値分析 ---

    #[test]
    fn single_visible_window_targets_hidden() {
        // 要素数1（境界値）: 表示中なら非表示へ
        assert!(!resolve_toggle_target_visible(&[true]));
    }

    #[test]
    fn single_hidden_window_targets_visible() {
        // 要素数1（境界値）: 非表示なら表示へ
        assert!(resolve_toggle_target_visible(&[false]));
    }

    #[test]
    fn empty_slice_targets_visible() {
        // 境界値: 空スライス。「表示中のウィンドウが1つもない」と同じ扱いになり
        // true を返す（呼び出し側は空の場合は別途新規ウィンドウを開く経路を通る
        // ため、この関数自体はあくまで縮退ケースの仕様を固定するだけ）
        let visibilities: [bool; 0] = [];
        assert!(resolve_toggle_target_visible(&visibilities));
    }
}
