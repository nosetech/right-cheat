use app_lib::api::cheatsheet::{
    get_cheat_sheet, get_cheat_sheet_window_size, get_cheat_titles, import_from_json,
    list_cheat_sheet_summaries, reload_cheat_sheet, save_cheat_sheet_window_size,
    update_cheat_sheets, CheatSheet, CheatSheetUpdate, Command, CommandGroup, CommandItem,
    ConflictResolution, WindowSize,
};
use app_lib::db::{schema, DbConnection};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

fn setup_mock_app_with_db() -> tauri::App<tauri::test::MockRuntime> {
    let app = tauri::test::mock_app();
    let conn = Connection::open_in_memory().expect("in-memory DB の作成に失敗");
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    schema::apply_migrations(&conn).unwrap();
    app.manage(DbConnection(Mutex::new(conn)));
    app
}

fn insert_test_data(conn: &Connection) {
    use app_lib::db::repository::{insert_cheatsheet, insert_commandlist};

    let sheet1 = CheatSheet {
        sheet_type: None,
        title: "Test1".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Single(Command {
                description: Some("Test Command1".to_string()),
                command: "command1".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                description: Some("Test Command2".to_string()),
                command: "command2".to_string(),
                layout: None,
            }),
        ],
    };
    let sheet2 = CheatSheet {
        sheet_type: None,
        title: "Test2".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![CommandItem::Single(Command {
            description: Some("Test Command3".to_string()),
            command: "command3".to_string(),
            layout: None,
        })],
    };

    let id1 = insert_cheatsheet(conn, &sheet1, 0).unwrap();
    insert_commandlist(conn, id1, &sheet1.commandlist).unwrap();
    let id2 = insert_cheatsheet(conn, &sheet2, 1).unwrap();
    insert_commandlist(conn, id2, &sheet2.commandlist).unwrap();
}

#[cfg(test)]
mod get_cheat_titles {
    use super::*;

    #[test]
    fn empty_db_returns_empty_title_list() {
        let app = setup_mock_app_with_db();
        let result = get_cheat_titles(app.handle().clone());
        assert_eq!(result, r#"{"title":[]}"#);
    }

    #[test]
    fn returns_titles_from_db() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_test_data(&conn);
        }
        let result = get_cheat_titles(app.handle().clone());
        assert!(result.contains("\"Test1\""));
        assert!(result.contains("\"Test2\""));
    }

    #[test]
    fn reload_clears_event_and_returns_success() {
        let app = setup_mock_app_with_db();
        let result = reload_cheat_sheet(app.handle().clone());
        assert!(result.contains("status"));
    }
}

#[cfg(test)]
mod get_cheat_sheet {
    use super::*;

    #[test]
    fn returns_empty_for_unknown_title() {
        let app = setup_mock_app_with_db();
        let result = get_cheat_sheet(app.handle().clone(), "Unknown");
        assert_eq!(result, "{}");
    }

    #[test]
    fn returns_cheatsheet_from_db() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_test_data(&conn);
        }
        let result = get_cheat_sheet(app.handle().clone(), "Test1");
        assert!(result.contains("\"title\":\"Test1\""));
        assert!(result.contains("command1"));
        assert!(result.contains("command2"));
    }

    #[test]
    fn returns_correct_commandlist() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_test_data(&conn);
        }
        let result = get_cheat_sheet(app.handle().clone(), "Test2");
        assert!(result.contains("command3"));
        assert!(!result.contains("command1"));
    }

    #[test]
    fn returns_sheet_with_type() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            use app_lib::db::repository::{insert_cheatsheet, insert_commandlist};
            let sheet = CheatSheet {
                sheet_type: Some("command".to_string()),
                title: "TypedSheet".to_string(),
                window_size: None,
                layout: None,
                commandlist: vec![CommandItem::Single(Command {
                    description: Some("cmd".to_string()),
                    command: "do something".to_string(),
                    layout: None,
                })],
            };
            let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
            insert_commandlist(&conn, id, &sheet.commandlist).unwrap();
        }
        let result = get_cheat_sheet(app.handle().clone(), "TypedSheet");
        assert!(result.contains("\"type\":\"command\""));
    }

    #[test]
    fn returns_sheet_with_group() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            use app_lib::db::repository::{insert_cheatsheet, insert_commandlist};
            let sheet = CheatSheet {
                sheet_type: None,
                title: "GroupSheet".to_string(),
                window_size: None,
                layout: None,
                commandlist: vec![CommandItem::Group(CommandGroup {
                    group: "グループ1".to_string(),
                    commandlist: vec![Command {
                        description: Some("g1".to_string()),
                        command: "g1cmd".to_string(),
                        layout: None,
                    }],
                })],
            };
            let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
            insert_commandlist(&conn, id, &sheet.commandlist).unwrap();
        }
        let result = get_cheat_sheet(app.handle().clone(), "GroupSheet");
        assert!(result.contains("\"group\":\"グループ1\""));
    }
}

