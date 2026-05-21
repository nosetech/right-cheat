use app_lib::api::cheatsheet::{CheatSheet, Command, CommandGroup, CommandItem, WindowSize};
use app_lib::db::repository::{
    delete_cheatsheet, get_all_titles, get_cheatsheet_by_title, get_window_size, insert_cheatsheet,
    insert_commandlist, save_window_size, search_by_fts, search_by_like, search_commands,
    title_exists, update_cheatsheet,
};
use app_lib::db::schema::apply_migrations;
use rusqlite::Connection;

fn setup() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
    apply_migrations(&conn).unwrap();
    conn
}

fn make_sheet(title: &str) -> CheatSheet {
    CheatSheet {
        sheet_type: None,
        title: title.to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![CommandItem::Single(Command {
            description: Some("desc".to_string()),
            command: "cmd".to_string(),
            layout: None,
        })],
    }
}

#[test]
fn insert_and_get_titles() {
    let conn = setup();
    let sheet = make_sheet("Sheet1");
    insert_cheatsheet(&conn, &sheet, 0).unwrap();

    let titles = get_all_titles(&conn).unwrap();
    assert_eq!(titles, vec!["Sheet1"]);
}

#[test]
fn get_cheatsheet_by_title_returns_none_for_unknown() {
    let conn = setup();
    let result = get_cheatsheet_by_title(&conn, "Unknown").unwrap();
    assert!(result.is_none());
}

#[test]
fn insert_and_retrieve_cheatsheet() {
    let conn = setup();
    let sheet = make_sheet("TestSheet");
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    let retrieved = get_cheatsheet_by_title(&conn, "TestSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.title, "TestSheet");
    assert_eq!(retrieved.commandlist.len(), 1);
}

#[test]
fn save_and_get_window_size() {
    let conn = setup();
    let sheet = make_sheet("WinSheet");
    insert_cheatsheet(&conn, &sheet, 0).unwrap();

    save_window_size(
        &conn,
        "WinSheet",
        Some(&WindowSize {
            width: 400,
            height: 300,
        }),
    )
    .unwrap();

    let ws = get_window_size(&conn, "WinSheet").unwrap().unwrap();
    assert_eq!(ws.width, 400);
    assert_eq!(ws.height, 300);
}

#[test]
fn save_window_size_none_clears_size() {
    let conn = setup();
    let sheet = make_sheet("WinSheet2");
    insert_cheatsheet(&conn, &sheet, 0).unwrap();

    save_window_size(
        &conn,
        "WinSheet2",
        Some(&WindowSize {
            width: 500,
            height: 600,
        }),
    )
    .unwrap();
    save_window_size(&conn, "WinSheet2", None).unwrap();

    let ws = get_window_size(&conn, "WinSheet2").unwrap();
    assert!(ws.is_none());
}

#[test]
fn save_window_size_returns_false_for_unknown_title() {
    let conn = setup();
    let updated = save_window_size(
        &conn,
        "NoSuchSheet",
        Some(&WindowSize {
            width: 100,
            height: 100,
        }),
    )
    .unwrap();
    assert!(!updated);
}

#[test]
fn title_exists_returns_correct_result() {
    let conn = setup();
    let sheet = make_sheet("ExistsSheet");
    insert_cheatsheet(&conn, &sheet, 0).unwrap();

    assert!(title_exists(&conn, "ExistsSheet").unwrap());
    assert!(!title_exists(&conn, "NoSuchSheet").unwrap());
}

#[test]
fn update_cheatsheet_modifies_commandlist() {
    let conn = setup();
    let sheet = make_sheet("UpdateSheet");
    insert_cheatsheet(&conn, &sheet, 0).unwrap();

    let updated = CheatSheet {
        sheet_type: None,
        title: "UpdateSheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Single(Command {
                description: Some("new desc".to_string()),
                command: "new cmd".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                description: None,
                command: "cmd2".to_string(),
                layout: None,
            }),
        ],
    };
    update_cheatsheet(&conn, &updated).unwrap();

    let retrieved = get_cheatsheet_by_title(&conn, "UpdateSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 2);
}

#[test]
fn delete_cheatsheet_removes_entry() {
    let conn = setup();
    let sheet = make_sheet("DeleteSheet");
    insert_cheatsheet(&conn, &sheet, 0).unwrap();
    delete_cheatsheet(&conn, "DeleteSheet").unwrap();

    let titles = get_all_titles(&conn).unwrap();
    assert!(!titles.contains(&"DeleteSheet".to_string()));
}

#[test]
fn group_commandlist_roundtrip() {
    let conn = setup();
    let sheet = CheatSheet {
        sheet_type: Some("shortcut".to_string()),
        title: "GroupSheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Single(Command {
                description: Some("single cmd".to_string()),
                command: "s".to_string(),
                layout: None,
            }),
            CommandItem::Group(CommandGroup {
                group: "Group1".to_string(),
                commandlist: vec![
                    Command {
                        description: Some("g1c1".to_string()),
                        command: "g1c1cmd".to_string(),
                        layout: None,
                    },
                    Command {
                        description: None,
                        command: "g1c2cmd".to_string(),
                        layout: None,
                    },
                ],
            }),
        ],
    };
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    let retrieved = get_cheatsheet_by_title(&conn, "GroupSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 2);

    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => assert_eq!(cmd.command, "s"),
        _ => panic!("最初の要素は Single のはず"),
    }
    match &retrieved.commandlist[1] {
        CommandItem::Group(g) => {
            assert_eq!(g.group, "Group1");
            assert_eq!(g.commandlist.len(), 2);
        }
        _ => panic!("2番目の要素は Group のはず"),
    }
}

