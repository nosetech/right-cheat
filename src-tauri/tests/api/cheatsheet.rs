#[cfg(test)]
mod get_cheat_titles {
    use tauri::test::mock_app;

    use app_lib::api::cheatsheet::{get_cheat_titles, reload_cheat_sheet};

    #[test]
    fn json_not_found() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(get_cheat_titles("notfound.json"), "{\"title\": []}");
    }

    #[test]
    fn json_invalid() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(
            get_cheat_titles("./tests/api/invalid.json"),
            "{\"title\": []}"
        );
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
}

#[cfg(test)]
mod get_cheat_sheet {
    use tauri::test::mock_app;

    use app_lib::api::cheatsheet::{get_cheat_sheet, reload_cheat_sheet};

    #[test]
    fn json_not_found() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(get_cheat_sheet("notfound.json", "dummy"), "{}");
    }

    #[test]
    fn json_invalid() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        assert_eq!(get_cheat_sheet("./tests/api/invalid.json", "invalid"), "{}");
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
}
