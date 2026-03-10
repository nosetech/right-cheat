#[cfg(test)]
mod get_cheat_titles {
    use tauri::test::mock_app;

    use app_lib::api::cheatsheet::{get_cheat_titles, reload_cheat_sheet};

    #[test]
    fn json_not_found() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let result = get_cheat_titles("notfound.json");

        // エラーレスポンスであることを確認
        assert!(result.contains("\"success\":false"));
        assert!(result.contains("\"error\""));
        // ファイルが見つからないエラーメッセージを確認
        assert!(result.contains("見つかりません") || result.contains("No such file"));
    }

    #[test]
    fn json_invalid() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let result = get_cheat_titles("./tests/api/invalid.json");

        // エラーレスポンスであることを確認
        assert!(result.contains("\"success\":false"));
        assert!(result.contains("\"error\""));
        // JSONパースエラーメッセージを確認
        assert!(result.contains("パースに失敗"));
        // 行番号とカラム情報が含まれることを確認
        assert!(result.contains("line"));
        assert!(result.contains("column"));
    }

    #[test]
    fn json_found() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_titles("./tests/api/test-data.json"),
            "{\"title\": [\"Test1\",\"Test2\"]}"
        );
    }

    #[test]
    fn json_cache() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let _ = get_cheat_titles("./tests/api/test-data2.json");
        assert_eq!(
            get_cheat_titles("./tests/api/test-data.json"),
            "{\"title\": [\"Test\"]}"
        );
    }

    #[test]
    fn json_with_backslash_commands() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_titles("./tests/api/test-data-with-backslash.json"),
            "{\"title\": [\"MultilineCommands\"]}"
        );
    }
}

#[cfg(test)]
mod get_cheat_sheet_window_size {
    use app_lib::api::cheatsheet::{get_cheat_sheet_window_size, reload_cheat_sheet};
    use tauri::test::mock_app;

    // テストデータファイルパス（window_size フィールドを持つシートと持たないシートを含む）
    const TEST_DATA_PATH: &str = "./tests/api/test-data-with-window-size.json";

    // ブラックボックス：同値分割 - window_size フィールドが存在するシート（有効クラス①）
    // ホワイトボックス：cache.is_none() が true のブランチ → ファイルから読み込むパス
    //                   s.window_size が Some のブランチ → その値を返すパス
    #[test]
    fn returns_window_size_when_field_exists() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: window_size フィールド（600x900）を持つシートを指定
        // Act
        let result = get_cheat_sheet_window_size(TEST_DATA_PATH, "SheetWithWindowSize");

