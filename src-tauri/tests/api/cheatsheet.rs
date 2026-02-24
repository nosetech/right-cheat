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
    //                   s.window_size が Some のブランチ → clamp_to_min() を適用して返すパス
    #[test]
    fn returns_window_size_when_field_exists() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: window_size フィールド（600x900）を持つシートを指定
        // Act
        let result = get_cheat_sheet_window_size(TEST_DATA_PATH, "SheetWithWindowSize");

        // Assert: JSON に記載した値がそのまま返ること（いずれも MIN 以上なので clamp 不要）
        assert!(result.is_ok());
        let window_size = result.unwrap();
        assert_eq!(window_size.width, 600);
        assert_eq!(window_size.height, 900);
    }

    // ブラックボックス：同値分割 - window_size フィールドが存在しないシート（有効クラス②）
    // ホワイトボックス：s.window_size が None のブランチ → unwrap_or_default() でデフォルトを返すパス
    #[test]
    fn returns_default_when_window_size_field_missing() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: window_size フィールドを持たないシートを指定
        // Act
        let result = get_cheat_sheet_window_size(TEST_DATA_PATH, "SheetWithoutWindowSize");

        // Assert: デフォルト値（width=500, height=800）が返ること
        assert!(result.is_ok());
        let window_size = result.unwrap();
        assert_eq!(window_size.width, 500);
        assert_eq!(window_size.height, 800);
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

    // ブラックボックス：境界値分析 - window_size の各値が MIN_WINDOW_WIDTH(400) / MIN_WINDOW_HEIGHT(300) 未満
    // ホワイトボックス：clamp_to_min() の width.max(MIN_WINDOW_WIDTH) / height.max(MIN_WINDOW_HEIGHT) のブランチ
    // このテストは save_cheat_sheet_window_size でファイルに書いた小さな値を get で読み戻すことで確認する
    // （直接テストするには save 経由でデータを用意する必要があるため、clamp の直接検証は WindowSize 単体テストで行う）

    // ブラックボックス：境界値分析 - 存在しないタイトルを指定した場合
    // ホワイトボックス：iter().find() で None → unwrap_or_default() → デフォルト値を返すパス
    #[test]
    fn returns_default_for_unknown_title() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Act: 存在しないタイトルを指定
        let result = get_cheat_sheet_window_size(TEST_DATA_PATH, "NonExistentSheet");

        // Assert: エラーではなくデフォルト値（500x800）が返ること
        // （チートシートが見つからない場合は None → unwrap_or_default）
        assert!(result.is_ok());
        let window_size = result.unwrap();
        assert_eq!(window_size.width, 500);
        assert_eq!(window_size.height, 800);
    }
}

#[cfg(test)]
mod save_cheat_sheet_window_size {
    use app_lib::api::cheatsheet::{
        get_cheat_sheet_window_size, reload_cheat_sheet, save_cheat_sheet_window_size,
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
        let result = save_cheat_sheet_window_size(temp_path, "SheetWithWindowSize", 700, 1000);

        // Assert: 保存が成功すること
        assert!(result.is_ok());

        // ファイルの内容を読み込んで検証
        // save後はキャッシュが更新されているため、get で結果を確認できる
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert_eq!(window_size.width, 700);
        assert_eq!(window_size.height, 1000);

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：境界値分析 - MIN_WINDOW_WIDTH(400) / MIN_WINDOW_HEIGHT(300) 未満の値
    // ホワイトボックス：clamp_to_min() が適用されて最小値に切り上げられるパス
    #[test]
    fn clamps_values_below_minimum() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成
        let temp_path = "./tests/api/temp-window-size-save-test-2.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: MIN_WINDOW_WIDTH(400) と MIN_WINDOW_HEIGHT(300) を大きく下回る値を指定
        // 同値分割：無効クラス（MIN未満）の代表値として 100, 100 を使用
        let result = save_cheat_sheet_window_size(temp_path, "SheetWithWindowSize", 100, 100);

        // Assert: 保存自体は成功（clamp して保存）
        assert!(result.is_ok());

        // get で読み取り、clamp された値（width=400, height=300）が返ること
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
        assert_eq!(
            window_size.width, 400,
            "width が MIN_WINDOW_WIDTH(400) にクランプされること"
        );
        assert_eq!(
            window_size.height, 300,
            "height が MIN_WINDOW_HEIGHT(300) にクランプされること"
        );

        // Cleanup
        std::fs::remove_file(temp_path).expect("一時ファイルの削除に失敗");
    }

    // ブラックボックス：境界値分析 - MIN_WINDOW_WIDTH(400) / MIN_WINDOW_HEIGHT(300) ちょうどの値
    // ホワイトボックス：clamp_to_min() で変化しないパス（x.max(MIN) == x のケース）
    #[test]
    fn does_not_clamp_values_at_minimum_boundary() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        // Arrange: 一時ファイルを作成
        let temp_path = "./tests/api/temp-window-size-save-test-3.json";
        std::fs::copy(SOURCE_DATA_PATH, temp_path).expect("一時ファイルのコピーに失敗");

        // Act: ちょうど最小値（400x300）を指定
        let result = save_cheat_sheet_window_size(temp_path, "SheetWithWindowSize", 400, 300);

        // Assert: clamp されず、指定値のまま保存されること
        assert!(result.is_ok());
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
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
        let result = save_cheat_sheet_window_size(temp_path, "NonExistentSheet", 700, 1000);

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
        let result = save_cheat_sheet_window_size(temp_path, "SheetWithWindowSize", 800, 1100);
        assert!(result.is_ok());

        // Assert: 新しい値に更新されていること
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithWindowSize").expect("取得に失敗");
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
        let result = save_cheat_sheet_window_size(temp_path, "SheetWithoutWindowSize", 550, 850);
        assert!(result.is_ok());

        // Assert: 保存した値が反映されること（デフォルト値ではなく指定値）
        let window_size =
            get_cheat_sheet_window_size(temp_path, "SheetWithoutWindowSize").expect("取得に失敗");
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
        let result =
            save_cheat_sheet_window_size("./tests/api/notfound.json", "SomeSheet", 700, 1000);

        // Assert: Err が返ること
        assert!(result.is_err());
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
