use app_lib::api::cheatsheet::{CheatSheet, Command, CommandGroup, CommandItem, WindowSize};
use app_lib::db::repository::{
    add_command_row, add_group_row, delete_cheatsheet, delete_command_row, delete_group_row,
    get_all_titles, get_cheatsheet_by_title, get_cheatsheet_id_by_title,
    get_max_command_in_group_sort_order, get_max_toplevel_sort_order, get_window_size,
    insert_cheatsheet, insert_commandlist, replace_commandlist_by_title, save_window_size,
    search_by_fts, search_by_like, search_commands, title_exists, update_cheatsheet,
    update_command_row, update_group_row,
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
            id: None,
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
                id: None,
                description: Some("new desc".to_string()),
                command: "new cmd".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                id: None,
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
                id: None,
                description: Some("single cmd".to_string()),
                command: "s".to_string(),
                layout: None,
            }),
            CommandItem::Group(CommandGroup {
                id: None,
                group: "Group1".to_string(),
                commandlist: vec![
                    Command {
                        id: None,
                        description: Some("g1c1".to_string()),
                        command: "g1c1cmd".to_string(),
                        layout: None,
                    },
                    Command {
                        id: None,
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
                id: None,
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
            id: None,
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

#[test]
fn fts_search_multi_keyword_and() {
    let conn = setup();
    insert_sheet_with_commands(
        &conn,
        "MultiSheet",
        &[
            ("Commit changes", "git commit message"),
            ("Show status", "git status"),
        ],
    );

    // すべての語が3文字以上 → FTS。"git" AND "commit" の両方を含むコマンドのみヒット
    let results = search_commands(&conn, "git commit", 100).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].command_text, "git commit message");

    // 語順を入れ替えても結果は同じ（AND 検索）
    let reversed = search_commands(&conn, "commit git", 100).unwrap();
    assert_eq!(reversed.len(), 1);
    assert_eq!(reversed[0].command_text, "git commit message");
}

#[test]
fn fts_search_multi_keyword_across_columns() {
    let conn = setup();
    insert_sheet_with_commands(
        &conn,
        "CrossSheet",
        &[("Push branch to remote", "git push origin")],
    );

    // 一方は description、もう一方は command_text に含まれる場合もヒットする
    let results = search_commands(&conn, "branch origin", 100).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].command_text, "git push origin");
}

#[test]
fn fts_search_multi_keyword_no_match_when_one_term_absent() {
    let conn = setup();
    insert_sheet_with_commands(&conn, "AbsentSheet", &[("Commit changes", "git commit")]);

    // 片方の語が存在しなければ AND 条件によりヒットしない
    let results = search_commands(&conn, "git deploy", 100).unwrap();
    assert!(results.is_empty());
}

#[test]
fn like_search_multi_keyword_and_with_short_term() {
    let conn = setup();
    insert_sheet_with_commands(
        &conn,
        "ShortSheet",
        &[
            ("List directory", "ls config"),
            ("List all files", "ls -la"),
        ],
    );

    // 2文字の語を含むため LIKE フォールバック。"ls" AND "config" の両方を含むもののみ
    let results = search_commands(&conn, "ls config", 100).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].command_text, "ls config");
}

#[test]
fn search_commands_whitespace_only_returns_empty() {
    let conn = setup();
    insert_sheet_with_commands(&conn, "WsSheet", &[("desc", "some command")]);

    // 空白のみのクエリは検索語なしとみなして空配列を返す
    let results = search_commands(&conn, "   ", 100).unwrap();
    assert!(results.is_empty());
}

// ── 新規 CRUD API テスト ─────────────────────────────────────
//
// テスト対象: 以下の新規 repository.rs 関数
//   - get_cheatsheet_id_by_title
//   - get_max_toplevel_sort_order
//   - get_max_command_in_group_sort_order
//   - add_command_row
//   - update_command_row
//   - delete_command_row
//   - add_group_row
//   - update_group_row
//   - delete_group_row
//   - replace_commandlist_by_title
//
// ブラックボックス テスト設計:
//   [同値分割]
//     有効クラス①: 存在するタイトル/ID で操作 → 成功
//     有効クラス②: 存在しないタイトル/ID で操作 → None または Ok(())
//     有効クラス③: グループ内コマンド vs トップレベルコマンド
//     有効クラス④: description/layout が Some の場合 vs None の場合
//   [境界値分析]
//     sort_order = 0（最小値）/ 正の値（内部値）
//     空コマンドリストでの replace_commandlist_by_title
//     グループ内コマンド 0 件時の get_max_command_in_group_sort_order → -1
//     cheatsheet 内アイテム 0 件時の get_max_toplevel_sort_order → -1
//
// ホワイトボックス テスト設計:
//   - get_max_toplevel_sort_order: コマンドのみ/グループのみ/混在の3分岐
//   - delete_group_row: FOREIGN KEY CASCADE によるコマンドの自動削除パス
//   - replace_commandlist_by_title: 存在しないタイトルのロールバックパス
//   - update_command_row: 存在しない ID への更新 → エラーなし (Ok)

