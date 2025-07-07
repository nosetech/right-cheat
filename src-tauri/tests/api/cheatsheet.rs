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
            get_cheat_titles("./tests/api/get_cheat_titles_test.json"),
            "{\"title\": [\"Test1\",\"Test2\"]}"
        );
    }

    #[test]
    fn json_cache() {
        let app = mock_app();
        let _ = reload_cheat_sheet(app.handle().clone());

        let _ = get_cheat_titles("./tests/api/get_cheat_titles_test2.json");
        assert_eq!(
            get_cheat_titles("./tests/api/get_cheat_titles_test.json"),
            "{\"title\": [\"Test\"]}"
        );
    }
}