#[test]
fn sort_order_is_preserved() {
    let conn = setup();
    let sheet1 = make_sheet("A");
    let sheet2 = make_sheet("B");
    let sheet3 = make_sheet("C");
    insert_cheatsheet(&conn, &sheet1, 10).unwrap();
    insert_cheatsheet(&conn, &sheet2, 5).unwrap();
    insert_cheatsheet(&conn, &sheet3, 20).unwrap();

    let titles = get_all_titles(&conn).unwrap();
    assert_eq!(titles, vec!["B", "A", "C"]);
}

// ── FTS5 検索テスト ──────────────────────────────────────

fn make_sheet_with_commands(
    title: &str,
    commands: &[(&str, &str)],
) -> (CheatSheet, Vec<CommandItem>) {
    let items: Vec<CommandItem> = commands
        .iter()
        .map(|(desc, cmd)| {
            CommandItem::Single(Command {
                description: Some(desc.to_string()),
                command: cmd.to_string(),
                layout: None,
            })
        })
        .collect();
    let sheet = CheatSheet {
        sheet_type: None,
        title: title.to_string(),
        window_size: None,
        layout: None,
        commandlist: items.clone(),
    };
    (sheet, items)
}

fn insert_sheet_with_commands(conn: &Connection, title: &str, commands: &[(&str, &str)]) {
    let (sheet, items) = make_sheet_with_commands(title, commands);
    let id = insert_cheatsheet(conn, &sheet, 0).unwrap();
    insert_commandlist(conn, id, &items).unwrap();
}

#[test]
fn fts_search_matches_3_or_more_chars() {
    let conn = setup();
    insert_sheet_with_commands(&conn, "Sheet1", &[("Git status check", "git status")]);

    // 3文字以上 → FTS MATCH を使用
    let results = search_by_fts(&conn, "status", 100).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].command_text, "git status");
    assert_eq!(results[0].cheatsheet_title, "Sheet1");
}

#[test]
fn like_search_matches_1_2_chars() {
    let conn = setup();
    insert_sheet_with_commands(&conn, "Sheet2", &[("List files", "ls")]);

    // 1〜2文字 → LIKE フォールバック
    let results = search_by_like(&conn, "ls", 100).unwrap();
    assert!(results.iter().any(|r| r.command_text == "ls"));
}

#[test]
fn search_commands_dispatches_by_length() {
    let conn = setup();
    insert_sheet_with_commands(&conn, "Sheet3", &[("describe docker", "docker ps")]);

    // 0文字 → 空配列
    let empty = search_commands(&conn, "", 100).unwrap();
    assert!(empty.is_empty());

    // 2文字 → LIKE
    let two = search_commands(&conn, "ps", 100).unwrap();
    assert!(two.iter().any(|r| r.command_text == "docker ps"));

    // 6文字 → FTS
    let six = search_commands(&conn, "docker", 100).unwrap();
    assert!(six.iter().any(|r| r.command_text == "docker ps"));
}

#[test]
fn fts_search_is_case_insensitive() {
    let conn = setup();
    insert_sheet_with_commands(&conn, "Sheet4", &[("Push branch", "git PUSH origin main")]);

    // 小文字で大文字混じりコマンドを検索
    let results = search_by_fts(&conn, "push", 100).unwrap();
    assert!(results
        .iter()
        .any(|r| r.command_text == "git PUSH origin main"));
}

#[test]
fn fts_search_japanese() {
    let conn = setup();
    insert_sheet_with_commands(
        &conn,
        "日本語シート",
        &[("日本語のコマンド説明", "echo 日本語")],
    );

    // 日本語の3文字部分一致
    let results = search_by_fts(&conn, "語のコ", 100).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].description, "日本語のコマンド説明");
}

#[test]
fn search_syncs_after_update_and_delete() {
    let conn = setup();
    insert_sheet_with_commands(
        &conn,
        "SyncSheet",
        &[("Original description", "original_cmd")],
    );

    // 初期状態で検索できる
    let before = search_by_fts(&conn, "original", 100).unwrap();
    assert_eq!(before.len(), 1);

    // update_cheatsheet で commandlist を置き換え → FTS が同期される
    let updated_sheet = CheatSheet {
        sheet_type: None,
        title: "SyncSheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![CommandItem::Single(Command {
            description: Some("Updated description".to_string()),
            command: "updated_cmd".to_string(),
            layout: None,
        })],
    };
    update_cheatsheet(&conn, &updated_sheet).unwrap();

    let after_update = search_by_fts(&conn, "updated", 100).unwrap();
    assert_eq!(after_update.len(), 1);
    assert_eq!(after_update[0].command_text, "updated_cmd");

    // 古いコマンドは検索されなくなる
    let old = search_by_fts(&conn, "original", 100).unwrap();
    assert!(old.is_empty());

    // delete_cheatsheet 後は検索結果が消える
    delete_cheatsheet(&conn, "SyncSheet").unwrap();
    let after_delete = search_by_fts(&conn, "updated", 100).unwrap();
    assert!(after_delete.is_empty());
}

#[test]
fn like_search_escapes_special_chars() {
    let conn = setup();
    insert_sheet_with_commands(
        &conn,
        "SpecialSheet",
        &[
            ("Wildcard percent", "echo 100%done"),
            ("Wildcard underscore", "echo file_name"),
        ],
    );

    // % はリテラルとして検索される（ワイルドカードにならない）
    let percent_results = search_by_like(&conn, "100%done", 100).unwrap();
    assert_eq!(percent_results.len(), 1);
    assert_eq!(percent_results[0].command_text, "echo 100%done");

    // _ もリテラルとして検索される
    let underscore_results = search_by_like(&conn, "file_name", 100).unwrap();
    assert_eq!(underscore_results.len(), 1);
    assert_eq!(underscore_results[0].command_text, "echo file_name");
}
