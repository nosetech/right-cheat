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