#[cfg(test)]
mod get_cheat_sheet_window_size {
    use super::*;

    #[test]
    fn returns_none_when_no_window_size() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_test_data(&conn);
        }
        let result = get_cheat_sheet_window_size(app.handle().clone(), "Test1");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn returns_none_for_unknown_title() {
        let app = setup_mock_app_with_db();
        let result = get_cheat_sheet_window_size(app.handle().clone(), "Unknown");
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn returns_window_size_when_set() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            use app_lib::db::repository::{
                insert_cheatsheet, insert_commandlist, save_window_size,
            };
            let sheet = CheatSheet {
                sheet_type: None,
                title: "WinSheet".to_string(),
                window_size: Some(WindowSize {
                    width: 600,
                    height: 900,
                }),
                layout: None,
                commandlist: vec![],
            };
            let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
            insert_commandlist(&conn, id, &[]).unwrap();
            save_window_size(
                &conn,
                "WinSheet",
                Some(&WindowSize {
                    width: 600,
                    height: 900,
                }),
            )
            .unwrap();
        }
        let result = get_cheat_sheet_window_size(app.handle().clone(), "WinSheet").unwrap();
        assert!(result.is_some());
        let ws = result.unwrap();
        assert_eq!(ws.width, 600);
        assert_eq!(ws.height, 900);
    }
}

#[cfg(test)]
mod save_cheat_sheet_window_size {
    use super::*;

    #[test]
    fn saves_window_size() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_test_data(&conn);
        }
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            "Test1",
            Some(WindowSize {
                width: 700,
                height: 500,
            }),
        );
        assert!(result.is_ok());

        let ws_result = get_cheat_sheet_window_size(app.handle().clone(), "Test1");
        assert!(ws_result.is_ok());
        let ws = ws_result.unwrap().unwrap();
        assert_eq!(ws.width, 700);
        assert_eq!(ws.height, 500);
    }

    #[test]
    fn clears_window_size_when_none() {
        let app = setup_mock_app_with_db();
        {
            let state = app.state::<DbConnection>();
            let conn = state.0.lock().unwrap();
            insert_test_data(&conn);
            use app_lib::db::repository::save_window_size;
            save_window_size(
                &conn,
                "Test1",
                Some(&WindowSize {
                    width: 400,
                    height: 300,
                }),
            )
            .unwrap();
        }
        let result = save_cheat_sheet_window_size(app.handle().clone(), "Test1", None);
        assert!(result.is_ok());

        let ws = get_cheat_sheet_window_size(app.handle().clone(), "Test1").unwrap();
        assert!(ws.is_none());
    }

    #[test]
    fn returns_err_for_unknown_title() {
        let app = setup_mock_app_with_db();
        let result = save_cheat_sheet_window_size(
            app.handle().clone(),
            "NonExistent",
            Some(WindowSize {
                width: 400,
                height: 300,
            }),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("NonExistent"));
    }
}

#[cfg(test)]
mod import_from_json {
    use super::*;