        // Assert: JSON に記載した値が Some として返ること
        assert!(result.is_ok());
        let window_size = result.unwrap();
        assert!(
            window_size.is_some(),
            "window_size が存在するシートは Some を返すこと"
        );
        let window_size = window_size.unwrap();
        assert_eq!(window_size.width, 600);
        assert_eq!(window_size.height, 900);
    }

    // ブラックボックス：同値分割 - window_size フィールドが存在しないシート（有効クラス②）
    // ホワイトボックス：s.window_size が None のブランチ → None を返すパス
    #[test]
    fn returns_none_when_window_size_field_missing() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: window_size フィールドを持たないシートを指定
        // Act
        let result = get_cheat_sheet_window_size(TEST_DATA_PATH, "SheetWithoutWindowSize");

        // Assert: None が返ること（デフォルト値ではなく未設定を表す）
        assert!(result.is_ok());
        assert!(
            result.unwrap().is_none(),
            "window_size が存在しないシートは None を返すこと"
        );
    }

    // ブラックボックス：同値分割 - キャッシュが存在する状態（有効クラス③）
    // ホワイトボックス：cache.is_none() が false のブランチ → キャッシュから読み込むパス
    #[test]
    fn returns_cached_window_size() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 最初の呼び出しでキャッシュを生成する
        let _ = get_cheat_sheet_window_size(TEST_DATA_PATH, "SheetWithWindowSize");

        // Act: 別パスを渡しても、キャッシュが使われるため同じ結果になる
        // （キャッシュが有効であることを確認するため、意図的に異なるパスを指定）
        let result =
            get_cheat_sheet_window_size("./tests/api/test-data.json", "SheetWithWindowSize");

        // Assert: キャッシュ（最初のファイルのデータ）が使われ、正しい値が返ること
        assert!(result.is_ok());
        let window_size = result.unwrap();
        assert!(window_size.is_some());
        let window_size = window_size.unwrap();
        assert_eq!(window_size.width, 600);
        assert_eq!(window_size.height, 900);
    }

    // ブラックボックス：無効クラス - 存在しないファイルパス
    // ホワイトボックス：read_json_from_file が Err を返すブランチ → Err を伝播するパス
    #[test]
    fn returns_err_for_nonexistent_file() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Act: 存在しないファイルを指定
        let result = get_cheat_sheet_window_size("./tests/api/notfound.json", "SomeSheet");

        // Assert: Err が返ること
        assert!(result.is_err());
    }

    // ブラックボックス：境界値分析 - 存在しないタイトルを指定した場合
    // ホワイトボックス：iter().find() で None → None を返すパス
    #[test]
    fn returns_none_for_unknown_title() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Act: 存在しないタイトルを指定
        let result = get_cheat_sheet_window_size(TEST_DATA_PATH, "NonExistentSheet");

        // Assert: エラーではなく None が返ること（チートシートが見つからない場合は未設定扱い）
        assert!(result.is_ok());
        assert!(
            result.unwrap().is_none(),
            "存在しないタイトルは None を返すこと"
        );
    }
}

#[cfg(test)]
mod save_cheat_sheet_window_size {
    use app_lib::api::cheatsheet::{
        get_cheat_sheet_window_size, reload_cheat_sheet, save_cheat_sheet_window_size, WindowSize,
    };
    use tauri::test::mock_app;

    // テストデータの元ファイルパス（読み取り専用として使用）
    const SOURCE_DATA_PATH: &str = "./tests/api/test-data-with-window-size.json";