// ── get_cheatsheet_id_by_title ────────────────────────────────

#[test]
fn get_cheatsheet_id_by_title_returns_id_for_existing_title() {
    // Arrange: チートシートを1件登録
    let conn = setup();
    let sheet = make_sheet("IdSheet");
    let inserted_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act
    let result = get_cheatsheet_id_by_title(&conn, "IdSheet").unwrap();

    // Assert: 挿入時の rowid と一致すること
    assert_eq!(result, Some(inserted_id));
}

#[test]
fn get_cheatsheet_id_by_title_returns_none_for_unknown_title() {
    // Arrange: DB は空
    let conn = setup();

    // Act
    let result = get_cheatsheet_id_by_title(&conn, "DoesNotExist").unwrap();

    // Assert: None を返すこと
    assert!(result.is_none());
}

// ── get_max_toplevel_sort_order ───────────────────────────────

#[test]
fn get_max_toplevel_sort_order_returns_minus_one_when_empty() {
    // Arrange: チートシートはあるがコマンド/グループが一切ない
    let conn = setup();
    let sheet = make_sheet("EmptySheet");
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act
    let max = get_max_toplevel_sort_order(&conn, id).unwrap();

    // Assert: アイテムなし → -1
    assert_eq!(max, -1);
}

#[test]
fn get_max_toplevel_sort_order_returns_max_from_commands_only() {
    // Arrange: トップレベルコマンドのみ3件 (sort_order = 0, 1, 2)
    let conn = setup();
    let sheet = CheatSheet {
        sheet_type: None,
        title: "CmdOnlySheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Single(Command {
                id: None,
                description: None,
                command: "c0".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                id: None,
                description: None,
                command: "c1".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                id: None,
                description: None,
                command: "c2".to_string(),
                layout: None,
            }),
        ],
    };
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    // Act
    let max = get_max_toplevel_sort_order(&conn, id).unwrap();

    // Assert: sort_order の最大は 2
    assert_eq!(max, 2);
}

#[test]
fn get_max_toplevel_sort_order_returns_max_from_groups_only() {
    // Arrange: グループのみ2件 (sort_order = 0, 1)
    let conn = setup();
    let sheet = CheatSheet {
        sheet_type: None,
        title: "GrpOnlySheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Group(CommandGroup {
                id: None,
                group: "G0".to_string(),
                commandlist: vec![],
            }),
            CommandItem::Group(CommandGroup {
                id: None,
                group: "G1".to_string(),
                commandlist: vec![],
            }),
        ],
    };
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    // Act
    let max = get_max_toplevel_sort_order(&conn, id).unwrap();

    // Assert: グループの sort_order の最大は 1
    assert_eq!(max, 1);
}

#[test]
fn get_max_toplevel_sort_order_returns_max_from_mixed_items() {
    // Arrange: コマンド(sort_order=0) + グループ(sort_order=1) の混在
    let conn = setup();
    let sheet = CheatSheet {
        sheet_type: None,
        title: "MixedSheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Single(Command {
                id: None,
                description: None,
                command: "top".to_string(),
                layout: None,
            }),
            CommandItem::Group(CommandGroup {
                id: None,
                group: "GrpA".to_string(),
                commandlist: vec![],
            }),
        ],
    };
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    // Act
    let max = get_max_toplevel_sort_order(&conn, id).unwrap();

    // Assert: コマンドとグループの最大 sort_order は 1
    assert_eq!(max, 1);
}

// ── get_max_command_in_group_sort_order ───────────────────────