    #[test]
    fn imports_from_valid_json_file() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_ok());
        let summary = result.unwrap();
        assert_eq!(summary.added, 2);
        assert_eq!(summary.updated, 0);
        assert_eq!(summary.skipped, 0);

        let titles_result = get_cheat_titles(app.handle().clone());
        assert!(titles_result.contains("\"Test1\""));
        assert!(titles_result.contains("\"Test2\""));
    }

    #[test]
    fn returns_err_for_missing_file() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/notfound.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_err());
    }

    #[test]
    fn returns_err_for_invalid_json() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/invalid.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_err());
    }

    #[test]
    fn skip_on_conflict() {
        let app = setup_mock_app_with_db();
        import_from_json(
            app.handle().clone(),
            "./tests/api/test-data.json".to_string(),
            ConflictResolution::Skip,
        )
        .unwrap();

        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data.json".to_string(),
            ConflictResolution::Skip,
        )
        .unwrap();
        assert_eq!(result.added, 0);
        assert_eq!(result.skipped, 2);
    }

    #[test]
    fn overwrite_on_conflict() {
        let app = setup_mock_app_with_db();
        import_from_json(
            app.handle().clone(),
            "./tests/api/test-data.json".to_string(),
            ConflictResolution::Skip,
        )
        .unwrap();

        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data.json".to_string(),
            ConflictResolution::Overwrite,
        )
        .unwrap();
        assert_eq!(result.added, 0);
        assert_eq!(result.updated, 2);
        assert_eq!(result.skipped, 0);
    }

    #[test]
    fn imports_json_with_group() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data-with-group.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_ok());
        let summary = result.unwrap();
        assert_eq!(summary.added, 2);

        let sheet = get_cheat_sheet(app.handle().clone(), "ShortcutWithGroup");
        assert!(sheet.contains("\"group\""));
    }

    #[test]
    fn imports_json_with_types() {
        let app = setup_mock_app_with_db();
        import_from_json(
            app.handle().clone(),
            "./tests/api/test-data-with-types.json".to_string(),
            ConflictResolution::Skip,
        )
        .unwrap();

        let sheet = get_cheat_sheet(app.handle().clone(), "Terraform");
        assert!(sheet.contains("\"type\":\"command\""));
    }

    #[test]
    fn imports_json_with_window_size() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data-with-window-size.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_ok());
        let summary = result.unwrap();
        assert_eq!(summary.added, 2);

        let ws = get_cheat_sheet_window_size(app.handle().clone(), "SheetWithWindowSize")
            .unwrap()
            .unwrap();
        assert_eq!(ws.width, 600);
        assert_eq!(ws.height, 900);

        let no_ws =
            get_cheat_sheet_window_size(app.handle().clone(), "SheetWithoutWindowSize").unwrap();
        assert!(no_ws.is_none());
    }

    #[test]
    fn imports_single_sheet_json() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data2.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().added, 1);

        let sheet = get_cheat_sheet(app.handle().clone(), "Test");
        assert!(sheet.contains("\"title\":\"Test\""));
    }

    #[test]
    fn imports_json_with_backslash_commands() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data-with-backslash.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().added, 1);

        let sheet = get_cheat_sheet(app.handle().clone(), "MultilineCommands");
        assert!(sheet.contains("\"title\":\"MultilineCommands\""));
        assert!(sheet.contains("commandlist"));
    }

    #[test]
    fn imports_json_with_layout() {
        let app = setup_mock_app_with_db();
        let result = import_from_json(
            app.handle().clone(),
            "./tests/api/test-data-with-layout.json".to_string(),
            ConflictResolution::Skip,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().added, 2);

        let sheet = get_cheat_sheet(app.handle().clone(), "SheetWithLayout");
        assert!(sheet.contains("\"layout\":\"stacked\""));
        assert!(sheet.contains("\"layout\":\"command_only\""));

        let sheet_no_layout = get_cheat_sheet(app.handle().clone(), "SheetWithoutLayout");
        assert!(sheet_no_layout.contains("\"title\":\"SheetWithoutLayout\""));
    }
}