    // ブラックボックス：同値分割 - 正常ケース（有効クラス①）
    // ホワイトボックス：全正常パス（ファイル読み込み → 更新 → 書き戻し → キャッシュ更新）
    #[test]
    fn saves_window_size_to_file() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成
        let temp_path = "./tests/api/temp-window-size-save-test-1.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: window_size を保存
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "SheetWithWindowSize",
            Some(WindowSize {
                width: 700,
                height: 1000,
            }),
        );

        // Assert: 保存が成功すること
        assert!(result.is_ok());

        // ファイルの内容を読み込んで検証
        // save後はキャッシュが更新されているため、get で結果を確認できる
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert!(window_size.is_some());
        let window_size = window_size.unwrap();
        assert_eq!(window_size.width, 700);
        assert_eq!(window_size.height, 1000);

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：境界値分析 - tauri.conf.json の min 未満の値を保存した場合
    // ホワイトボックス：clamp_to_min() が適用されるパス
    // ※ mock_app() では tauri.conf.json が読み込まれないため min=0 となり clamp は発生しない
    //   clamp 動作の直接検証は window_size_unit テストモジュールで行う
    #[test]
    fn saves_small_window_size_without_clamp_in_mock() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成
        let temp_path = "./tests/api/temp-window-size-save-test-2.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: mock_app では min=0 のため、小さな値はクランプされずそのまま保存される
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "SheetWithWindowSize",
            Some(WindowSize {
                width: 100,
                height: 100,
            }),
        );

        // Assert: 保存が成功すること
        assert!(result.is_ok());

        // mock_app では min=0 のため clamp されず 100, 100 のまま保存・取得される
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert!(window_size.is_some());
        let window_size = window_size.unwrap();
        assert_eq!(
            window_size.width, 100,
            "mock_app では clamp なしで 100 が保存されること"
        );
        assert_eq!(
            window_size.height, 100,
            "mock_app では clamp なしで 100 が保存されること"
        );

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：境界値分析 - 任意の境界値を指定した場合
    // ホワイトボックス：clamp_to_min() で変化しないパス（x.max(min) == x のケース）
    #[test]
    fn saves_and_retrieves_specified_values() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成
        let temp_path = "./tests/api/temp-window-size-save-test-3.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: 400x300 を指定
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "SheetWithWindowSize",
            Some(WindowSize {
                width: 400,
                height: 300,
            }),
        );

        // Assert: 指定値のまま保存されること
        assert!(result.is_ok());
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert!(window_size.is_some());
        let window_size = window_size.unwrap();
        assert_eq!(window_size.width, 400);
        assert_eq!(window_size.height, 300);

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：無効クラス - 存在しないタイトルへの保存
    // ホワイトボックス：sheets.iter_mut().find() で None → Err を返すブランチ
    #[test]
    fn returns_err_for_unknown_title() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成
        let temp_path = "./tests/api/temp-window-size-save-test-4.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: 存在しないタイトルに対して保存
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "NonExistentSheet",
            Some(WindowSize {
                width: 700,
                height: 1000,
            }),
        );

        // Assert: Err が返ること（エラーメッセージに指定タイトルが含まれること）
        assert!(result.is_err());
        let err_msg = result.unwrap_err();
        assert!(
            err_msg.contains("NonExistentSheet"),
            "エラーメッセージに対象タイトルが含まれること: {}",
            err_msg
        );

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：同値分割 - 上書き保存（既に window_size がある状態で再保存）
    // ホワイトボックス：sheet.window_size = Some(window_size) による既存値の上書きパス
    #[test]
    fn overwrites_existing_window_size() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成（SheetWithWindowSize は 600x900 で初期化済み）
        let temp_path = "./tests/api/temp-window-size-save-test-5.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: 既存の window_size (600x900) を 800x1100 に上書き
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "SheetWithWindowSize",
            Some(WindowSize {
                width: 800,
                height: 1100,
            }),
        );
        assert!(result.is_ok());

        // Assert: 新しい値に更新されていること
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert!(window_size.is_some());
        let window_size = window_size.unwrap();
        assert_eq!(
            window_size.width, 800,
            "上書き後の width が反映されていること"
        );
        assert_eq!(
            window_size.height, 1100,
            "上書き後の height が反映されていること"
        );

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：同値分割 - window_size が未設定のシートへ新規保存
    // ホワイトボックス：sheet.window_size が None → Some に設定されるパス
    #[test]
    fn saves_window_size_to_sheet_without_existing_window_size() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成（SheetWithoutWindowSize は window_size なし）
        let temp_path = "./tests/api/temp-window-size-save-test-6.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: window_size フィールドを持たないシートに対して初回保存
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "SheetWithoutWindowSize",
            Some(WindowSize {
                width: 550,
                height: 850,
            }),
        );
        assert!(result.is_ok());

        // Assert: 保存した値が反映されること（デフォルト値ではなく指定値）
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithoutWindowSize").expect("取得に失敗");
        assert!(window_size.is_some());
        let window_size = window_size.unwrap();
        assert_eq!(
            window_size.width, 550,
            "初回保存した width が反映されていること"
        );
        assert_eq!(
            window_size.height, 850,
            "初回保存した height が反映されていること"
        );

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：無効クラス - 存在しないファイルパスへの保存
    // ホワイトボックス：File::open が Err を返すブランチ
    #[test]
    fn returns_err_for_nonexistent_file() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Act: 存在しないファイルに対して保存
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            "./tests/api/notfound.json",
            "SomeSheet",
            Some(WindowSize {
                width: 700,
                height: 1000,
            }),
        );

        // Assert: Err が返ること
        assert!(result.is_err());
    }

    // ブラックボックス：同値分割 - None を保存してウィンドウサイズ設定を削除
    // ホワイトボックス：window_size が None → sheet.window_size = None に設定されるパス
    #[test]
    fn clears_window_size_when_none_is_saved() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成（SheetWithWindowSize は 600x900 で初期化済み）
        let temp_path = "./tests/api/temp-window-size-save-test-7.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: None を保存して window_size を削除
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            temp_path,
            "SheetWithWindowSize",
            None,
        );
        assert!(result.is_ok());

        // Assert: None が返ること（削除されていること）
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert!(
            window_size.is_none(),
            "None 保存後は window_size が削除されていること"
        );

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }
}

