use app_lib::api::cheatsheet::{CheatSheet, Command, CommandGroup, CommandItem, WindowSize};
use app_lib::db::repository::{
    delete_cheatsheet, get_all_titles, get_cheatsheet_by_title, get_window_size, insert_cheatsheet,
    insert_commandlist, save_window_size, title_exists, update_cheatsheet,
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