#[cfg(test)]
mod window_size_unit {
    use super::*;

    #[test]
    fn clamp_to_min_raises_values_below_minimum() {
        let ws = WindowSize {
            width: 100,
            height: 100,
        };
        let clamped = ws.clamp_to_min(400, 300);
        assert_eq!(clamped.width, 400);
        assert_eq!(clamped.height, 300);
    }

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
mod list_cheat_sheet_summaries_tests {
    use super::*;

    #[test]
    fn returns_summaries_sorted_by_sort_order() {
        let app = setup_mock_app_with_db();
        insert_test_data(&*app.state::<DbConnection>().0.lock().unwrap());

        let result = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].title, "Test1");
        assert_eq!(result[1].title, "Test2");
        assert_eq!(result[0].sort_order, 0);
        assert_eq!(result[1].sort_order, 1);
    }

    #[test]
    fn includes_command_count() {
        let app = setup_mock_app_with_db();
        insert_test_data(&*app.state::<DbConnection>().0.lock().unwrap());

        let result = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");

        let sheet1 = result.iter().find(|s| s.title == "Test1").unwrap();
        let sheet2 = result.iter().find(|s| s.title == "Test2").unwrap();
        assert_eq!(sheet1.command_count, 2);
        assert_eq!(sheet2.command_count, 1);
    }

    #[test]
    fn returns_empty_when_no_sheets() {
        let app = setup_mock_app_with_db();

        let result = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");

        assert!(result.is_empty());
    }
}

#[cfg(test)]
mod update_cheat_sheets_tests {
    use super::*;

    #[test]
    fn renames_and_reorders_sheets() {
        let app = setup_mock_app_with_db();
        insert_test_data(&*app.state::<DbConnection>().0.lock().unwrap());

        let summaries = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        let id1 = summaries[0].id;
        let id2 = summaries[1].id;

        let updates = vec![
            CheatSheetUpdate {
                id: Some(id2),
                title: "Test2-Renamed".to_string(),
                sort_order: 0,
                sheet_type: None,
                layout: None,
            },
            CheatSheetUpdate {
                id: Some(id1),
                title: "Test1-Renamed".to_string(),
                sort_order: 1,
                sheet_type: None,
                layout: None,
            },
        ];

        update_cheat_sheets(app.handle().clone(), updates).expect("should succeed");

        let titles_result =
            list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        assert_eq!(titles_result[0].title, "Test2-Renamed");
        assert_eq!(titles_result[1].title, "Test1-Renamed");
    }

    #[test]
    fn adds_new_sheet_when_id_is_none() {
        let app = setup_mock_app_with_db();
        insert_test_data(&*app.state::<DbConnection>().0.lock().unwrap());

        let summaries = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        let id1 = summaries[0].id;
        let id2 = summaries[1].id;

        let updates = vec![
            CheatSheetUpdate {
                id: Some(id1),
                title: "Test1".to_string(),
                sort_order: 0,
                sheet_type: None,
                layout: None,
            },
            CheatSheetUpdate {
                id: Some(id2),
                title: "Test2".to_string(),
                sort_order: 1,
                sheet_type: None,
                layout: None,
            },
            CheatSheetUpdate {
                id: None,
                title: "NewSheet".to_string(),
                sort_order: 2,
                sheet_type: Some("command".to_string()),
                layout: Some("inline".to_string()),
            },
        ];

        update_cheat_sheets(app.handle().clone(), updates).expect("should succeed");

        let result = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        assert_eq!(result.len(), 3);
        assert!(result.iter().any(|s| s.title == "NewSheet"));
    }