#[cfg(test)]
mod window_size_unit {
    use app_lib::api::cheatsheet::WindowSize;

    // ブラックボックス：同値分割 - 各値が min 未満の場合（無効クラス）
    // ホワイトボックス：clamp_to_min() の width.max(min_width) / height.max(min_height) のブランチ
    #[test]
    fn clamp_to_min_raises_values_below_minimum() {
        let ws = WindowSize {
            width: 100,
            height: 100,
        };
        let clamped = ws.clamp_to_min(400, 300);
        assert_eq!(
            clamped.width, 400,
            "width が min_width(400) にクランプされること"
        );
        assert_eq!(
            clamped.height, 300,
            "height が min_height(300) にクランプされること"
        );
    }

    // ブラックボックス：境界値分析 - 各値がちょうど min の場合
    // ホワイトボックス：x.max(min) == x のケース（境界値）
    #[test]
    fn clamp_to_min_keeps_values_at_minimum_boundary() {
        let ws = WindowSize {
            width: 400,
            height: 300,
        };
        let clamped = ws.clamp_to_min(400, 300);
        assert_eq!(clamped.width, 400);
        assert_eq!(clamped.height, 300);
    }

    // ブラックボックス：同値分割 - 各値が min より大きい場合（有効クラス）
    // ホワイトボックス：x.max(min) == x のケース（変化なし）
    #[test]
    fn clamp_to_min_does_not_change_values_above_minimum() {
        let ws = WindowSize {
            width: 600,
            height: 900,
        };
        let clamped = ws.clamp_to_min(400, 300);
        assert_eq!(clamped.width, 600);
        assert_eq!(clamped.height, 900);
    }

    // ブラックボックス：境界値分析 - min=0 の場合（クランプなし）
    // ホワイトボックス：min_width=0 かつ min_height=0 → 変化なし
    #[test]
    fn clamp_to_min_with_zero_minimum_does_not_change_values() {
        let ws = WindowSize {
            width: 1,
            height: 1,
        };
        let clamped = ws.clamp_to_min(0, 0);
        assert_eq!(clamped.width, 1);
        assert_eq!(clamped.height, 1);
    }
}

#[cfg(test)]
mod get_cheat_sheet {
    use tauri::test::mock_app;

    use app_lib::api::cheatsheet::{get_cheat_sheet, reload_cheat_sheet};

    #[test]
    fn json_not_found() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let result = get_cheat_sheet("notfound.json", "dummy");