#[test]
fn get_max_command_in_group_sort_order_returns_minus_one_when_empty() {
    // Arrange: 空グループを作成
    let conn = setup();
    let sheet = make_sheet("SortSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    // sort_order = 0 でグループを追加
    let group_id = add_group_row(&conn, sheet_id, "EmptyGroup", 0).unwrap();

    // Act
    let max = get_max_command_in_group_sort_order(&conn, group_id).unwrap();

    // Assert: グループ内コマンドなし → -1
    assert_eq!(max, -1);
}

#[test]
fn get_max_command_in_group_sort_order_returns_max_sort_order() {
    // Arrange: グループ内に3件のコマンドを追加 (sort_order = 0, 1, 2)
    let conn = setup();
    let sheet = make_sheet("SortSheet2");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let group_id = add_group_row(&conn, sheet_id, "Group", 0).unwrap();
    add_command_row(&conn, sheet_id, Some(group_id), None, "cmd0", None, 0).unwrap();
    add_command_row(&conn, sheet_id, Some(group_id), None, "cmd1", None, 1).unwrap();
    add_command_row(&conn, sheet_id, Some(group_id), None, "cmd2", None, 2).unwrap();

    // Act
    let max = get_max_command_in_group_sort_order(&conn, group_id).unwrap();

    // Assert: 最大 sort_order は 2
    assert_eq!(max, 2);
}

// ── add_command_row ───────────────────────────────────────────

#[test]
fn add_command_row_adds_toplevel_command_and_returns_id() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("AddCmdSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act: トップレベルコマンドを追加（description あり、layout なし）
    let cmd_id =
        add_command_row(&conn, sheet_id, None, Some("desc"), "my_command", None, 0).unwrap();

    // Assert: IDが正の値で返ること、かつ DB から取得できること
    assert!(cmd_id > 0);
    let retrieved = get_cheatsheet_by_title(&conn, "AddCmdSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 1);
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.command, "my_command");
            assert_eq!(cmd.description, Some("desc".to_string()));
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

#[test]
fn add_command_row_adds_command_in_group() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("AddCmdInGrpSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let group_id = add_group_row(&conn, sheet_id, "MyGroup", 0).unwrap();

    // Act: グループ内コマンドを追加
    let cmd_id = add_command_row(
        &conn,
        sheet_id,
        Some(group_id),
        Some("group desc"),
        "group_cmd",
        Some("inline"),
        0,
    )
    .unwrap();

    // Assert: ID が正の値
    assert!(cmd_id > 0);
    // グループ内コマンドが取得できること
    let max = get_max_command_in_group_sort_order(&conn, group_id).unwrap();
    assert_eq!(max, 0);
}

#[test]
fn add_command_row_with_none_description_and_layout() {
    // Arrange: description と layout が None のコマンドを追加
    let conn = setup();
    let sheet = make_sheet("NullFieldSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act
    let cmd_id = add_command_row(&conn, sheet_id, None, None, "bare_cmd", None, 5).unwrap();

    // Assert: 挿入が成功し ID が正の値
    assert!(cmd_id > 0);
    let retrieved = get_cheatsheet_by_title(&conn, "NullFieldSheet")
        .unwrap()
        .unwrap();
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.command, "bare_cmd");
            assert!(cmd.description.is_none());
            assert!(cmd.layout.is_none());
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

#[test]
fn add_command_row_sort_order_stored_correctly() {
    // Arrange: sort_order = 10 でコマンドを追加し、トップレベル最大を確認
    let conn = setup();
    let sheet = make_sheet("SortOrderSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act
    add_command_row(&conn, sheet_id, None, None, "cmd_a", None, 10).unwrap();

    // Assert
    let max = get_max_toplevel_sort_order(&conn, sheet_id).unwrap();
    assert_eq!(max, 10);
}

// ── update_command_row ────────────────────────────────────────

#[test]
fn update_command_row_changes_description_and_command_text() {
    // Arrange: コマンドを追加してから更新
    let conn = setup();
    let sheet = make_sheet("UpdateCmdSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let cmd_id =
        add_command_row(&conn, sheet_id, None, Some("old desc"), "old_cmd", None, 0).unwrap();

    // Act
    update_command_row(&conn, cmd_id, None, Some("new desc"), "new_cmd", None).unwrap();

    // Assert: DB から取得した値が更新されていること
    let retrieved = get_cheatsheet_by_title(&conn, "UpdateCmdSheet")
        .unwrap()
        .unwrap();
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.command, "new_cmd");
            assert_eq!(cmd.description, Some("new desc".to_string()));
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

#[test]
fn update_command_row_can_set_layout() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("LayoutUpdateSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let cmd_id = add_command_row(&conn, sheet_id, None, None, "cmd", None, 0).unwrap();

    // Act: layout を設定
    update_command_row(&conn, cmd_id, None, None, "cmd", Some("stacked")).unwrap();

    // Assert: layout が更新されていること
    let retrieved = get_cheatsheet_by_title(&conn, "LayoutUpdateSheet")
        .unwrap()
        .unwrap();
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.layout, Some("stacked".to_string()));
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

#[test]
fn update_command_row_on_nonexistent_id_does_not_error() {
    // Arrange: 存在しない ID (99999) への更新はエラーにならない（SQLite は更新行数 0 を返す）
    let conn = setup();

    // Act & Assert: Ok(()) が返ること
    let result = update_command_row(&conn, 99999, None, None, "x", None);
    assert!(result.is_ok());
}

// ── delete_command_row ────────────────────────────────────────

#[test]
fn delete_command_row_removes_existing_command() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("DelCmdSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let cmd_id = add_command_row(&conn, sheet_id, None, None, "to_delete", None, 0).unwrap();

    // Act
    delete_command_row(&conn, cmd_id).unwrap();

    // Assert: commandlist が空になること
    let retrieved = get_cheatsheet_by_title(&conn, "DelCmdSheet")
        .unwrap()
        .unwrap();
    assert!(retrieved.commandlist.is_empty());
}

#[test]
fn delete_command_row_on_nonexistent_id_does_not_error() {
    // Arrange: 存在しない ID への削除
    let conn = setup();

    // Act & Assert: Ok(()) が返ること
    let result = delete_command_row(&conn, 99999);
    assert!(result.is_ok());
}

#[test]
fn delete_command_row_only_removes_target() {
    // Arrange: コマンドを2件追加し、片方だけ削除する
    let conn = setup();
    let sheet = make_sheet("DelOneOfTwoSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let cmd_id1 = add_command_row(&conn, sheet_id, None, None, "keep_me", None, 0).unwrap();
    let cmd_id2 = add_command_row(&conn, sheet_id, None, None, "delete_me", None, 1).unwrap();

    // Act: cmd_id2 だけ削除
    delete_command_row(&conn, cmd_id2).unwrap();

    // Assert: cmd_id1 は残っていること
    let retrieved = get_cheatsheet_by_title(&conn, "DelOneOfTwoSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 1);
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.id, Some(cmd_id1));
            assert_eq!(cmd.command, "keep_me");
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

// ── add_group_row ─────────────────────────────────────────────

#[test]
fn add_group_row_inserts_group_and_returns_id() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("AddGrpSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act
    let group_id = add_group_row(&conn, sheet_id, "NewGroup", 0).unwrap();

    // Assert: ID が正の値で、DB から取得した commandlist にグループが含まれること
    assert!(group_id > 0);
    let retrieved = get_cheatsheet_by_title(&conn, "AddGrpSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 1);
    match &retrieved.commandlist[0] {
        CommandItem::Group(g) => {
            assert_eq!(g.group, "NewGroup");
            assert_eq!(g.id, Some(group_id));
        }
        _ => panic!("CommandItem::Group であること"),
    }
}

#[test]
fn add_group_row_sort_order_reflected_in_max() {
    // Arrange: sort_order = 7 でグループを追加
    let conn = setup();
    let sheet = make_sheet("GrpSortSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();

    // Act
    add_group_row(&conn, sheet_id, "G7", 7).unwrap();

    // Assert: get_max_toplevel_sort_order が 7 を返すこと
    let max = get_max_toplevel_sort_order(&conn, sheet_id).unwrap();
    assert_eq!(max, 7);
}

// ── update_group_row ──────────────────────────────────────────

#[test]
fn update_group_row_changes_group_name() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("UpdGrpSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let group_id = add_group_row(&conn, sheet_id, "OldName", 0).unwrap();

    // Act
    update_group_row(&conn, group_id, "NewName").unwrap();

    // Assert: DB から取得したグループ名が更新されていること
    let retrieved = get_cheatsheet_by_title(&conn, "UpdGrpSheet")
        .unwrap()
        .unwrap();
    match &retrieved.commandlist[0] {
        CommandItem::Group(g) => {
            assert_eq!(g.group, "NewName");
        }
        _ => panic!("CommandItem::Group であること"),
    }
}

#[test]
fn update_group_row_on_nonexistent_id_does_not_error() {
    // Arrange: 存在しない ID への更新はエラーにならない
    let conn = setup();

    // Act & Assert
    let result = update_group_row(&conn, 99999, "AnyName");
    assert!(result.is_ok());
}

// ── delete_group_row ──────────────────────────────────────────

#[test]
fn delete_group_row_removes_group() {
    // Arrange
    let conn = setup();
    let sheet = make_sheet("DelGrpSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let group_id = add_group_row(&conn, sheet_id, "ToDelete", 0).unwrap();

    // Act
    delete_group_row(&conn, group_id).unwrap();

    // Assert: commandlist が空になること
    let retrieved = get_cheatsheet_by_title(&conn, "DelGrpSheet")
        .unwrap()
        .unwrap();
    assert!(retrieved.commandlist.is_empty());
}

#[test]
fn delete_group_row_cascades_to_commands() {
    // Arrange: グループと、そのグループ内コマンドを追加
    let conn = setup();
    let sheet = make_sheet("CascadeSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let group_id = add_group_row(&conn, sheet_id, "GroupWithCmds", 0).unwrap();
    add_command_row(&conn, sheet_id, Some(group_id), None, "child_cmd1", None, 0).unwrap();
    add_command_row(&conn, sheet_id, Some(group_id), None, "child_cmd2", None, 1).unwrap();

    // Act: グループを削除
    delete_group_row(&conn, group_id).unwrap();

    // Assert: グループ内コマンドも CASCADE で削除され、commandlist が空になること
    let retrieved = get_cheatsheet_by_title(&conn, "CascadeSheet")
        .unwrap()
        .unwrap();
    assert!(
        retrieved.commandlist.is_empty(),
        "CASCADE 削除によりグループ内コマンドも削除されること"
    );
}

#[test]
fn delete_group_row_does_not_remove_sibling_toplevel_commands() {
    // Arrange: トップレベルコマンド + グループを共存させ、グループのみ削除
    let conn = setup();
    let sheet = make_sheet("SiblingSheet");
    let sheet_id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    let top_cmd_id = add_command_row(&conn, sheet_id, None, None, "top_cmd", None, 0).unwrap();
    let group_id = add_group_row(&conn, sheet_id, "GrpToRemove", 1).unwrap();
    add_command_row(&conn, sheet_id, Some(group_id), None, "grp_cmd", None, 0).unwrap();

    // Act: グループのみ削除
    delete_group_row(&conn, group_id).unwrap();

    // Assert: トップレベルコマンドは残ること
    let retrieved = get_cheatsheet_by_title(&conn, "SiblingSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 1);
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.id, Some(top_cmd_id));
            assert_eq!(cmd.command, "top_cmd");
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

#[test]
fn delete_group_row_on_nonexistent_id_does_not_error() {
    // Arrange: 存在しない ID への削除
    let conn = setup();

    // Act & Assert
    let result = delete_group_row(&conn, 99999);
    assert!(result.is_ok());
}

// ── replace_commandlist_by_title ──────────────────────────────

#[test]
fn replace_commandlist_by_title_replaces_all_commands() {
    // Arrange: 既存コマンドリストをもつチートシートを作成
    let conn = setup();
    let sheet = CheatSheet {
        sheet_type: None,
        title: "ReplaceSheet".to_string(),
        window_size: None,
        layout: None,
        commandlist: vec![
            CommandItem::Single(Command {
                id: None,
                description: Some("old1".to_string()),
                command: "old_cmd1".to_string(),
                layout: None,
            }),
            CommandItem::Single(Command {
                id: None,
                description: Some("old2".to_string()),
                command: "old_cmd2".to_string(),
                layout: None,
            }),
        ],
    };
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    // Act: 新しいコマンドリストで置換
    let new_commandlist = vec![CommandItem::Single(Command {
        id: None,
        description: Some("new1".to_string()),
        command: "new_cmd1".to_string(),
        layout: None,
    })];
    replace_commandlist_by_title(&conn, "ReplaceSheet", &new_commandlist).unwrap();

    // Assert: 新しいコマンドのみが存在すること
    let retrieved = get_cheatsheet_by_title(&conn, "ReplaceSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 1);
    match &retrieved.commandlist[0] {
        CommandItem::Single(cmd) => {
            assert_eq!(cmd.command, "new_cmd1");
            assert_eq!(cmd.description, Some("new1".to_string()));
        }
        _ => panic!("CommandItem::Single であること"),
    }
}

#[test]
fn replace_commandlist_by_title_with_empty_list_clears_all() {
    // Arrange: コマンドをもつチートシートを作成
    let conn = setup();
    let sheet = make_sheet("ClearSheet");
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    // Act: 空リストで置換
    replace_commandlist_by_title(&conn, "ClearSheet", &[]).unwrap();

    // Assert: commandlist が空になること
    let retrieved = get_cheatsheet_by_title(&conn, "ClearSheet")
        .unwrap()
        .unwrap();
    assert!(
        retrieved.commandlist.is_empty(),
        "空リストで置換後は commandlist が空であること"
    );
}

#[test]
fn replace_commandlist_by_title_returns_err_for_nonexistent_title() {
    // Arrange: DB は空
    let conn = setup();

    // Act: 存在しないタイトルへの置換はエラーを返すこと
    let result = replace_commandlist_by_title(&conn, "NoSuchSheet", &[]);

    // Assert: SAVEPOINT 内の SELECT が失敗してロールバックされる
    assert!(
        result.is_err(),
        "存在しないタイトルへの replace はエラーになること"
    );
}

#[test]
fn replace_commandlist_by_title_handles_group_and_commands() {
    // Arrange: 既存にシングルコマンドをもつチートシート
    let conn = setup();
    let sheet = make_sheet("ReplaceWithGroupSheet");
    let id = insert_cheatsheet(&conn, &sheet, 0).unwrap();
    insert_commandlist(&conn, id, &sheet.commandlist).unwrap();

    // Act: グループ+コマンドのリストで置換
    let new_commandlist = vec![
        CommandItem::Single(Command {
            id: None,
            description: None,
            command: "top".to_string(),
            layout: None,
        }),
        CommandItem::Group(CommandGroup {
            id: None,
            group: "NewGroup".to_string(),
            commandlist: vec![Command {
                id: None,
                description: Some("g_desc".to_string()),
                command: "g_cmd".to_string(),
                layout: None,
            }],
        }),
    ];
    replace_commandlist_by_title(&conn, "ReplaceWithGroupSheet", &new_commandlist).unwrap();

    // Assert: グループが含まれること
    let retrieved = get_cheatsheet_by_title(&conn, "ReplaceWithGroupSheet")
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.commandlist.len(), 2);
    match &retrieved.commandlist[1] {
        CommandItem::Group(g) => {
            assert_eq!(g.group, "NewGroup");
            assert_eq!(g.commandlist.len(), 1);
            assert_eq!(g.commandlist[0].command, "g_cmd");
        }
        _ => panic!("2番目の要素は Group であること"),
    }
}

#[test]
fn replace_commandlist_by_title_old_commands_are_not_searchable_after_replace() {
    // Arrange: FTS に登録されたコマンドが、置換後に検索されないことを確認
    let conn = setup();
    insert_sheet_with_commands(&conn, "FtsReplaceSheet", &[("Old desc", "old_unique_xyz")]);

    // 置換前は検索できること
    let before = search_by_fts(&conn, "old_unique_xyz", 100).unwrap();
    assert_eq!(before.len(), 1);

    // Act: 新しいコマンドリストで置換
    let new_list = vec![CommandItem::Single(Command {
        id: None,
        description: None,
        command: "new_after_replace".to_string(),
        layout: None,
    })];
    replace_commandlist_by_title(&conn, "FtsReplaceSheet", &new_list).unwrap();

    // Assert: 古いコマンドは FTS から削除されていること
    let after_old = search_by_fts(&conn, "old_unique_xyz", 100).unwrap();
    assert!(
        after_old.is_empty(),
        "置換後は古いコマンドが FTS で検索されないこと"
    );

    // 新しいコマンドは検索できること
    let after_new = search_by_fts(&conn, "new_after_replace", 100).unwrap();
    assert_eq!(after_new.len(), 1);
}