    #[test]
    fn deletes_sheet_not_in_updates() {
        let app = setup_mock_app_with_db();
        insert_test_data(&*app.state::<DbConnection>().0.lock().unwrap());

        let summaries = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        let id1 = summaries[0].id;

        let updates = vec![CheatSheetUpdate {
            id: Some(id1),
            title: "Test1".to_string(),
            sort_order: 0,
            sheet_type: None,
            layout: None,
        }];

        update_cheat_sheets(app.handle().clone(), updates).expect("should succeed");

        let result = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].title, "Test1");
    }

    #[test]
    fn returns_error_for_empty_title() {
        let app = setup_mock_app_with_db();

        let updates = vec![CheatSheetUpdate {
            id: None,
            title: "".to_string(),
            sort_order: 0,
            sheet_type: None,
            layout: None,
        }];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_err());
    }

    #[test]
    fn returns_error_for_whitespace_only_title() {
        let app = setup_mock_app_with_db();

        let updates = vec![CheatSheetUpdate {
            id: None,
            title: "   ".to_string(),
            sort_order: 0,
            sheet_type: None,
            layout: None,
        }];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_err());
    }

    #[test]
    fn returns_error_for_title_exceeding_max_length() {
        let app = setup_mock_app_with_db();

        let updates = vec![CheatSheetUpdate {
            id: None,
            title: "a".repeat(101),
            sort_order: 0,
            sheet_type: None,
            layout: None,
        }];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_err());
    }

    #[test]
    fn returns_error_for_duplicate_titles() {
        let app = setup_mock_app_with_db();

        let updates = vec![
            CheatSheetUpdate {
                id: None,
                title: "SameTitle".to_string(),
                sort_order: 0,
                sheet_type: None,
                layout: None,
            },
            CheatSheetUpdate {
                id: None,
                title: "SameTitle".to_string(),
                sort_order: 1,
                sheet_type: None,
                layout: None,
            },
        ];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_err());
    }

    #[test]
    fn title_length_at_max_boundary_succeeds() {
        let app = setup_mock_app_with_db();

        let updates = vec![CheatSheetUpdate {
            id: None,
            title: "a".repeat(100),
            sort_order: 0,
            sheet_type: Some("command".to_string()),
            layout: None,
        }];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_ok());
    }

    #[test]
    fn multibyte_title_100_chars_succeeds() {
        let app = setup_mock_app_with_db();
        // 100 Japanese characters = 300 bytes; must be accepted
        let updates = vec![CheatSheetUpdate {
            id: None,
            title: "あ".repeat(100),
            sort_order: 0,
            sheet_type: None,
            layout: None,
        }];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_ok());
    }

    #[test]
    fn multibyte_title_101_chars_fails() {
        let app = setup_mock_app_with_db();
        // 101 Japanese characters = 303 bytes; must be rejected
        let updates = vec![CheatSheetUpdate {
            id: None,
            title: "あ".repeat(101),
            sort_order: 0,
            sheet_type: None,
            layout: None,
        }];

        let result = update_cheat_sheets(app.handle().clone(), updates);
        assert!(result.is_err());
    }

    #[test]
    fn preserves_commands_when_updating_existing_sheet() {
        let app = setup_mock_app_with_db();
        insert_test_data(&*app.state::<DbConnection>().0.lock().unwrap());

        let summaries = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        let id1 = summaries[0].id;
        let id2 = summaries[1].id;

        let updates = vec![
            CheatSheetUpdate {
                id: Some(id1),
                title: "Test1-Renamed".to_string(),
                sort_order: 0,
                sheet_type: Some("shortcut".to_string()),
                layout: Some("stacked".to_string()),
            },
            CheatSheetUpdate {
                id: Some(id2),
                title: "Test2".to_string(),
                sort_order: 1,
                sheet_type: None,
                layout: None,
            },
        ];

        update_cheat_sheets(app.handle().clone(), updates).expect("should succeed");

        let result = list_cheat_sheet_summaries(app.handle().clone()).expect("should succeed");
        let sheet1 = result.iter().find(|s| s.title == "Test1-Renamed").unwrap();
        assert_eq!(sheet1.command_count, 2, "commands should be preserved");
        assert_eq!(sheet1.sheet_type, Some("shortcut".to_string()));
        assert_eq!(sheet1.layout, Some("stacked".to_string()));
    }
}