        // エラーレスポンスであることを確認
        assert!(result.contains("\"success\":false"));
        assert!(result.contains("\"error\""));
        // ファイルが見つからないエラーメッセージを確認
        assert!(result.contains("見つかりません") || result.contains("No such file"));
    }

    #[test]
    fn json_invalid() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let result = get_cheat_sheet("./tests/api/invalid.json", "invalid");

        // エラーレスポンスであることを確認
        assert!(result.contains("\"success\":false"));
        assert!(result.contains("\"error\""));
        // JSONパースエラーメッセージを確認
        assert!(result.contains("パースに失敗"));
        // 行番号とカラム情報が含まれることを確認
        assert!(result.contains("line"));
        assert!(result.contains("column"));
    }

    #[test]
    fn json_found() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_sheet("./tests/api/test-data.json","Test1"),
            "{\"title\":\"Test1\",\"commandlist\":[{\"description\":\"Test Command1\",\"command\":\"command1\"},{\"description\":\"Test Command2\",\"command\":\"command2\"}]}"
        );

        assert_eq!(
            get_cheat_sheet("./tests/api/test-data.json","Test2"),
            "{\"title\":\"Test2\",\"commandlist\":[{\"description\":\"Test Command3\",\"command\":\"command3\"}]}"
        );
    }

    #[test]
    fn json_cache() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let _ = get_cheat_sheet("./tests/api/test-data2.json", "Test");
        assert_eq!(get_cheat_sheet("./tests/api/test-data.json", "Test1"), "{}");

        assert_eq!(
            get_cheat_sheet("./tests/api/test-data.json", "Test"),
            "{\"title\":\"Test\",\"commandlist\":[{\"description\":\"Test Command\",\"command\":\"command\"}]}"
        );
    }

    #[test]
    fn json_with_command_type() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_sheet("./tests/api/test-data-with-types.json", "Terraform"),
            "{\"type\":\"command\",\"title\":\"Terraform\",\"commandlist\":[{\"description\":\"planの実行\",\"command\":\"terraform plan\"},{\"description\":\"planの適用\",\"command\":\"terraform apply\"}]}"
        );
    }

    #[test]
    fn json_with_shortcut_type() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_sheet("./tests/api/test-data-with-types.json", "vi"),
            "{\"type\":\"shortcut\",\"title\":\"vi\",\"commandlist\":[{\"description\":\"診断エラーの修正\",\"command\":\"ca\"},{\"description\":\"診断エラーへ前移動\",\"command\":\"c[\"},{\"description\":\"診断エラーへ後移動\",\"command\":\"c]\"}]}"
        );
    }

    #[test]
    fn json_with_application_type() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_sheet("./tests/api/test-data-with-types.json", "Applications"),
            "{\"type\":\"application\",\"title\":\"Applications\",\"commandlist\":[{\"description\":\"Slack\",\"command\":\"open -a Slack\"},{\"description\":\"Google Chrome\",\"command\":\"open -a \\\"Google Chrome\\\"\"}]}"
        );
    }

    #[test]
    fn json_without_type_field() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // type フィールドが無い場合、JSON には type が含まれないことを確認
        assert_eq!(
            get_cheat_sheet("./tests/api/test-data.json", "Test1"),
            "{\"title\":\"Test1\",\"commandlist\":[{\"description\":\"Test Command1\",\"command\":\"command1\"},{\"description\":\"Test Command2\",\"command\":\"command2\"}]}"
        );
    }

    #[test]
    fn json_with_backslash_multiline() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let result = get_cheat_sheet(
            "./tests/api/test-data-with-backslash.json",
            "MultilineCommands",
        );

        // タイトルが正しいことを確認
        assert!(result.contains("\"title\":\"MultilineCommands\""));

        // 各コマンドの説明が含まれていることを確認
        assert!(result.contains("\"description\":\"複数行コマンド（改行あり）\""));
        assert!(result.contains("\"description\":\"エスケープされたバックスラッシュ\""));
        assert!(result.contains("\"description\":\"バックスラッシュと改行の混在\""));
        assert!(result.contains("\"description\":\"連続するバックスラッシュ\""));

        // 複数行コマンド (バックスラッシュ+改行がJSONでは\\nとしてエスケープされる)
        assert!(result.contains("git add .\\\\\\ngit commit -m 'message'\\\\\\ngit push"));
    }

    #[test]
    fn json_with_escaped_backslash() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let result = get_cheat_sheet(
            "./tests/api/test-data-with-backslash.json",
            "MultilineCommands",
        );

        // エスケープされたバックスラッシュ (JSONでは \\\\ が \\\\\\\\ になる)
        assert!(result.contains("echo C:\\\\\\\\Users\\\\\\\\name"));

        // バックスラッシュと改行の混在
        assert!(result.contains("line1\\\\\\n\\\\\\\\escaped\\\\\\nline3"));

        // 連続するバックスラッシュ (4つのバックスラッシュは8つにエスケープされる)
        assert!(result.contains("path\\\\\\\\\\\\\\\\to\\\\\\\\\\\\\\\\file"));
    }
}
